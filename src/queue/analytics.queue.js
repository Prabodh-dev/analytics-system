// src/queue/analytics.queue.js
import { Queue } from "bullmq";

export const analyticsQueue = new Queue("analytics-summary", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
});
