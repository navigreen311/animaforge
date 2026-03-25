import { Router } from "express";
import * as characterController from "../controllers/characterController.js";

const router = Router();

router.post("/characters", characterController.create);
router.get("/characters", characterController.list);
router.get("/characters/:id", characterController.getById);
router.put("/characters/:id", characterController.update);
router.post("/characters/:id/twin", characterController.triggerTwin);
router.delete("/characters/:id", characterController.remove);

export default router;
