import { Schema, model } from "mongoose";

const VoiceMetricsSchema = new Schema(
    {
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: "SkillCheckSession",
            required: true,
        },
        wpm: Number,
        fillerWords: Number,
        longPauses: Number,
    },
    { timestamps: true }
);

export const VoiceMetrics = model("VoiceMetrics", VoiceMetricsSchema);
