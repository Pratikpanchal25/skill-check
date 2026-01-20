
import {
    TypedRequestWithParams,
    CombinedResponseType,
    SessionIdParams,
    HTTP_BAD_REQUEST_400,
    HTTP_CREATED_201 // Usually evaluation creation returns 201 or 200
} from "../types/index";
import {
    successResponse,
    errorResponseWithStatusCode,
    catchResponse
} from "../utils/index";
import { sessionIdSchema } from "../validations/session.validation";
import * as EvaluationService from "../services/evaluation.service";

export async function evaluateSession(req: TypedRequestWithParams<SessionIdParams>, res: CombinedResponseType): Promise<void> {
    try {
        const { error, value } = sessionIdSchema.validate(req.params);
        if (error) {
            const errorMessage = error.details[0].message;
            errorResponseWithStatusCode(res, errorMessage, HTTP_BAD_REQUEST_400);
            return;
        }

        const { id } = value;
        const { answerId } = req.body;

        // Call EvaluationService
        const evaluation = await EvaluationService.evaluateSession(id, answerId);

        const data = {
            success: true,
            evaluation
        };

        successResponse(res, data, 'Session evaluated successfully');
        return;
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to evaluate session');
        return;
    }
}
