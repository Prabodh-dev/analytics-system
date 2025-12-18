// src/models/event.model.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: null,
      index: true,
    },

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
      required: true,
      index: true,
    },

    url: {
      type: String,
      default: null,
    },
    pageTitle: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },

    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    eventTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ eventName: 1, eventTime: -1 });

eventSchema.index({ userId: 1, eventTime: -1 });

export const Event = mongoose.model("Event", eventSchema);
