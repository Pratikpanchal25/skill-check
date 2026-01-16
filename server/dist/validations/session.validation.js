"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionIdSchema = exports.submitAnswerSchema = exports.createSessionSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createSessionSchema = joi_1.default.object({
    userId: joi_1.default.string().required().messages({
        'any.required': 'User ID is required'
    }),
    skillId: joi_1.default.string().required().messages({
        'any.required': 'Skill ID is required'
    }),
    mode: joi_1.default.string().valid('explain', 'drill', 'blind').required().messages({
        'any.only': 'Mode must be one of: explain, drill, blind',
        'any.required': 'Mode is required'
    }),
    inputType: joi_1.default.string().valid('voice', 'text').required().messages({
        'any.only': 'Input type must be either "voice" or "text"',
        'any.required': 'Input type is required'
    }),
    difficulty: joi_1.default.string().valid('beginner', 'intermediate', 'advanced').required().messages({
        'any.only': 'Difficulty must be one of: beginner, intermediate, advanced',
        'any.required': 'Difficulty is required'
    })
});
exports.submitAnswerSchema = joi_1.default.object({
    rawText: joi_1.default.string().required().messages({
        'any.required': 'Answer text is required'
    }),
    voiceMetrics: joi_1.default.object({
        duration: joi_1.default.number().required().messages({
            'any.required': 'Duration is required in voice metrics'
        }),
        pauseCount: joi_1.default.number().required().messages({
            'any.required': 'Pause count is required in voice metrics'
        }),
        avgPauseDuration: joi_1.default.number().optional(),
        fillerWordCount: joi_1.default.number().optional()
    }).optional()
});
exports.sessionIdSchema = joi_1.default.object({
    id: joi_1.default.string().required().messages({
        'any.required': 'Session ID is required'
    })
});
