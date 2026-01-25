"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Judgement = void 0;
const mongoose_1 = require("mongoose");
const JudgementSchema = new mongoose_1.Schema({
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "SkillCheckSession",
        required: true,
    },
    answerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "UserAnswer",
        required: true,
    },
    clarity: Number,
    correctness: Number,
    depth: Number,
    delivery: Number,
    missingConcepts: [String],
    reaction: {
        type: String,
        enum: ["impressed", "neutral", "confused", "skeptical"],
    },
    modelVersion: { type: String },
    feedback: String,
    improvementSuggestions: [String],
    deliveryFeedback: String,
}, { timestamps: true });
exports.Judgement = (0, mongoose_1.model)("Judgement", JudgementSchema);
