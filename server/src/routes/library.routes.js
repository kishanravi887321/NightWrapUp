import { Router } from 'express';
import { createLibrary, listLibraries, listLibrarySongs } from '../controllers/library.controller.js';
import requireAuth from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/', createLibrary);
router.get('/', listLibraries);
router.get('/:libraryId/songs', listLibrarySongs);

export default router;
