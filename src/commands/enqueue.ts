
import prisma from "../db.ts";
import { JobState } from "../../generated/prisma/index.js";

export default async function enqueue(jobJson: string, exitOnComplete = true) {
    try {
        const jobData = JSON.parse(jobJson);
        if(!jobData.id || !jobData.command) {
            console.error("❌ Missing required fields: 'id' and 'command'");
            if (exitOnComplete) process.exit(1);
            return;
        }

        const job = await prisma.job.create({
            data: {
              id: jobData.id,
              command: jobData.command,
              state: JobState.pending,
              maxRetries: jobData.max_retries || 3,
            },
          });

        console.log(`✅ Job '${job.id}' enqueued successfully!`);
        console.log(job);

        if (exitOnComplete) process.exit(0);
    } catch (err:any) {
        if (err.code === "P2002") {
            console.error("⚠️ Job ID already exists. Please use a unique ID.");
          } else if (err instanceof SyntaxError) {
            console.error("❌ Invalid JSON format. Example: '{\"id\":\"job1\",\"command\":\"echo hi\"}'");
          } else {
            console.error("❌ Error while enqueueing job:", err.message);
          }
          if (exitOnComplete) process.exit(1);
    }
}