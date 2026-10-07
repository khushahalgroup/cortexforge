import type { IArchitectureModel } from '../storage/schemas.ts';

export class ArchitectureVisualizer {
  public static generateMermaid(model: IArchitectureModel): string {
    const lines: string[] = ['graph TD'];

    // Subgraphs for boundaries
    for (let i = 0; i < model.boundaries.length; i++) {
      const b = model.boundaries[i];
      const clusterId = `cluster_${i}`;
      lines.push(`  subgraph ${clusterId} ["${b.name}"]`);

      if (b.symbols.length === 0) {
        lines.push(`    node_${i}["${b.description}"]`);
      } else {
        const topSymbols = b.symbols.slice(0, 5);
        for (let j = 0; j < topSymbols.length; j++) {
          const symName = topSymbols[j].split('#').pop() || `sym_${j}`;
          lines.push(`    node_${i}_${j}["${symName}"]`);
        }
      }
      lines.push('  end');
    }

    // Connect dataflows
    for (let i = 0; i < model.dataflows.length; i++) {
      const df = model.dataflows[i];
      const fromIdx = model.boundaries.findIndex((b) => b.name === df.from);
      const toIdx = model.boundaries.findIndex((b) => b.name === df.to);

      if (fromIdx !== -1 && toIdx !== -1) {
        lines.push(`  cluster_${fromIdx} -->|${df.protocol}| cluster_${toIdx}`);
      }
    }

    return lines.join('\n');
  }

  public static generateDataflowMarkdown(model: IArchitectureModel): string {
    const lines: string[] = ['# System Architecture & Verified Dataflows\n'];

    for (const b of model.boundaries) {
      lines.push(`### Tier: ${b.name} (${b.tier.toUpperCase()})`);
      lines.push(`- **Purpose**: ${b.description}`);
      lines.push(`- **Verified Symbols**: ${b.symbols.length}`);
      if (b.symbols.length > 0) {
        lines.push('  - ' + b.symbols.slice(0, 6).join('\n  - '));
      }
      lines.push('');
    }

    lines.push('### Inferred Interactions');
    for (const flow of model.dataflows) {
      lines.push(`- **${flow.from}** $\\rightarrow$ **${flow.to}** via \`${flow.protocol}\``);
    }

    return lines.join('\n');
  }

  public static generateSequenceDiagram(model: IArchitectureModel): string {
    const lines: string[] = ['sequenceDiagram', '  autonumber'];

    for (const b of model.boundaries) {
      lines.push(`  participant ${b.name.replace(/\s+/g, '_')} as ${b.name}`);
    }

    for (const df of model.dataflows) {
      const from = df.from.replace(/\s+/g, '_');
      const to = df.to.replace(/\s+/g, '_');
      lines.push(`  ${from}->>${to}: invoke [${df.protocol}]`);
      lines.push(`  ${to}-->>${from}: acknowledge / return data`);
    }

    return lines.join('\n');
  }

  public static generateBlastRadiusMermaid(targetSymbol: string, affectedSymbols: string[]): string {
    const lines: string[] = ['graph LR'];
    lines.push(`  target["🎯 TARGET: ${targetSymbol}"]:::targetNode`);

    for (let i = 0; i < affectedSymbols.length; i++) {
      const sym = affectedSymbols[i].replace(/^node_|^file_/, '');
      lines.push(`  node_${i}["⚠️ ${sym}"]`);
      lines.push(`  target --> node_${i}`);
    }

    lines.push('  classDef targetNode fill:#ef4444,stroke:#b91c1c,color:#fff,stroke-width:2px;');
    return lines.join('\n');
  }
}
