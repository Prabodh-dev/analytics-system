// src/app.js
import express from "express";
import cors from "cors";
import { ApiError } from "./utils/ApiError.js";
import eventRouter from "./routes/event.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Analytics system running" });
});

app.use("/api/events", eventRouter);
app.use("/api/analytics", analyticsRouter);

// 404 handler
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});

export default app;
