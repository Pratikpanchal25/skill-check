import { Schema, model } from "mongoose";

const UserSchema = new Schema(
    {
        email: { type: String, required: true, unique: true },
        name: { type: String },
        role: { type: String, enum: ["student", "engineer"], default: "student" },
    },
    { timestamps: true }
);

export const User = model("User", UserSchema);
