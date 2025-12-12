// src/routes/analytics.routes.js
import { Router } from "express";
import {
  eventsPerDay,
  topPages,
  uniqueVisitors,
} from "../controllers/analytics.controller.js";

const router = Router();

router.get("/events-per-day", eventsPerDay);
router.get("/top-pages", topPages);
router.get("/unique-visitors", uniqueVisitors);

export default router;
