import * as readline from 'readline';
import enqueue from './enqueue.ts';
import status from './status.ts';
import { listDLQ, retryDLQ } from './dlq.ts';

export default async function interactive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'queuectl> '
  });

  console.log('🚀 Queue Control Interactive Mode');
  console.log('Type "help" for available commands, "exit" to quit\n');

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    const parts = input.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'help':
          console.log('\n📋 Available Commands:');
          console.log('  enqueue <job-json>  - Add a new job to the queue');
          console.log('  status              - Show job and worker status');
          console.log('  dlq list            - List jobs in Dead Letter Queue');
          console.log('  dlq retry <jobId>   - Retry a specific dead job');
          console.log('  clear               - Clear the screen');
          console.log('  exit                - Exit interactive mode\n');
          break;

        case 'enqueue':
          if (args.length === 0) {
            console.log('❌ Usage: enqueue <job-json>');
            console.log('   Example: enqueue {"id":"job1","command":"echo test"}');
          } else {
            const jobJson = args.join(' ');
            await enqueue(jobJson, false);
          }
          break;

        case 'status':
          await status(false);
          break;

        case 'dlq':
          if (args[0] === 'list') {
            await listDLQ();
          } else if (args[0] === 'retry' && args[1]) {
            await retryDLQ(args[1]);
          } else {
            console.log('❌ Usage:');
            console.log('   dlq list');
            console.log('   dlq retry <jobId>');
          }
          break;

        case 'clear':
          console.clear();
          console.log('🚀 Queue Control Interactive Mode\n');
          break;

        case 'exit':
        case 'quit':
          console.log('👋 Goodbye!');
          rl.close();
          process.exit(0);
          break;

        default:
          console.log(`❌ Unknown command: "${command}"`);
          console.log('   Type "help" for available commands');
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
}
