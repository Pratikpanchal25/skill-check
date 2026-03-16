"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillProfile = void 0;
const mongoose_1 = require("mongoose");
const SkillScoreSchema = new mongoose_1.Schema({
    skill: { type: String, required: true },
    score: { type: Number, required: true },
    codeScore: { type: Number, default: 0 },
    voiceScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    evidenceCount: { type: Number, default: 0 },
}, { _id: false });
const RepoHighlightSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    summary: { type: String, default: "" },
    technologies: { type: [String], default: [] },
    commits: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
}, { _id: false });
const CombinedSummarySchema = new mongoose_1.Schema({
    githubScore: { type: Number, default: 0 },
    voiceScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
}, { _id: false });
const SkillProfileSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
    },
    languages: { type: [String], default: [] },
    frameworks: { type: [String], default: [] },
    libraries: { type: [String], default: [] },
    repoCount: { type: Number, default: 0 },
    commitCount: { type: Number, default: 0 },
    primaryStack: { type: [String], default: [] },
    skillsDetected: { type: [SkillScoreSchema], default: [] },
    confidenceScore: { type: Number, default: 0 },
    combinedSummary: { type: CombinedSummarySchema, default: () => ({}) },
    repoHighlights: { type: [RepoHighlightSchema], default: [] },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
exports.SkillProfile = (0, mongoose_1.model)("SkillProfile", SkillProfileSchema);
