import { Router } from "express";
import * as assetController from "../controllers/assetController.js";

const router = Router();

router.post("/assets", assetController.create);
router.get("/assets", assetController.list);
router.get("/assets/search", assetController.search);
router.get("/assets/:id", assetController.getById);
router.delete("/assets/:id", assetController.remove);

export default router;
