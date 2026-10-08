import { Router } from 'express';
import { createMp3 } from '../controllers/media.controller.js';
import requireAuth from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/mp3', createMp3);

export default router;
