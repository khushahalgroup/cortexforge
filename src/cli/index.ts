import { CliCommands } from './commands.ts';

export async function runCli(args: string[]): Promise<void> {
  const command = args[0] || 'status';

  switch (command) {
    case 'status':
      await CliCommands.status();
      break;
    case 'doctor':
      await CliCommands.doctor();
      break;
    case 'start':
      await CliCommands.start();
      break;
    case 'stop':
      await CliCommands.stop();
      break;
    case 'benchmark':
      await CliCommands.benchmark();
      break;
    case 'graph':
      await CliCommands.graph(args[1], args[2]);
      break;
    case 'god-nodes':
      await CliCommands.godNodes();
      break;
    case 'cycles':
      await CliCommands.cycles();
      break;
    case 'blast-radius':
      if (!args[1]) {
        console.error('Usage: cortexforge blast-radius <SYMBOL_OR_FILE_ID>');
        process.exit(1);
      }
      await CliCommands.blastRadius(args[1]);
      break;
    case 'architecture':
      await CliCommands.architecture();
      break;
    case 'review':
      await CliCommands.review();
      break;
    case 'recover':
      if (!args[1]) {
        console.error('Usage: cortexforge recover <HANDLE>');
        process.exit(1);
      }
      await CliCommands.recover(args[1]);
      break;
    case 'path':
      if (!args[1] || !args[2]) {
        console.error('Usage: cortexforge path <SOURCE_SYMBOL> <TARGET_SYMBOL>');
        process.exit(1);
      }
      await CliCommands.path(args[1], args[2]);
      break;
    case 'communities':
      await CliCommands.communities();
      break;
    case 'drift':
      await CliCommands.drift();
      break;
    case 'timeline':
      await CliCommands.timeline();
      break;
    case 'briefing':
      await CliCommands.briefing();
      break;
    case 'audit':
      await CliCommands.audit(args[1]);
      break;
    case 'fold':
      if (!args[1]) {
        console.error('Usage: cortexforge fold <FILE_PATH> [SYMBOL]');
        process.exit(1);
      }
      await CliCommands.fold(args[1], args[2]);
      break;
    case 'crush':
      if (!args[1]) {
        console.error('Usage: cortexforge crush <JSON_FILE_PATH>');
        process.exit(1);
      }
      await CliCommands.crush(args[1]);
      break;
    case 'scorecard':
      await CliCommands.scorecard();
      break;
    case 'install':
      await CliCommands.install();
      break;
    case 'uninstall':
      await CliCommands.uninstall();
      break;
    default:
      console.log(`Unknown command '${command}'. Available commands:`);
      console.log('  status, doctor, start, stop, benchmark, graph, communities, path, god-nodes, cycles, drift, blast-radius, architecture, timeline, briefing, audit, fold, crush, scorecard, review, recover, install, uninstall');
      break;
  }
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
  });
}
