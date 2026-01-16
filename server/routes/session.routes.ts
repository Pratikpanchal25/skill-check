import { Router } from "express";
import * as SessionController from "../controller/session.controller";
import * as EvaluationController from "../controller/evaluation.controller";
import { auth } from "../middleware/auth.middleware";

const router = Router();

router.post("/", auth as any, SessionController.createSession as any);
router.post("/:id/answer", auth as any, SessionController.submitAnswer as any);
router.post("/:id/evaluate", auth as any, EvaluationController.evaluateSession as any);
router.get("/:id/summary", auth as any, SessionController.getSessionSummary as any);
router.get("/:id", auth as any, SessionController.getSessionById as any);

export default router;
