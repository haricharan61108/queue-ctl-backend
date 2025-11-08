import { claimJob } from "../lib/claimJob.js";

(async () => {
  const job = await claimJob();
  if (job) {
    console.log("✅ Claimed job:", job.id);
  } else {
    console.log("⚠️ No pending jobs available");
  }
  process.exit(0);
})();
