import { Router } from 'express';
import { createLibrary, deleteLibrary, deleteLibrarySong, listLibraries, listLibrarySongs, recordSongPlay } from '../controllers/library.controller.js';
import requireAuth from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/', createLibrary);
router.get('/', listLibraries);
router.get('/:libraryId/songs', listLibrarySongs);
router.post('/:libraryId/songs/:songId/play', recordSongPlay);
router.delete('/:libraryId/songs/:songId', deleteLibrarySong);
router.delete('/:libraryId', deleteLibrary);

export default router;
