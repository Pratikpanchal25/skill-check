"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillCheckSession = void 0;
const mongoose_1 = require("mongoose");
const SkillCheckSessionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    skillId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Skill", required: true },
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
}, { timestamps: true });
exports.SkillCheckSession = (0, mongoose_1.model)("SkillCheckSession", SkillCheckSessionSchema);
