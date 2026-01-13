import Joi from "joi"

export const createSessionSchema = Joi.object({
    userId: Joi.string().required().messages({
        'any.required': 'User ID is required'
    }),
    skillId: Joi.string().required().messages({
        'any.required': 'Skill ID is required'
    }),
    mode: Joi.string().valid('explain-to-prove', 'voice-demo').required().messages({
        'any.only': 'Mode must be either "explain-to-prove" or "voice-demo"',
        'any.required': 'Mode is required'
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
