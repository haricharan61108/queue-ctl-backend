import prisma from "../db.ts";
import { JobState } from "../../generated/prisma/index.js";

export async function claimJob() {
    return prisma.$transaction(async(tx)=> {
        const job = await tx.job.findFirst({
            where: {
                state: JobState.pending
            },
            orderBy: {
                createdAt: "asc"
            }
        });

        if(!job) {
            return null;
        }

        const claimed = await tx.job.update({
            where: {
                id: job.id,
            },
            data: {
                state: JobState.processing,
                updatedAt: new Date(),
            }
        });

        return claimed;
    })
}