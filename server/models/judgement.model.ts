import { Schema, model } from "mongoose";

const JudgementSchema = new Schema(
    {
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: "SkillCheckSession",
            required: true,
        },
        answerId: {
            type: Schema.Types.ObjectId,
            ref: "UserAnswer",
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
        feedback: String,
        improvementSuggestions: [String],
    },
    { timestamps: true }
);

export const Judgement = model("Judgement", JudgementSchema);
