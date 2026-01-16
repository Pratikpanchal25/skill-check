
import { Response, NextFunction } from "express";
import { User } from "../models/user.model";
import { AuthRequest } from "../types/index";
import { errorResponseWithStatusCode } from "../utils/index";

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponseWithStatusCode(res, "Access denied. No token provided.", 401);
        }

        const token = authHeader.split(' ')[1];
        const user = await User.findOne({ token }).select('-password');

        if (!user) {
            return errorResponseWithStatusCode(res, "Invalid or expired token.", 401);
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return errorResponseWithStatusCode(res, "Authentication failed.", 401);
    }
};
