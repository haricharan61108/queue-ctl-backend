import * as dotenv from 'dotenv';
dotenv.config();
import { Command } from "commander";
import enqueue from "./commands/enqueue.ts";
// import worker from "./commands/worker";
// import status from "./commands/status";

const program = new Command();

program
  .name("queuectl")
  .description("A CLI-based background job queue system")
  .version("1.0.0");

program 
  .command("enqueue")
  .argument("<job>", "Job JSON string")
  .description("Add a new job to the queue")
  .action(enqueue)

// program
//   .command("worker")
//   .option("--count <number>", "Number of workers", "1")
//   .description("Start one or more workers")
//   .action(worker);

// program
//   .command("status")
//   .description("Show job and worker status")
//   .action(status);

program.parse();


