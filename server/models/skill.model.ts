import { Schema, model } from "mongoose";

const SkillSchema = new Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
});

export const Skill = model("Skill", SkillSchema);
