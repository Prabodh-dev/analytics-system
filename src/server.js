// src/server.js
import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { redisClient } from "./config/redis.js";

const PORT = process.env.PORT || 9000;

async function start() {
  await connectDB();
  await redisClient.connect();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
