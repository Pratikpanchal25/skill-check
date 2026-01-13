import { Router } from "express";
import * as SessionController from "../controller/session.controller";

const router = Router();

router.post("/", SessionController.createSession);
router.post("/:id/answer", SessionController.submitAnswer);
router.post("/:id/evaluate", SessionController.evaluateSession);
router.get("/:id/summary", SessionController.getSessionSummary);

export default router;
