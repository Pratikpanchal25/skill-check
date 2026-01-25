"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.login = login;
exports.getMe = getMe;
exports.updateMe = updateMe;
exports.getOverview = getOverview;
exports.getActivity = getActivity;
exports.deleteMe = deleteMe;
const index_1 = require("../types/index");
const index_2 = require("../utils/index");
const user_validation_1 = require("../validations/user.validation");
const user_model_1 = require("../models/user.model");
const UserService = __importStar(require("../services/user.service"));
async function createUser(req, res) {
    try {
        const { error, value } = user_validation_1.createUserSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details[0].message;
            (0, index_2.errorResponseWithStatusCode)(res, errorMessage, index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const { email, name, password, role } = value;
        // Check if user already exists
        const existingUser = await user_model_1.User.findOne({ email });
        if (existingUser) {
            (0, index_2.errorResponse)(res, 'User with this email already exists');
            return;
        }
        // Hash password
        const hashedPassword = await (0, index_2.bcryptPassword)(password);
        // Create user
        const userData = {
            email,
            name,
            password: hashedPassword,
            role: role || 'student'
        };
        const user = await UserService.createUser(userData);
        const data = {
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        };
        (0, index_2.successResponse)(res, data, 'User created successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to create user');
        return;
    }
}
async function login(req, res) {
    try {
        const { error, value } = user_validation_1.userLoginSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details[0].message;
            (0, index_2.errorResponseWithStatusCode)(res, errorMessage, index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const { email, password } = value;
        const user = await user_model_1.User.findOne({ email }).lean();
        if (!user) {
            (0, index_2.errorResponse)(res, 'Invalid email or password');
            return;
        }
        if (!user.password) {
            (0, index_2.errorResponse)(res, 'Password not set for this user');
            return;
        }
        const isPasswordValid = await (0, index_2.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            (0, index_2.errorResponse)(res, 'Invalid email or password');
            return;
        }
        const accessTokenData = await (0, index_2.createAndGetToken)(user._id.toString());
        const userDetails = {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            token: accessTokenData.token
        };
        const data = {
            success: true,
            user: userDetails,
            token: `Bearer ${userDetails.token}`
        };
        (0, index_2.successResponse)(res, data, 'Login successful');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Login failed');
        return;
    }
}
async function getMe(req, res) {
    try {
        const currentUser = req.user;
        if (!currentUser) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Unauthorized', 401);
            return;
        }
        const userDetails = await user_model_1.User.findById(currentUser._id).select('-password -token').lean();
        if (!userDetails) {
            (0, index_2.errorResponse)(res, 'User not found');
            return;
        }
        const data = {
            success: true,
            user: userDetails
        };
        (0, index_2.successResponse)(res, data, 'User retrieved successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to retrieve user');
        return;
    }
}
async function updateMe(req, res) {
    try {
        const { error, value } = user_validation_1.updateUserSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details[0].message;
            (0, index_2.errorResponseWithStatusCode)(res, errorMessage, index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const userId = req.user?._id;
        if (!userId) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Unauthorized', 401);
            return;
        }
        const updatedUser = await user_model_1.User.findByIdAndUpdate(userId, { $set: value }, { new: true }).select('-password -token').lean();
        if (!updatedUser) {
            (0, index_2.errorResponse)(res, 'User not found');
            return;
        }
        const data = {
            success: true,
            user: updatedUser
        };
        (0, index_2.successResponse)(res, data, 'User updated successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to update user');
        return;
    }
}
async function getOverview(req, res) {
    try {
        const userId = req.user?._id;
        if (!userId) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Unauthorized', 401);
            return;
        }
        const overview = await UserService.getUserOverview(userId);
        const data = {
            success: true,
            overview
        };
        (0, index_2.successResponse)(res, data, 'User overview retrieved successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to retrieve user overview');
        return;
    }
}
async function getActivity(req, res) {
    try {
        const userId = req.user?._id;
        if (!userId) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Unauthorized', 401);
            return;
        }
        const activities = await UserService.getUserActivity(userId);
        const data = {
            success: true,
            activities
        };
        (0, index_2.successResponse)(res, data, 'User activity retrieved successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to retrieve user activity');
        return;
    }
}
async function deleteMe(req, res) {
    try {
        const userId = req.user?._id;
        if (!userId) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Unauthorized', 401);
            return;
        }
        const deletedUser = await user_model_1.User.findByIdAndDelete(userId);
        if (!deletedUser) {
            (0, index_2.errorResponse)(res, 'User not found');
            return;
        }
        const data = {
            success: true,
            message: 'User deleted successfully'
        };
        (0, index_2.successResponse)(res, data, 'User deleted successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to delete user');
        return;
    }
}
