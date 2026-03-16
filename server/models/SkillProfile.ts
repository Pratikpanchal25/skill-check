import { Schema, model } from "mongoose";

const SkillScoreSchema = new Schema(
  {
    skill: { type: String, required: true },
    score: { type: Number, required: true },
    codeScore: { type: Number, default: 0 },
    voiceScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    evidenceCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const RepoHighlightSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    summary: { type: String, default: "" },
    technologies: { type: [String], default: [] },
    commits: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
  },
  { _id: false },
);

const CombinedSummarySchema = new Schema(
  {
    githubScore: { type: Number, default: 0 },
    voiceScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
  },
  { _id: false },
);

const SkillProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
  },
  { timestamps: true },
);

export const SkillProfile = model("SkillProfile", SkillProfileSchema);
