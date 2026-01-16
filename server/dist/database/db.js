"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
function connectDB() {
    mongoose_1.default.connect(process.env.MONGO_URI, {
        dbName: process.env.MONGO_DB_NAME || 'skill_check'
    }).then(() => {
        console.log('MongoDB connected');
    }).catch((err) => {
        console.log(err);
    });
}
