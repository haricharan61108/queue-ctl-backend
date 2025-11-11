import prisma from "../db.ts";
import { JobState } from "../../generated/prisma/index.js";

export default async function status(exitOnComplete = true) {
    const counts = await prisma.job.groupBy({
      by: ["state"],
      _count: { state: true },
    });
    const stateCount: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dead: 0,
    };

    counts.forEach((row) => {
      stateCount[row.state] = row._count.state;
    });

    console.log("\n📊 Queue Status:\n");
    console.log(`pending     : ${stateCount.pending}`);
    console.log(`processing  : ${stateCount.processing}`);
    console.log(`completed   : ${stateCount.completed}`);
    console.log(`failed      : ${stateCount.failed}`);
    console.log(`dead (DLQ)  : ${stateCount.dead}`);

    console.log("\nℹ️  Active workers cannot be counted automatically");
    console.log("   Start workers using: queuectl worker --count <n>\n");

    if (exitOnComplete) process.exit(0);
  }