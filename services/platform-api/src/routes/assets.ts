import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as assetController from '../controllers/assetController.js';

const router = Router();

router.post('/assets', asyncHandler(assetController.create));
router.get('/assets', asyncHandler(assetController.list));
router.get('/assets/search', asyncHandler(assetController.search));
router.get('/assets/:id', asyncHandler(assetController.getById));
router.delete('/assets/:id', asyncHandler(assetController.remove));

export default router;
