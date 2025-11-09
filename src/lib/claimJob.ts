import prisma from "../db.ts";
import { JobState } from "../../generated/prisma/index.js";

export async function claimJob() {
    return prisma.$transaction(async(tx)=> {
        const jobs = await tx.$queryRaw<Array<{
            id: string;
            command: string;
          state: string;
         attempts: number;
         maxRetries: number;
        createdAt: Date;
        updatedAt: Date;
        nextRunAt: Date | null;
        errorMessage: string | null;
        }>>`
        SELECT * FROM "Job"
       WHERE state = 'pending'
      AND ("nextRunAt" IS NULL OR "nextRunAt" <= NOW())
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
        `;

        if (!jobs || jobs.length === 0) {
            return null; 
          }

          const job = jobs[0];

          const claimed = await tx.job.update({
            where: { id: job.id },
            data: {
              state: JobState.processing,
              updatedAt: new Date(),
            },
          });

          return claimed;
    });
    
}