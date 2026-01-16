import { Response } from "express"
import { SuccessResponse, ErrorResponse, CatchResponse } from "../types/index"
import bcrypt from "bcrypt"
import { v4 as uuidv4 } from "uuid"
import { User } from "../models/user.model"

export function successResponse(res: Response, data: object, message: string): Response {
    const response: SuccessResponse = {
        success: 1,
        data: data,
        message: message,
        status_code: 200
    }
    return res.status(200).json(response)
}

export function errorResponse(res: Response, message: string): Response {
    const response: ErrorResponse = {
        success: 0,
        message: message
    }
    return res.status(200).json(response)
}

export function errorResponseWithStatusCode(res: Response, message: string, status: number): Response {
    const response: ErrorResponse = {
        success: 0,
        message: message
    }
    return res.status(status).json(response)
}

export function catchResponse(res: Response, error: unknown, message: string): Response {
    let errorMessage: string
    if (error instanceof Error) {
        errorMessage = error.message || 'An unexpected error occurred'
    } else if (typeof error === 'string') {
        errorMessage = error
    } else {
        errorMessage = 'An unknown error occurred'
    }

    const response: CatchResponse = {
        success: 0,
        error: errorMessage,
        message,
        status_code: 500
    }

    return res.status(500).json(response)
}

export async function bcryptPassword(password: string): Promise<string> {
    const bcryptPassword = await bcrypt.hash(password, 10)
    return bcryptPassword
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    const isPasswordValid = await bcrypt.compare(password, hashedPassword)
    return isPasswordValid
}

export async function createAndGetToken(userId: string): Promise<{ _id: any, user_id: string, token: string }> {
    const token = uuidv4()
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { token: token },
        { new: true }
    )

    if (!updatedUser) {
        throw new Error('User not found')
    }

    return {
        _id: updatedUser._id,
        user_id: userId,
        token: token
    }
}