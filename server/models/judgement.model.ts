import { Schema, model } from "mongoose";

const JudgementSchema = new Schema(
    {
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: "SkillCheckSession",
            required: true,
        },
        clarity: Number,
        correctness: Number,
        depth: Number,
        missingConcepts: [String],
        reaction: {
            type: String,
            enum: ["impressed", "neutral", "confused", "skeptical"],
        },
        modelVersion: { type: String },
    },
    { timestamps: true }
);

export const Judgement = model("Judgement", JudgementSchema);
