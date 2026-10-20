import { Queue } from "bullmq";
import { env } from "@/env";
import IORedis from "ioredis";

// Lazy Redis connection for BullMQ
let redisConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return redisConnection;
}

export const ANALYSIS_QUEUE_NAME = "revforge-analysis";
export const BUILD_QUEUE_NAME = "revforge-build";
export const EMAIL_QUEUE_NAME = "revforge-email";

export interface AnalysisJobPayload {
  projectId: string;
}

export interface BuildJobPayload {
  jobId: string;
  projectId: string;
}

export interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
}

export const analysisQueue: Queue<AnalysisJobPayload> = new Queue(ANALYSIS_QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const buildQueue: Queue<BuildJobPayload> = new Queue(BUILD_QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const emailQueue: Queue<EmailJobPayload> = new Queue(EMAIL_QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 50,
  },
});
