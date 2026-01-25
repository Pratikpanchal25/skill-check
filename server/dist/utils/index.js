"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.errorResponseWithStatusCode = errorResponseWithStatusCode;
exports.catchResponse = catchResponse;
exports.bcryptPassword = bcryptPassword;
exports.comparePassword = comparePassword;
exports.createAndGetToken = createAndGetToken;
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = require("../models/user.model");
const uuid_1 = require("uuid");
function successResponse(res, data, message) {
    const response = {
        success: 1,
        data: data,
        message: message,
        status_code: 200,
    };
    return res.status(200).json(response);
}
function errorResponse(res, message) {
    const response = {
        success: 0,
        message: message,
    };
    return res.status(200).json(response);
}
function errorResponseWithStatusCode(res, message, status) {
    const response = {
        success: 0,
        message: message,
    };
    return res.status(status).json(response);
}
function catchResponse(res, error, message) {
    let errorMessage;
    if (error instanceof Error) {
        errorMessage = error.message || "An unexpected error occurred";
    }
    else if (typeof error === "string") {
        errorMessage = error;
    }
    else {
        errorMessage = "An unknown error occurred";
    }
    const response = {
        success: 0,
        error: errorMessage,
        message,
        status_code: 500,
    };
    return res.status(500).json(response);
}
async function bcryptPassword(password) {
    const bcryptPassword = await bcrypt_1.default.hash(password, 10);
    return bcryptPassword;
}
async function comparePassword(password, hashedPassword) {
    const isPasswordValid = await bcrypt_1.default.compare(password, hashedPassword);
    return isPasswordValid;
}
async function createAndGetToken(userId) {
    const token = (0, uuid_1.v4)();
    const updatedUser = await user_model_1.User.findByIdAndUpdate(userId, { token: token }, { new: true });
    if (!updatedUser) {
        throw new Error("User not found");
    }
    return {
        _id: updatedUser._id,
        user_id: userId,
        token: token,
    };
}
