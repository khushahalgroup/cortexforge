import type { CortexDatabase } from '../storage/database.ts';
import type { IArchitectureModel, ISystemBoundary } from '../storage/schemas.ts';

export class ArchitectureModel {
  private db: CortexDatabase;

  constructor(db: CortexDatabase) {
    this.db = db;
  }

  public inferArchitecture(): IArchitectureModel {
    const nodes = this.db.getAllNodes();
    const project = this.db.getProject();
    const projectId = project ? project.projectId : 'proj_default';

    const boundaries: ISystemBoundary[] = [
      {
        name: 'Client / UI Layer',
        tier: 'frontend',
        symbols: [],
        description: 'User interface components, pages, hooks, and views.',
      },
      {
        name: 'API & Business Logic',
        tier: 'backend',
        symbols: [],
        description: 'Controllers, services, handlers, and routers.',
      },
      {
        name: 'Persistence & Database',
        tier: 'database',
        symbols: [],
        description: 'ORM models, schema definitions, queries, and repositories.',
      },
      {
        name: 'External Integrations',
        tier: 'external',
        symbols: [],
        description: 'Third-party APIs, SDK clients, and payment gateways.',
      },
    ];

    for (const node of nodes) {
      const lower = node.id.toLowerCase();
      if (lower.includes('ui') || lower.includes('view') || lower.includes('page') || lower.includes('component')) {
        boundaries[0].symbols.push(node.id);
      } else if (lower.includes('service') || lower.includes('controller') || lower.includes('router') || lower.includes('api')) {
        boundaries[1].symbols.push(node.id);
      } else if (lower.includes('model') || lower.includes('schema') || lower.includes('db') || lower.includes('entity')) {
        boundaries[2].symbols.push(node.id);
      } else if (lower.includes('client') || lower.includes('stripe') || lower.includes('aws') || lower.includes('fetch')) {
        boundaries[3].symbols.push(node.id);
      }
    }

    const dataflows = [
      { from: 'Client / UI Layer', to: 'API & Business Logic', protocol: 'HTTP / JSON-RPC' },
      { from: 'API & Business Logic', to: 'Persistence & Database', protocol: 'SQL / ORM' },
      { from: 'API & Business Logic', to: 'External Integrations', protocol: 'HTTPS REST / SDK' },
    ];

    const model: IArchitectureModel = {
      projectId,
      boundaries: boundaries.filter((b) => b.symbols.length > 0 || b.tier === 'backend'),
      dataflows,
      updatedAt: Date.now(),
    };

    this.db.setArchitecture(model);
    return model;
  }
}
