import { Schema, model } from "mongoose";

const UserAnswerSchema = new Schema(
    {
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: "SkillCheckSession",
            required: true,
        },
        rawText: { type: String, required: true },
        transcript: { type: String },
        duration: { type: Number },
    },
    { timestamps: true }
);

export const UserAnswer = model("UserAnswer", UserAnswerSchema);
