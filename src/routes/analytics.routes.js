import { Router } from "express";
import {
  eventsPerDay,
  topPages,
  uniqueVisitors,
  dashboardSummary,
  retention,
  activeUsers,
} from "../controllers/analytics.controller.js";

const router = Router();

router.get("/events-per-day", eventsPerDay);
router.get("/top-pages", topPages);
router.get("/unique-visitors", uniqueVisitors);
router.get("/summary", dashboardSummary);
router.get("/retention", retention);
router.get("/active-users", activeUsers);

export default router;
