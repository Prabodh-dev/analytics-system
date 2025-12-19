import { Worker } from "bullmq";
import mongoose from "mongoose";
import { createClient } from "redis";
import { Event } from "../models/event.model.js";
import "dotenv/config";

// 1️⃣ Connect MongoDB (worker is separate process)
await mongoose.connect(process.env.MONGO_URI);

// 2️⃣ Create & connect Redis client (FOR WORKER ONLY)
const redisClient = createClient({
  url: "redis://127.0.0.1:6379",
});

redisClient.on("error", (err) => {
  console.error("Worker Redis error:", err);
});

await redisClient.connect();
console.log("Worker Redis connected");

// 3️⃣ Create Worker
const worker = new Worker(
  "analytics-summary",
  async (job) => {
    const { days, top } = job.data;

    console.log("Processing analytics job:", job.id);

    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const result = await Event.aggregate([
      { $match: { eventTime: { $gte: start } } },
      {
        $facet: {
          totalEvents: [{ $count: "count" }],
          topPages: [
            { $match: { eventName: "page_view", url: { $ne: null } } },
            { $group: { _id: "$url", views: { $sum: 1 } } },
            { $sort: { views: -1 } },
            { $limit: top },
            { $project: { _id: 0, url: "$_id", views: 1 } },
          ],
        },
      },
    ]);

    const summary = {
      days,
      totalEvents: result[0]?.totalEvents?.[0]?.count || 0,
      topPages: result[0]?.topPages || [],
    };

    const cacheKey = `dashboard:summary:${days}:${top}`;

    // 4️⃣ Save result in Redis
    await redisClient.set(cacheKey, JSON.stringify(summary));

    return summary;
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed`, err);
});
