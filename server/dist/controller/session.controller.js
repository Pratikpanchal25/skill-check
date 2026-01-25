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
exports.createSession = createSession;
exports.submitAnswer = submitAnswer;
exports.getSessionById = getSessionById;
exports.getSessionSummary = getSessionSummary;
const index_1 = require("../types/index");
const index_2 = require("../utils/index");
const session_validation_1 = require("../validations/session.validation");
const SessionService = __importStar(require("../services/session.service"));
async function createSession(req, res) {
    try {
        const { error, value } = session_validation_1.createSessionSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details[0].message;
            (0, index_2.errorResponseWithStatusCode)(res, errorMessage, index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        if (!req.user?._id) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Unauthorized', 401);
            return;
        }
        // Override userId from body with authenticated userId for security
        value.userId = req.user._id.toString();
        const session = await SessionService.createSession(value);
        const data = {
            success: true,
            session
        };
        (0, index_2.successResponse)(res, data, 'Session created successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to create session');
        return;
    }
}
async function submitAnswer(req, res) {
    try {
        if (!req.user?._id) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Unauthorized', 401);
            return;
        }
        // Validate params
        const paramsValidation = session_validation_1.sessionIdSchema.validate(req.params);
        if (paramsValidation.error) {
            const errorMessage = paramsValidation.error.details[0].message;
            (0, index_2.errorResponseWithStatusCode)(res, errorMessage, index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        // Validate body
        const bodyValidation = session_validation_1.submitAnswerSchema.validate(req.body);
        if (bodyValidation.error) {
            const errorMessage = bodyValidation.error.details[0].message;
            (0, index_2.errorResponseWithStatusCode)(res, errorMessage, index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const { id } = paramsValidation.value;
        const answerData = bodyValidation.value;
        const answer = await SessionService.submitAnswer(id, answerData);
        const data = {
            success: true,
            answer
        };
        (0, index_2.successResponse)(res, data, 'Answer submitted successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to submit answer');
        return;
    }
}
async function getSessionById(req, res) {
    try {
        if (!req.user?._id) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Unauthorized', 401);
            return;
        }
        const { error, value } = session_validation_1.sessionIdSchema.validate(req.params);
        if (error) {
            const errorMessage = error.details[0].message;
            (0, index_2.errorResponseWithStatusCode)(res, errorMessage, index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const { id } = value;
        const session = await SessionService.getSessionById(id);
        const data = {
            success: true,
            session
        };
        (0, index_2.successResponse)(res, data, 'Session retrieved successfully');
        return;
    }
    catch (error) {
        if (error.message === "Session not found") {
            (0, index_2.errorResponseWithStatusCode)(res, 'Session not found', index_1.HTTP_NOT_FOUND_404);
            return;
        }
        (0, index_2.catchResponse)(res, error, 'Failed to retrieve session');
        return;
    }
}
async function getSessionSummary(req, res) {
    try {
        if (!req.user?._id) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Unauthorized', 401);
            return;
        }
        const { error, value } = session_validation_1.sessionIdSchema.validate(req.params);
        if (error) {
            const errorMessage = error.details[0].message;
            (0, index_2.errorResponseWithStatusCode)(res, errorMessage, index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const { id } = value;
        const summary = await SessionService.getSessionSummary(id);
        if (!summary.session) {
            (0, index_2.errorResponseWithStatusCode)(res, 'Session not found', index_1.HTTP_NOT_FOUND_404);
            return;
        }
        const data = {
            success: true,
            summary
        };
        (0, index_2.successResponse)(res, data, 'Session summary retrieved successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to retrieve session summary');
        return;
    }
}
