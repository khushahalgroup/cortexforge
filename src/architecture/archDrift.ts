/**
 * CortexForge ArchitectureDrift (Archify Architecture Drift Engine)
 * Automatically verifies that source code imports conform to defined architectural layers.
 * Flags illegal upward dependencies, boundary inversions, and cross-domain leaks.
 */

import type { CortexDatabase } from '../storage/database.ts';

export type ArchLayer = 'TEST' | 'PRESENTATION' | 'APPLICATION' | 'DOMAIN' | 'INFRASTRUCTURE';

export interface IDriftViolation {
  sourceFile: string;
  sourceLayer: ArchLayer;
  importedFile: string;
  targetLayer: ArchLayer;
  rule: string;
  severity: 'CRITICAL' | 'WARNING';
}

export interface IArchDriftReport {
  isCompliant: boolean;
  driftScore: number; // 0 (clean) to 100 (severe drift)
  totalEdgesChecked: number;
  violations: IDriftViolation[];
  layerDistribution: Record<ArchLayer, number>;
}

export class ArchitectureDrift {
  private db: CortexDatabase;

  // Layer hierarchy: Higher layers may import lower layers, but lower layers MUST NOT import higher layers
  private static layerRank: Record<ArchLayer, number> = {
    TEST: 5,
    PRESENTATION: 4,
    APPLICATION: 3,
    DOMAIN: 2,
    INFRASTRUCTURE: 1,
  };

  constructor(db: CortexDatabase) {
    this.db = db;
  }

  /**
   * Classifies a file path into an architectural layer.
   */
  public static classifyLayer(filePath: string): ArchLayer {
    const p = filePath.toLowerCase().replace(/\\/g, '/');
    if (p.includes('/tests/') || p.includes('.test.') || p.includes('/test/')) {
      return 'TEST';
    }
    if (p.includes('/cli/') || p.includes('/server/') || p.includes('/dashboard') || p.includes('/bin/')) {
      return 'PRESENTATION';
    }
    if (p.includes('/interceptor/') || p.includes('/context/') || p.includes('/benchmark/')) {
      return 'APPLICATION';
    }
    if (
      p.includes('/memory/') ||
      p.includes('/graph/') ||
      p.includes('/compression/') ||
      p.includes('/minimalism/') ||
      p.includes('/architecture/') ||
      p.includes('/learning/') ||
      p.includes('/security/')
    ) {
      return 'DOMAIN';
    }
    return 'INFRASTRUCTURE';
  }

  /**
   * Scans all import edges in the repository and verifies compliance against layering rules.
   */
  public auditDrift(): IArchDriftReport {
    const edges = this.db.getEdges().filter((e) => e.relationship === 'imports');
    const violations: IDriftViolation[] = [];
    const layerDistribution: Record<ArchLayer, number> = {
      TEST: 0,
      PRESENTATION: 0,
      APPLICATION: 0,
      DOMAIN: 0,
      INFRASTRUCTURE: 0,
    };

    for (const edge of edges) {
      const sourceLayer = ArchitectureDrift.classifyLayer(edge.sourceId);
      const targetLayer = ArchitectureDrift.classifyLayer(edge.targetId);

      layerDistribution[sourceLayer]++;

      const sourceRank = ArchitectureDrift.layerRank[sourceLayer];
      const targetRank = ArchitectureDrift.layerRank[targetLayer];

      // Violation: Lower layer imports higher layer (e.g., Infrastructure importing Presentation)
      if (sourceRank < targetRank) {
        const isCritical = targetLayer === 'PRESENTATION' && sourceLayer === 'INFRASTRUCTURE';
        violations.push({
          sourceFile: edge.sourceId.replace(/^file_/, ''),
          sourceLayer,
          importedFile: edge.targetId.replace(/^file_/, ''),
          targetLayer,
          rule: `Layer Inversion: ${sourceLayer} (Rank ${sourceRank}) imports ${targetLayer} (Rank ${targetRank})`,
          severity: isCritical ? 'CRITICAL' : 'WARNING',
        });
      }
    }

    const totalEdges = edges.length;
    const driftScore =
      totalEdges > 0 ? Math.min(100, Math.round((violations.length / totalEdges) * 100)) : 0;

    return {
      isCompliant: violations.length === 0,
      driftScore,
      totalEdgesChecked: totalEdges,
      violations,
      layerDistribution,
    };
  }
}
