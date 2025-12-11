// src/routes/event.routes.js
import { Router } from "express";
import { trackEvent } from "../controllers/event.controller.js";

const router = Router();

// In future: GET /stats, GET /events, etc. will be added
router.post("/", trackEvent);

export default router;
