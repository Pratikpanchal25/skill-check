"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String },
    role: { type: String, enum: ["student", "engineer"], default: "student" },
    password: { type: String },
    token: { type: String },
}, { timestamps: true });
exports.User = (0, mongoose_1.model)("User", UserSchema);
