import { Router } from "express";
import * as UserController from "../controller/user.controller";
import { auth } from "../middleware/auth.middleware";

const router = Router();

router.post("/", UserController.createUser);
router.post("/login", UserController.login);
router.get("/me", auth as any, UserController.getMe as any);
router.patch("/me", auth as any, UserController.updateMe as any);
router.get("/me/overview", auth as any, UserController.getOverview as any);
router.get("/me/activity", auth as any, UserController.getActivity as any);
router.delete("/me", auth as any, UserController.deleteMe as any);

export default router;
