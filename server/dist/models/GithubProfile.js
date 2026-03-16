"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubProfile = void 0;
const mongoose_1 = require("mongoose");
const RepoSnapshotSchema = new mongoose_1.Schema({
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
}, { _id: false });
const GithubProfileSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
exports.GithubProfile = (0, mongoose_1.model)("GithubProfile", GithubProfileSchema);
