import { Schema, model } from "mongoose";

const RepoSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    htmlUrl: { type: String, required: true },
    description: { type: String, default: "" },
    languages: { type: [String], default: [] },
    frameworks: { type: [String], default: [] },
    libraries: { type: [String], default: [] },
    verifiedSkills: { type: [String], default: [] },
    commits: { type: Number, default: 0 },
    stargazers: { type: Number, default: 0 },
    updatedAt: { type: Date },
  },
  { _id: false },
);

const GithubProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, index: true },
    accessToken: { type: String, required: true },
    tokenIv: { type: String, required: true },
    tokenTag: { type: String, required: true },
    avatar: { type: String, default: "" },
    profileUrl: { type: String, default: "" },
    followers: { type: Number, default: 0 },
    publicRepos: { type: Number, default: 0 },
    reposAnalyzed: { type: Number, default: 0 },
    repoSnapshots: { type: [RepoSnapshotSchema], default: [] },
    lastSync: { type: Date },
  },
  { timestamps: true },
);

export const GithubProfile = model("GithubProfile", GithubProfileSchema);
