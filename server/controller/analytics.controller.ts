import {
    CombinedResponseType,
    AuthRequest,
    HTTP_BAD_REQUEST_400
} from "../types/index";
import {
    successResponse,
    errorResponseWithStatusCode,
    catchResponse
} from "../utils/index";
import * as AnalyticsService from "../services/analytics.service";

export async function getProgress(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        const userId = req.user?._id;

        if (!userId) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401);
            return;
        }

        const progress = await AnalyticsService.getUserProgress(userId as string);

        const data = {
            success: true,
            progress
        };

        successResponse(res, data, 'Progress retrieved successfully');
        return;
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to retrieve progress');
        return;
    }
}

export async function getSkillGaps(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        const userId = req.user?._id;

        if (!userId) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401);
            return;
        }

        const skillGaps = await AnalyticsService.getUserSkillGaps(userId as string);

        const data = {
            success: true,
            skillGaps
        };

        successResponse(res, data, 'Skill gaps retrieved successfully');
        return;
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to retrieve skill gaps');
        return;
    }
}

export async function getReadinessScore(req: AuthRequest, res: CombinedResponseType): Promise<void> {
    try {
        const userId = req.user?._id;

        if (!userId) {
            errorResponseWithStatusCode(res, 'Unauthorized', 401);
            return;
        }

        const readinessScore = await AnalyticsService.getUserReadinessScore(userId as string);

        const data = {
            success: true,
            readinessScore
        };

        successResponse(res, data, 'Readiness score retrieved successfully');
        return;
    } catch (error) {
        catchResponse(res, error as { [key: string]: unknown, message: string }, 'Failed to retrieve readiness score');
        return;
    }
}

