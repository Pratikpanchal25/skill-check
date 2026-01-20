import Joi from "joi"

export const createSessionSchema = Joi.object({
    userId: Joi.string().required().messages({
        'any.required': 'User ID is required'
    }),

    skillName: Joi.string().required().messages({
        'any.required': 'Skill Name is required'
    }),
    mode: Joi.string().valid('explain', 'drill', 'blind').required().messages({
        'any.only': 'Mode must be one of: explain, drill, blind',
        'any.required': 'Mode is required'
    }),
    inputType: Joi.string().valid('voice', 'text').required().messages({
        'any.only': 'Input type must be either "voice" or "text"',
        'any.required': 'Input type is required'
    }),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required().messages({
        'any.only': 'Difficulty must be one of: beginner, intermediate, advanced',
        'any.required': 'Difficulty is required'
    })
})

export const submitAnswerSchema = Joi.object({
    rawText: Joi.string().required().messages({
        'any.required': 'Answer text is required'
    }),
    voiceMetrics: Joi.object({
        duration: Joi.number().required().messages({
            'any.required': 'Duration is required in voice metrics'
        }),
        pauseCount: Joi.number().required().messages({
            'any.required': 'Pause count is required in voice metrics'
        }),
        avgPauseDuration: Joi.number().optional(),
        fillerWordCount: Joi.number().optional()
    }).optional()
})

export const sessionIdSchema = Joi.object({
    id: Joi.string().required().messages({
        'any.required': 'Session ID is required'
    })
})
