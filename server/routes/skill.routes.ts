import { Router } from "express";
import * as SkillController from "../controller/skill.controller";
import { auth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", auth as any, SkillController.getAllSkills as any);
router.post("/", auth as any, SkillController.createSkill as any);

export default router;

