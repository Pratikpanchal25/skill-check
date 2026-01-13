import { Router } from "express";
import * as UserController from "../controller/user.controller";

const router = Router();

router.post("/", UserController.createUser);
router.get("/me", UserController.getMe);
router.patch("/me", UserController.updateMe);
router.get("/me/overview", UserController.getOverview);
router.get("/me/activity", UserController.getActivity);
router.delete("/me", UserController.deleteMe);

export default router;
