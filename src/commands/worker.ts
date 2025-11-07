import prisma from "../db.ts";
import {once} from "events";

function sleep(ms: number) {
    return new Promise((res)=> setTimeout(res,ms));
}

async function processOneJob(workerId: number):Promise<boolean> {
    //TODO for subtask 2
    return false;
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