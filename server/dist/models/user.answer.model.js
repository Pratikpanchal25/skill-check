"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAnswer = void 0;
const mongoose_1 = require("mongoose");
const UserAnswerSchema = new mongoose_1.Schema({
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "SkillCheckSession",
        required: true,
    },
    rawText: { type: String, required: true },
    transcript: { type: String },
    duration: { type: Number },
}, { timestamps: true });
exports.UserAnswer = (0, mongoose_1.model)("UserAnswer", UserAnswerSchema);
