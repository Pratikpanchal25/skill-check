import { Schema, model } from "mongoose";

const SkillCheckSessionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
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
    },
    { timestamps: true }
);

export const SkillCheckSession = model(
    "SkillCheckSession",
    SkillCheckSessionSchema
);