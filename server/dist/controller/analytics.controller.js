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
exports.getProgress = getProgress;
exports.getSkillGaps = getSkillGaps;
exports.getReadinessScore = getReadinessScore;
const index_1 = require("../types/index");
const index_2 = require("../utils/index");
const AnalyticsService = __importStar(require("../services/analytics.service"));
async function getProgress(req, res) {
    try {
        const { userId } = req.query;
        if (!userId) {
            (0, index_2.errorResponseWithStatusCode)(res, 'User ID required', index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const progress = await AnalyticsService.getUserProgress(userId);
        const data = {
            success: true,
            progress
        };
        (0, index_2.successResponse)(res, data, 'Progress retrieved successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to retrieve progress');
        return;
    }
}
async function getSkillGaps(req, res) {
    try {
        const { userId } = req.query;
        if (!userId) {
            (0, index_2.errorResponseWithStatusCode)(res, 'User ID required', index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const skillGaps = await AnalyticsService.getUserSkillGaps(userId);
        const data = {
            success: true,
            skillGaps
        };
        (0, index_2.successResponse)(res, data, 'Skill gaps retrieved successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to retrieve skill gaps');
        return;
    }
}
async function getReadinessScore(req, res) {
    try {
        const { userId } = req.query;
        if (!userId) {
            (0, index_2.errorResponseWithStatusCode)(res, 'User ID required', index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const readinessScore = await AnalyticsService.getUserReadinessScore(userId);
        const data = {
            success: true,
            readinessScore
        };
        (0, index_2.successResponse)(res, data, 'Readiness score retrieved successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to retrieve readiness score');
        return;
    }
}
