import { Request, Response } from "express"

// HTTP Status Code Constants
export const HTTP_OK_200 = 200
export const HTTP_CREATED_201 = 201
export const HTTP_BAD_REQUEST_400 = 400
export const HTTP_UNAUTHORIZED_401 = 401
export const HTTP_NOT_FOUND_404 = 404
export const HTTP_INTERNAL_SERVER_ERROR_500 = 500
export const HTTP_NOT_IMPLEMENTED_501 = 501

// Response Types
export interface SuccessResponse {
    success: number
    data: object
    message: string
    status_code: number
}

export interface ErrorResponse {
    success: number
    message: string
}

export interface CatchResponse {
    success: number
    error?: string
    message: string
    status_code: number
}

// Combined Response Type for controllers
export type CombinedResponseType = Response<SuccessResponse | ErrorResponse | CatchResponse>

// Typed Request Helpers
export interface TypedRequestWithBody<T> extends Request<any, any, T> {
}

export interface TypedRequestWithParams<T> extends Request<T> {
}

export interface TypedRequestWithQuery<T> extends Request<any, any, any, T> {
}

export interface TypedRequestWithParamsAndBody<P, B> extends Request<P, any, B> {
}

export interface AuthRequest extends Request {
    user?: any;
}

// Request Body Interfaces for User endpoints
export interface CreateUserRequestBody {
    email: string
    name?: string
    password: string
    role?: "student" | "engineer"
}

export interface LoginRequestBody {
    email: string
    password: string
}

export interface UpdateUserRequestBody {
    name?: string
    role?: "student" | "engineer"
}

// Request Body Interfaces for Session endpoints
export interface CreateSessionRequestBody {
    userId: string

    skillName: string
    mode: "explain" | "drill" | "blind"
    inputType: "voice" | "text"
    difficulty: "beginner" | "intermediate" | "advanced"
}

export interface SubmitAnswerRequestBody {
    rawText: string
    voiceMetrics?: {
        duration: number
        pauseCount: number
        avgPauseDuration?: number
        fillerWordCount?: number
    }
}

// Request Params Interfaces
export interface SessionIdParams {
    id: string
}

export interface UserIdQuery {
    userId?: string
}

// Request Body Interfaces for Skill endpoints
export interface CreateSkillRequestBody {
    name: string
    category: "backend" | "frontend" | "system" | "dsa"
}