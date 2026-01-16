"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceMetrics = void 0;
const mongoose_1 = require("mongoose");
const VoiceMetricsSchema = new mongoose_1.Schema({
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "SkillCheckSession",
        required: true,
    },
    wpm: Number,
    fillerWords: Number,
    longPauses: Number,
}, { timestamps: true });
exports.VoiceMetrics = (0, mongoose_1.model)("VoiceMetrics", VoiceMetricsSchema);
