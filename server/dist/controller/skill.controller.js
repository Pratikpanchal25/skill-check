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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSkills = getAllSkills;
exports.createSkill = createSkill;
const index_1 = require("../types/index");
const index_2 = require("../utils/index");
const joi_1 = __importDefault(require("joi"));
const SkillService = __importStar(require("../services/skill.service"));
const createSkillSchema = joi_1.default.object({
    name: joi_1.default.string().required().messages({
        'any.required': 'Skill name is required'
    }),
    category: joi_1.default.string().valid('backend', 'frontend', 'system', 'dsa').required().messages({
        'any.only': 'Category must be one of: backend, frontend, system, dsa',
        'any.required': 'Category is required'
    })
});
async function getAllSkills(req, res) {
    try {
        const skills = await SkillService.getAllSkills();
        const data = {
            success: true,
            skills
        };
        (0, index_2.successResponse)(res, data, 'Skills retrieved successfully');
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to retrieve skills');
        return;
    }
}
async function createSkill(req, res) {
    try {
        const { error, value } = createSkillSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details[0].message;
            (0, index_2.errorResponseWithStatusCode)(res, errorMessage, index_1.HTTP_BAD_REQUEST_400);
            return;
        }
        const skill = await SkillService.createSkill(value);
        const data = {
            success: true,
            skill
        };
        res.status(index_1.HTTP_CREATED_201).json({
            success: 1,
            data,
            message: 'Skill created successfully',
            status_code: index_1.HTTP_CREATED_201
        });
        return;
    }
    catch (error) {
        (0, index_2.catchResponse)(res, error, 'Failed to create skill');
        return;
    }
}
