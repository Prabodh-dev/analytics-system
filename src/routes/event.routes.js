// src/routes/event.routes.js
import { Router } from "express";
import { trackEvent } from "../controllers/event.controller.js";

const router = Router();

router.post("/", trackEvent);

export default router;
