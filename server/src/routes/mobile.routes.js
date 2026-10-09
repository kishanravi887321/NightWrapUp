import { Router } from 'express';
import { createLibrary } from '../controllers/library.controller.js';
import requireAuth from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/libraries', createLibrary);

export default router;
