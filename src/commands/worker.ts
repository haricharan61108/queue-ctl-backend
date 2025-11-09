import prisma from "../db.ts";
import {once} from "events";
import { exec } from "child_process";
import { promisify } from "util";
import { JobState } from "../../generated/prisma/index.js";
import { claimJob } from "../lib/claimJob.ts";

const execAsync = promisify(exec);
function sleep(ms: number) {
    return new Promise((res)=> setTimeout(res,ms));
}

async function processOneJob(workerId: number):Promise<boolean> {
    const job = await claimJob();
    if(!job) {
        return false;
    }
    console.log(`[W${workerId}] Found job: ${job.id} → ${job.command}`);

    try {
        const { stdout, stderr } = await execAsync(job.command);

        await prisma.job.update({
            where: {
                id:job.id,
            },
            data: {
                state: JobState.completed,
                errorMessage:null,
                updatedAt: new Date(),
            },
        });

        console.log(`[W${workerId}] ✅ Job ${job.id} completed.`);
    } catch (err:any) {
       const attemptsAfter = job.attempts+1;
       const cfg = await prisma.config.findUnique({
        where: {
            id: 1
        }
       });

       const maxRetries = job.maxRetries ?? cfg?.maxRetries ?? 3;
       const backoffBase = cfg?.backoffBase ?? 2;
       
       if(attemptsAfter>=maxRetries) {
        await prisma.job.update({
            where: { id: job.id },
            data: {
              state: JobState.dead,
              attempts: attemptsAfter,
              errorMessage: String(err.message || err),
              updatedAt: new Date(),
            },
          });
          console.log(`[W${workerId}] 💀 Job ${job.id} moved to DLQ after ${attemptsAfter} attempts`);
       }
       else {
        const delaySeconds = Math.pow(backoffBase, attemptsAfter);
        const nextRun = new Date(Date.now() + delaySeconds * 1000);
        await prisma.job.update({
            where: { id: job.id },
            data: {
              state: JobState.pending,
              attempts: attemptsAfter,
              nextRunAt: nextRun,
              errorMessage: String(err.message || err),
              updatedAt: new Date(),
            },
          });    
          console.log(
            `[W${workerId}] 🔁 Job ${job.id} failed (attempt ${attemptsAfter}) → retry in ${delaySeconds}s`
          );
       }
    }

    return true;
}

export default async function worker(options: {count?: string | number}={}) {
    const count = Number((options as any).count ?? 1) || 1;
    console.log(`Starting ${count} Workers...`);

    let stopping = false;
    let activeJobs = 0;

    async function workerLoop(id: number) {
        console.log(`[W${id}] loop started`);

        while(!stopping) {
            try {
                const didWork=await processOneJob(id);
                if(!didWork) {
                    await sleep(500);
                }
            } catch (err) {
                console.error(`[W${id}] unexpected error in loop:`, err);
                await sleep(1000);
            }
        }

        while(activeJobs>0) {
            console.log(`[W${id}] waiting for ${activeJobs} active job(s) before exit...`);
            await sleep(500); 
        }

         console.log(`[W${id}] loop exiting`);
    }

    const loops:Promise<void>[]=[];

    for(let i=0;i<count;i++) {
        loops.push(workerLoop(i+1));
    }

    function beginShutDown() {
        if(stopping) {
            return ;
        }
        stopping=true;
        console.log("Graceful shutdown requested — will finish in-flight jobs then exit.");
    }
    process.on("SIGINT",beginShutDown);
    process.on("SIGTERM", beginShutDown);  

    await Promise.all(loops);
    console.log("All worker loops stopped. Exiting process.");
    process.exit(0);
}