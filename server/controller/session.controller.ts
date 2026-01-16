import {
    TypedRequestWithBody,
    TypedRequestWithParams,
    TypedRequestWithParamsAndBody,
    CombinedResponseType,
    AuthRequest,
    CreateSessionRequestBody,
    SubmitAnswerRequestBody,
    SessionIdParams,
    HTTP_BAD_REQUEST_400,
    HTTP_NOT_FOUND_404,
    HTTP_CREATED_201
} from "../types/index"
import {
    successResponse,
    errorResponse,
    errorResponseWithStatusCode,
    catchResponse
} from "../utils/index"
import { createSessionSchema, submitAnswerSchema, sessionIdSchema } from "../validations/session.validation"
import * as SessionService from "../services/session.service";


export async function createSession(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        const { error, value } = createSessionSchema.validate(req.body)
        if (error) {
            const errorMessage = error.details[0].message
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400)
            return
        }

        if (!req.user?._id) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401)
            return
        }

        // Override userId from body with authenticated userId for security
        value.userId = req.user._id.toString()

        const session = await SessionService.createSession(value)

        const data = {
            success: true,
            session
        }

        successResponse(res, data, 'Session created successfully')
        return
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to create session')
        return
    }
}

export async function submitAnswer(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        if (!req.user?._id) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401)
            return
        }
        // Validate params
        const paramsValidation = sessionIdSchema.validate(req.params)
        if (paramsValidation.error) {
            const errorMessage = paramsValidation.error.details[0].message
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400)
            return
        }

        // Validate body
        const bodyValidation = submitAnswerSchema.validate(req.body)
        if (bodyValidation.error) {
            const errorMessage = bodyValidation.error.details[0].message
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400)
            return
        }

        const { id } = paramsValidation.value
        const answerData = bodyValidation.value

        const answer = await SessionService.submitAnswer(id, answerData)

        const data = {
            success: true,
            answer
        }

        successResponse(res, data, 'Answer submitted successfully')
        return
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to submit answer')
        return
    }
}



export async function getSessionById(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        if (!req.user?._id) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401)
            return
        }
        const { error, value } = sessionIdSchema.validate(req.params)
        if (error) {
            const errorMessage = error.details[0].message
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400)
            return
        }

        const { id } = value

        const session = await SessionService.getSessionById(id)

        const data = {
            success: true,
            session
        }

        successResponse(res, data, 'Session retrieved successfully')
        return
    } catch (error) {
        if ((error as Error).message === "Session not found") {
            errorResponseWithStatusCode(res, 'Session not found', HTTP_NOT_FOUND_404)
            return
        }
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to retrieve session')
        return
    }
}

export async function getSessionSummary(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        if (!req.user?._id) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401)
            return
        }
        const { error, value } = sessionIdSchema.validate(req.params)
        if (error) {
            const errorMessage = error.details[0].message
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400)
            return
        }

        const { id } = value

        const summary = await SessionService.getSessionSummary(id)

        if (!summary.session) {
            errorResponseWithStatusCode(res, 'Session not found', HTTP_NOT_FOUND_404)
            return
        }

        const data = {
            success: true,
            summary
        }

        successResponse(res, data, 'Session summary retrieved successfully')
        return
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to retrieve session summary')
        return
    }
}
