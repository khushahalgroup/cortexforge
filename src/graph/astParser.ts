import type { IGraphNode, IGraphEdge, SymbolType } from '../storage/schemas.ts';

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
    const ext = relPath.slice(relPath.lastIndexOf('.')).toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
        continue;
      }

      // --- 1. TypeScript & JavaScript (including TSX/JSX) ---
      if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
        // Imports
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

        // Classes & Interfaces
        const classMatch = line.match(/(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^\{]+))?/);
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
            signature: trimmed,
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

        // Interfaces & Types
        const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^\{]+))?/);
        if (interfaceMatch) {
          const ifaceName = interfaceMatch[1];
          const ifaceId = `sym_${fileId}#interface#${ifaceName}`;
          nodes.push({
            id: ifaceId,
            fileId,
            name: ifaceName,
            type: 'interface',
            line: lineNum,
            signature: trimmed,
          });
          edges.push({ sourceId: fileId, targetId: ifaceId, relationship: 'defines', evidenceLine: lineNum });
        }

        // Functions & Arrow Functions
        const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/);
        const arrowFuncMatch = line.match(/(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/);
        const targetFuncName = funcMatch ? funcMatch[1] : arrowFuncMatch ? arrowFuncMatch[1] : null;

        if (targetFuncName) {
          const funcId = `sym_${fileId}#function#${targetFuncName}`;
          nodes.push({
            id: funcId,
            fileId,
            name: targetFuncName,
            type: 'function',
            line: lineNum,
            signature: trimmed,
          });
          edges.push({ sourceId: fileId, targetId: funcId, relationship: 'defines', evidenceLine: lineNum });
        }

        // Web Routes (Express / Fastify / Next.js)
        const routeMatch = line.match(/(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/i);
        if (routeMatch) {
          const method = routeMatch[1].toUpperCase();
          const routePath = routeMatch[2];
          const routeId = `sym_${fileId}#route#${method}:${routePath}`;
          nodes.push({
            id: routeId,
            fileId,
            name: `${method} ${routePath}`,
            type: 'route',
            line: lineNum,
          });
          edges.push({ sourceId: fileId, targetId: routeId, relationship: 'routes_to', evidenceLine: lineNum });
        }
      }

      // --- 2. Python ---
      else if (ext === '.py') {
        // Imports
        const pyImportMatch = line.match(/^(?:from\s+([^\s]+)\s+import|import\s+([^\s,]+))/);
        if (pyImportMatch) {
          const mod = pyImportMatch[1] || pyImportMatch[2];
          edges.push({ sourceId: fileId, targetId: `file_${mod}`, relationship: 'imports', evidenceLine: lineNum });
        }

        // Classes
        const pyClassMatch = line.match(/^class\s+(\w+)(?:\(([^)]+)\))?:/);
        if (pyClassMatch) {
          const className = pyClassMatch[1];
          const classId = `sym_${fileId}#class#${className}`;
          nodes.push({ id: classId, fileId, name: className, type: 'class', line: lineNum });
          edges.push({ sourceId: fileId, targetId: classId, relationship: 'defines', evidenceLine: lineNum });
        }

        // Defs (functions/methods)
        const pyDefMatch = line.match(/^(\s*)def\s+(\w+)\s*\(/);
        if (pyDefMatch) {
          const defName = pyDefMatch[2];
          const isMethod = pyDefMatch[1].length > 0;
          const symId = `sym_${fileId}#${isMethod ? 'method' : 'function'}#${defName}`;
          nodes.push({ id: symId, fileId, name: defName, type: isMethod ? 'method' : 'function', line: lineNum });
          edges.push({ sourceId: fileId, targetId: symId, relationship: 'defines', evidenceLine: lineNum });
        }
      }

      // --- 3. Go ---
      else if (ext === '.go') {
        const goFuncMatch = line.match(/^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/);
        if (goFuncMatch) {
          const fnName = goFuncMatch[1];
          const symId = `sym_${fileId}#function#${fnName}`;
          nodes.push({ id: symId, fileId, name: fnName, type: 'function', line: lineNum });
          edges.push({ sourceId: fileId, targetId: symId, relationship: 'defines', evidenceLine: lineNum });
        }

        const goStructMatch = line.match(/^type\s+(\w+)\s+struct/);
        if (goStructMatch) {
          const structName = goStructMatch[1];
          const symId = `sym_${fileId}#class#${structName}`;
          nodes.push({ id: symId, fileId, name: structName, type: 'class', line: lineNum });
          edges.push({ sourceId: fileId, targetId: symId, relationship: 'defines', evidenceLine: lineNum });
        }
      }

      // --- 4. Rust ---
      else if (ext === '.rs') {
        const rustFnMatch = line.match(/(?:pub\s+)?fn\s+(\w+)\s*\(/);
        if (rustFnMatch) {
          const fnName = rustFnMatch[1];
          const symId = `sym_${fileId}#function#${fnName}`;
          nodes.push({ id: symId, fileId, name: fnName, type: 'function', line: lineNum });
          edges.push({ sourceId: fileId, targetId: symId, relationship: 'defines', evidenceLine: lineNum });
        }

        const rustStructMatch = line.match(/(?:pub\s+)?struct\s+(\w+)/);
        if (rustStructMatch) {
          const structName = rustStructMatch[1];
          const symId = `sym_${fileId}#class#${structName}`;
          nodes.push({ id: symId, fileId, name: structName, type: 'class', line: lineNum });
          edges.push({ sourceId: fileId, targetId: symId, relationship: 'defines', evidenceLine: lineNum });
        }
      }

      // --- 5. Prisma / SQL Schemas ---
      else if (ext === '.prisma' || ext === '.sql') {
        const modelMatch = line.match(/(?:model|CREATE\s+TABLE)\s+(\w+)/i);
        if (modelMatch) {
          const modelName = modelMatch[1];
          const modelId = `sym_${fileId}#database_model#${modelName}`;
          nodes.push({ id: modelId, fileId, name: modelName, type: 'database_model', line: lineNum });
          edges.push({ sourceId: fileId, targetId: modelId, relationship: 'defines', evidenceLine: lineNum });
        }
      }
    }

    return { nodes, edges };
  }
}
