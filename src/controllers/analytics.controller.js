// src/controllers/analytics.controller.js
import { Event } from "../models/event.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * GET /api/analytics/events-per-day?days=7&eventName=page_view
 */
export const eventsPerDay = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 7);
  const eventName = req.query.eventName; // optional

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const match = { eventTime: { $gte: start } };
  if (eventName) match.eventName = eventName;

  const data = await Event.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$eventTime" } },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.day": 1 } },
    {
      $project: {
        _id: 0,
        day: "$_id.day",
        count: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { days, eventName: eventName || "ALL", data },
        "Events per day"
      )
    );
});

/**
 * GET /api/analytics/top-pages?days=7&limit=10
 */
export const topPages = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 7);
  const limit = Number(req.query.limit || 10);

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const data = await Event.aggregate([
    {
      $match: {
        eventTime: { $gte: start },
        eventName: "page_view",
        url: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$url",
        views: { $sum: 1 },
      },
    },
    { $sort: { views: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        url: "$_id",
        views: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { days, limit, data }, "Top pages"));
});

/**
 * GET /api/analytics/unique-visitors?days=7
 * Counts unique visitors using:
 * - userId if present
 * - else anonymousId
 */
export const uniqueVisitors = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 7);

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const data = await Event.aggregate([
    { $match: { eventTime: { $gte: start } } },
    {
      $project: {
        visitorId: {
          $ifNull: ["$userId", "$anonymousId"], // choose userId else anonymousId
        },
      },
    },
    { $match: { visitorId: { $ne: null } } },
    { $group: { _id: "$visitorId" } },
    { $count: "uniqueVisitors" },
  ]);

  const unique = data[0]?.uniqueVisitors || 0;

  return res
    .status(200)
    .json(
      new ApiResponse(200, { days, uniqueVisitors: unique }, "Unique visitors")
    );
});

/**
 * GET /api/analytics/summary?days=7&top=10
 */
export const dashboardSummary = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 7);
  const top = Number(req.query.top || 10);

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const result = await Event.aggregate([
    { $match: { eventTime: { $gte: start } } },
    {
      $facet: {
        // 1) Total events
        totalEvents: [{ $count: "count" }],

        // 2) Events per day (page_view)
        pageViewsPerDay: [
          { $match: { eventName: "page_view" } },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: { format: "%Y-%m-%d", date: "$eventTime" },
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.day": 1 } },
          { $project: { _id: 0, day: "$_id.day", count: 1 } },
        ],

        // 3) Top pages
        topPages: [
          { $match: { eventName: "page_view", url: { $ne: null } } },
          { $group: { _id: "$url", views: { $sum: 1 } } },
          { $sort: { views: -1 } },
          { $limit: top },
          { $project: { _id: 0, url: "$_id", views: 1 } },
        ],

        // 4) Unique visitors (userId else anonymousId)
        uniqueVisitors: [
          {
            $project: {
              visitorId: { $ifNull: ["$userId", "$anonymousId"] },
            },
          },
          { $match: { visitorId: { $ne: null } } },
          { $group: { _id: "$visitorId" } },
          { $count: "count" },
        ],
      },
    },
  ]);

  const summary = result[0] || {};

  const response = {
    range: { days, start },
    totalEvents: summary.totalEvents?.[0]?.count || 0,
    uniqueVisitors: summary.uniqueVisitors?.[0]?.count || 0,
    pageViewsPerDay: summary.pageViewsPerDay || [],
    topPages: summary.topPages || [],
  };

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Dashboard summary"));
});

/**
 * GET /api/analytics/retention?days=7
 * New = first eventTime is within range
 * Returning = first eventTime is before range AND has at least one event within range
 */
export const retention = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 7);

  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const result = await Event.aggregate([
    // Create a visitorId (userId else anonymousId)
    {
      $project: {
        visitorId: { $ifNull: ["$userId", "$anonymousId"] },
        eventTime: 1,
      },
    },
    { $match: { visitorId: { $ne: null } } },

    // Group by visitor to find their first ever visit time and whether they visited in range
    {
      $group: {
        _id: "$visitorId",
        firstSeen: { $min: "$eventTime" },
        hasVisitInRange: {
          $max: {
            $cond: [{ $gte: ["$eventTime", start] }, 1, 0],
          },
        },
      },
    },

    // Only consider visitors who visited in range (otherwise irrelevant)
    { $match: { hasVisitInRange: 1 } },

    // Classify into new vs returning
    {
      $project: {
        isNew: { $cond: [{ $gte: ["$firstSeen", start] }, 1, 0] },
      },
    },

    {
      $group: {
        _id: "$isNew",
        count: { $sum: 1 },
      },
    },
  ]);

  let newVisitors = 0;
  let returningVisitors = 0;

  for (const row of result) {
    if (row._id === 1) newVisitors = row.count;
    if (row._id === 0) returningVisitors = row.count;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        days,
        start,
        newVisitors,
        returningVisitors,
        totalUniqueVisitors: newVisitors + returningVisitors,
      },
      "Retention analytics"
    )
  );
});

export const activeUsers = asyncHandler(async (req, res) => {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 6);
  start7.setHours(0, 0, 0, 0);

  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 29);
  start30.setHours(0, 0, 0, 0);

  const [result] = await Event.aggregate([
    {
      $project: {
        visitorId: { $ifNull: ["$userId", "$anonymousId"] },
        eventTime: 1,
      },
    },
    { $match: { visitorId: { $ne: null } } },
    {
      $facet: {
        DAU: [
          { $match: { eventTime: { $gte: startOfToday } } },
          { $group: { _id: "$visitorId" } },
          { $count: "count" },
        ],
        WAU: [
          { $match: { eventTime: { $gte: start7 } } },
          { $group: { _id: "$visitorId" } },
          { $count: "count" },
        ],
        MAU: [
          { $match: { eventTime: { $gte: start30 } } },
          { $group: { _id: "$visitorId" } },
          { $count: "count" },
        ],
      },
    },
  ]);

  const dau = result?.DAU?.[0]?.count || 0;
  const wau = result?.WAU?.[0]?.count || 0;
  const mau = result?.MAU?.[0]?.count || 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        DAU: dau,
        WAU: wau,
        MAU: mau,
        windows: {
          todayStart: startOfToday,
          weekStart: start7,
          monthStart: start30,
        },
      },
      "Active users metrics"
    )
  );
});
