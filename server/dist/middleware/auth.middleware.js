"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const user_model_1 = require("../models/user.model");
const index_1 = require("../utils/index");
const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return (0, index_1.errorResponseWithStatusCode)(res, "Access denied. No token provided.", 401);
        }
        const token = authHeader.split(' ')[1];
        const user = await user_model_1.User.findOne({ token }).select('-password');
        if (!user) {
            return (0, index_1.errorResponseWithStatusCode)(res, "Invalid or expired token.", 401);
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        return (0, index_1.errorResponseWithStatusCode)(res, "Authentication failed.", 401);
    }
};
exports.auth = auth;
