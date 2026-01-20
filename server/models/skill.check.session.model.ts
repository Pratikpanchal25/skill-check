import { Schema, model } from "mongoose";

const SkillCheckSessionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        skillName: { type: String, required: true },
        mode: {
            type: String,
            enum: ["explain", "drill", "blind"],
            required: true,
        },
        inputType: {
            type: String,
            enum: ["voice", "text"],
            required: true,
        },
        difficulty: {
            type: String,
            enum: ["beginner", "intermediate", "advanced"],
            required: true,
            default: "beginner"
        },
    },
    { timestamps: true }
);

export const SkillCheckSession = model(
    "SkillCheckSession",
    SkillCheckSessionSchema
);