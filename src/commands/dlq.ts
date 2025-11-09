import prisma from "../db.ts";
import { JobState } from "../../generated/prisma/index.js";

export async function listDLQ() {
    const deadJobs = await prisma.job.findMany({
        where: {
            state: JobState.dead,
        },
        orderBy: {
            updatedAt: "desc"
        }
    });

    if (deadJobs.length === 0) {
        console.log("✅ DLQ is empty. No permanently failed jobs.");
        return;
      }

      console.log(`💀 Dead Letter Queue (${deadJobs.length} job(s)):\n`);
      deadJobs.forEach(job => {
        console.log(`- ${job.id} | command="${job.command}" | attempts=${job.attempts}`);
      });
}

export async function retryDLQ(jobId: string) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!job || job.state !== JobState.dead) {
    console.log(`❌ Job '${jobId}' is not in DLQ or does not exist.`);
    return;
  }


  await prisma.job.update({
    where: {
        id:jobId
    },
    data: {
        state: JobState.pending,
        attempts: 0,
        nextRunAt: null,
        errorMessage: null,
        updatedAt: new Date(),
    },
  });

  console.log(`🔄 Job '${jobId}' moved back to queue and will be retried.`);
}