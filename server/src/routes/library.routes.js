import { Router } from 'express';
import { createLibrary, listLibraries } from '../controllers/library.controller.js';
import requireAuth from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/', createLibrary);
router.get('/', listLibraries);

export default router;
