import type { IGraphNode, IGraphEdge } from '../storage/schemas.ts';

export interface IParsedFileResult {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
}

export class AstParser {
  public static parseFile(relPath: string, content: string): IParsedFileResult {
    const fileId = `file_${relPath}`;
    const nodes: IGraphNode[] = [];
    const edges: IGraphEdge[] = [];

    // Root file node
    nodes.push({
      id: fileId,
      fileId,
      name: relPath,
      type: 'file',
      line: 1,
    });

    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // 1. Detect Imports (TypeScript / JavaScript)
      // e.g. import { Foo } from './foo'
      const importMatch = line.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const targetModule = importMatch[4];
        edges.push({
          sourceId: fileId,
          targetId: `file_${targetModule}`,
          relationship: 'imports',
          evidenceLine: lineNum,
        });
      }

      // 2. Detect Classes & Interfaces
      const classMatch = line.match(/(?:export\s+)?(?:default\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^\{]+))?/);
      if (classMatch) {
        const className = classMatch[1];
        const extendsClass = classMatch[2];
        const classId = `sym_${fileId}#class#${className}`;

        nodes.push({
          id: classId,
          fileId,
          name: className,
          type: 'class',
          line: lineNum,
          signature: line.trim(),
        });

        edges.push({
          sourceId: fileId,
          targetId: classId,
          relationship: 'defines',
          evidenceLine: lineNum,
        });

        if (extendsClass) {
          edges.push({
            sourceId: classId,
            targetId: `sym_#class#${extendsClass}`,
            relationship: 'inherits',
            evidenceLine: lineNum,
          });
        }
      }

      // 3. Detect Functions / Methods
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const funcId = `sym_${fileId}#function#${funcName}`;

        nodes.push({
          id: funcId,
          fileId,
          name: funcName,
          type: 'function',
          line: lineNum,
          signature: line.trim(),
        });

        edges.push({
          sourceId: fileId,
          targetId: funcId,
          relationship: 'defines',
          evidenceLine: lineNum,
        });
      }

      // 4. Detect Python Class / Def
      const pyClassMatch = line.match(/^class\s+(\w+)(?:\(([^)]+)\))?:/);
      if (pyClassMatch) {
        const className = pyClassMatch[1];
        const classId = `sym_${fileId}#class#${className}`;

        nodes.push({
          id: classId,
          fileId,
          name: className,
          type: 'class',
          line: lineNum,
        });
      }

      const pyDefMatch = line.match(/^(\s*)def\s+(\w+)\s*\(/);
      if (pyDefMatch) {
        const defName = pyDefMatch[2];
        const isMethod = pyDefMatch[1].length > 0;
        const symId = `sym_${fileId}#${isMethod ? 'method' : 'function'}#${defName}`;

        nodes.push({
          id: symId,
          fileId,
          name: defName,
          type: isMethod ? 'method' : 'function',
          line: lineNum,
        });
      }
    }

    return { nodes, edges };
  }
}
