import Joi from "joi"

export const createUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    name: Joi.string().optional(),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required'
    }),
    role: Joi.string().valid('student', 'engineer').optional()
})

export const userLoginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    })
})

export const updateUserSchema = Joi.object({
    name: Joi.string().optional(),
    role: Joi.string().valid('student', 'engineer').optional()
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
})
