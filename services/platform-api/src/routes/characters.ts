import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as characterController from '../controllers/characterController.js';

const router = Router();

router.post('/characters', asyncHandler(characterController.create));
router.get('/characters', asyncHandler(characterController.list));
router.get('/characters/:id', asyncHandler(characterController.getById));
router.put('/characters/:id', asyncHandler(characterController.update));
router.put('/characters/:id/hair', asyncHandler(characterController.updateHair));
router.put('/characters/:id/wardrobe', asyncHandler(characterController.updateWardrobe));
router.put('/characters/:id/avatar', asyncHandler(characterController.updateAvatarArtifacts));
router.post('/characters/:id/twin', asyncHandler(characterController.triggerTwin));
router.delete('/characters/:id', asyncHandler(characterController.remove));

export default router;
