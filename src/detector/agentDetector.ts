import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import type { IProjectProfile } from '../storage/schemas.ts';

export type HostAgent =
  | 'Claude Code'
  | 'Cursor'
  | 'Gemini CLI'
  | 'Antigravity'
  | 'Codex CLI'
  | 'GitHub Copilot'
  | 'Kiro'
  | 'OpenCode'
  | 'Hermes'
  | 'Generic Agent';

export type IntegrationMode = 'HOOKS_MCP_SKILL' | 'MCP_ONLY' | 'SKILL_ONLY' | 'CLI_BRIDGE';

export interface IAgentDetectionResult {
  hostAgent: HostAgent;
  agentVersion?: string;
  integrationMode: IntegrationMode;
  capabilities: {
    hooks: boolean;
    mcp: boolean;
    skills: boolean;
    statusline: boolean;
    subprocesses: boolean;
  };
  supportStatus: 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED';
  projectProfile: IProjectProfile;
  suggestedOptimizations: string[];
}

export class AgentDetector {
  public static detect(cwd: string = process.cwd()): IAgentDetectionResult {
    const env = process.env;

    // 1. Detect Host Agent
    let hostAgent: HostAgent = 'Generic Agent';
    let version: string | undefined;

    if (env.CLAUDE_CODE || env.CLAUDE_PROJECT_DIR) {
      hostAgent = 'Claude Code';
      version = env.CLAUDE_CODE_VERSION;
    } else if (env.CURSOR_PROJECT_DIR || env.CURSOR_VERSION) {
      hostAgent = 'Cursor';
      version = env.CURSOR_VERSION;
    } else if (env.ANTIGRAVITY_CLI || env.GEMINI_CLI || env.ANTIGRAVITY_APP) {
      hostAgent = 'Antigravity';
    } else if (env.COPILOT_AGENT || env.GITHUB_COPILOT) {
      hostAgent = 'GitHub Copilot';
    } else if (env.CODEX_CLI || env.CODEX_WORKSPACE) {
      hostAgent = 'Codex CLI';
    } else if (env.KIRO_ACTIVE || env.KIRO_AGENT) {
      hostAgent = 'Kiro';
    } else if (env.OPENCODE_SESSION) {
      hostAgent = 'OpenCode';
    } else if (env.HERMES_CLI) {
      hostAgent = 'Hermes';
    }

    // 2. Negotiate Capabilities
    const hasMcp = true; // MCP server provided natively by CortexForge
    const hasSkills = fs.existsSync(path.join(os.homedir(), '.agents', 'skills')) ||
      fs.existsSync(path.join(os.homedir(), '.claude', 'skills'));
    const hasHooks = hostAgent === 'Claude Code' || hostAgent === 'Cursor' || hostAgent === 'Antigravity';

    let integrationMode: IntegrationMode = 'CLI_BRIDGE';
    if (hasHooks && hasMcp && hasSkills) {
      integrationMode = 'HOOKS_MCP_SKILL';
    } else if (hasMcp) {
      integrationMode = 'MCP_ONLY';
    } else if (hasSkills) {
      integrationMode = 'SKILL_ONLY';
    }

    const supportStatus: 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED' =
      hostAgent !== 'Generic Agent' ? 'SUPPORTED' : 'PARTIAL';

    // 3. Inspect Project Metadata
    const projectProfile = this.inspectProject(cwd);

    const suggestedOptimizations: string[] = [];
    if (!hasHooks) suggestedOptimizations.push('Enable hooks for automated pre/post tool telemetry.');
    if (!hasMcp) suggestedOptimizations.push('Enable MCP server for direct tool interoperability.');

    return {
      hostAgent,
      agentVersion: version,
      integrationMode,
      capabilities: {
        hooks: hasHooks,
        mcp: hasMcp,
        skills: hasSkills,
        statusline: hasHooks,
        subprocesses: true,
      },
      supportStatus,
      projectProfile,
      suggestedOptimizations,
    };
  }

  private static inspectProject(rootPath: string): IProjectProfile {
    const projectName = path.basename(rootPath);
    const hash = crypto.createHash('md5').update(rootPath).digest('hex').slice(0, 8);
    const projectId = `proj_${hash}`;

    let language = 'unknown';
    let framework: string | undefined;
    let packageManager = 'unknown';

    // Check Package Managers & Languages
    if (fs.existsSync(path.join(rootPath, 'pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
      language = 'TypeScript / JavaScript';
    } else if (fs.existsSync(path.join(rootPath, 'bun.lockb')) || fs.existsSync(path.join(rootPath, 'bun.lock'))) {
      packageManager = 'bun';
      language = 'TypeScript / JavaScript';
    } else if (fs.existsSync(path.join(rootPath, 'yarn.lock'))) {
      packageManager = 'yarn';
      language = 'TypeScript / JavaScript';
    } else if (fs.existsSync(path.join(rootPath, 'package.json'))) {
      packageManager = 'npm';
      language = 'TypeScript / JavaScript';
    } else if (fs.existsSync(path.join(rootPath, 'pyproject.toml')) || fs.existsSync(path.join(rootPath, 'requirements.txt'))) {
      packageManager = fs.existsSync(path.join(rootPath, 'poetry.lock')) ? 'poetry' : 'pip';
      language = 'Python';
    } else if (fs.existsSync(path.join(rootPath, 'Cargo.toml'))) {
      packageManager = 'cargo';
      language = 'Rust';
    } else if (fs.existsSync(path.join(rootPath, 'go.mod'))) {
      packageManager = 'go';
      language = 'Go';
    }

    // Inspect Framework if package.json exists
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.next) framework = 'Next.ts';
        else if (deps.react) framework = 'React';
        else if (deps.vue) framework = 'Vue';
        else if (deps.svelte) framework = 'Svelte';
        else if (deps['@babylonjs/core']) framework = 'Babylon.ts';
        else if (deps.express) framework = 'Express';
        else if (deps.fastify) framework = 'Fastify';
      } catch {}
    }

    // Inspect Git branch
    let gitBranch: string | undefined;
    const gitHeadPath = path.join(rootPath, '.git', 'HEAD');
    if (fs.existsSync(gitHeadPath)) {
      try {
        const headContent = fs.readFileSync(gitHeadPath, 'utf-8').trim();
        if (headContent.startsWith('ref: refs/heads/')) {
          gitBranch = headContent.replace('ref: refs/heads/', '');
        }
      } catch {}
    }

    return {
      projectId,
      rootPath,
      projectName,
      language,
      framework,
      packageManager,
      gitBranch,
      lastIndexedAt: Date.now(),
    };
  }
}
