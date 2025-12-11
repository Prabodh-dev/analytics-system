// src/controllers/event.controller.js
import { Event } from "../models/event.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const trackEvent = asyncHandler(async (req, res) => {
  const {
    userId,
    anonymousId,
    sessionId,
    eventName,
    url,
    pageTitle,
    properties,
    eventTime,
  } = req.body;

  if (!eventName) {
    throw new ApiError(400, "eventName is required");
  }

  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    null;

  const userAgent = req.headers["user-agent"] || null;

  const event = await Event.create({
    userId: userId || null,
    anonymousId: anonymousId || null,
    sessionId: sessionId || null,
    eventName,
    url: url || null,
    pageTitle: pageTitle || null,
    properties: properties || {},
    eventTime: eventTime ? new Date(eventTime) : new Date(),
    ip: clientIp,
    userAgent,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { eventId: event._id }, "Event tracked"));
});
