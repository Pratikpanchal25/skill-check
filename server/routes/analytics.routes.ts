
import { Router } from "express";
import * as AnalyticsController from "../controller/analytics.controller";
import { auth } from "../middleware/auth.middleware";

const router = Router();

router.get("/progress", auth as any, AnalyticsController.getProgress as any);
router.get("/skill-gaps", auth as any, AnalyticsController.getSkillGaps as any);
router.get("/readiness-score", auth as any, AnalyticsController.getReadinessScore as any);

export default router;
