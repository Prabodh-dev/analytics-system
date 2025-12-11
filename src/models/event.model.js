// src/models/event.model.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    // Optional: user ID from your auth system (string for now)
    userId: {
      type: String,
      default: null,
      index: true, // fast filter by user
    },

    // For anonymous visitors (if no login)
    anonymousId: {
      type: String,
      default: null,
      index: true,
    },

    sessionId: {
      type: String,
      default: null,
      index: true,
    },

    eventName: {
      type: String,
      required: true, // like "page_view", "button_click"
      index: true,
    },

    // where this happened
    url: {
      type: String,
      default: null,
    },
    pageTitle: {
      type: String,
      default: null,
    },

    // device info
    userAgent: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },

    // any extra data (flexible)
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // timestamp when event happened (frontend can send this)
    eventTime: {
      type: Date,
      default: Date.now,
      index: true, // we will query by time a lot
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Compound index for analytics: quick queries like
// "how many page_view events per day"
eventSchema.index({ eventName: 1, eventTime: -1 });

// Index for user activity timeline
eventSchema.index({ userId: 1, eventTime: -1 });

export const Event = mongoose.model("Event", eventSchema);
