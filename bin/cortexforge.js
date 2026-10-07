#!/usr/bin/env node

/**
 * CortexForge CLI Runner
 * Executes CortexForge using Node native TypeScript stripping
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliTsPath = path.resolve(__dirname, '../src/cli/index.ts');

const args = ['--experimental-strip-types', cliTsPath, ...process.argv.slice(2)];

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
