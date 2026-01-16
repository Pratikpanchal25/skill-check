import {
    TypedRequestWithBody,
    CombinedResponseType,
    HTTP_BAD_REQUEST_400,
    HTTP_CREATED_201,
    HTTP_NOT_FOUND_404
} from "../types/index";
import {
    successResponse,
    errorResponseWithStatusCode,
    catchResponse
} from "../utils/index";
import Joi from "joi";
import * as SkillService from "../services/skill.service";

const createSkillSchema = Joi.object({
    name: Joi.string().required().messages({
        'any.required': 'Skill name is required'
    }),
    category: Joi.string().valid('backend', 'frontend', 'system', 'dsa').required().messages({
        'any.only': 'Category must be one of: backend, frontend, system, dsa',
        'any.required': 'Category is required'
    })
});

export async function getAllSkills(req: any, res: CombinedResponseType): Promise<void> {
    try {
        const skills = await SkillService.getAllSkills();

        const data = {
            success: true,
            skills
        };

        successResponse(res, data, 'Skills retrieved successfully');
        return;
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to retrieve skills');
        return;
    }
}

export async function createSkill(req: TypedRequestWithBody<{ name: string; category: string }>, res: CombinedResponseType): Promise<void> {
    try {
        const { error, value } = createSkillSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details[0].message;
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400);
            return;
        }

        const skill = await SkillService.createSkill(value);

        const data = {
            success: true,
            skill
        };

        res.status(HTTP_CREATED_201).json({
            success: 1,
            data,
            message: 'Skill created successfully',
            status_code: HTTP_CREATED_201
        });
        return;
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to create skill');
        return;
    }
}

