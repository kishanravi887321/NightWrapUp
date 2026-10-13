import { Router } from 'express';
import { createLibrary } from '../controllers/library.controller.js';
import { deleteSong } from '../controllers/song.controller.js';
import requireAuth from '../middlewares/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/libraries', createLibrary);

// Delete song routes
// 1. DELETE /api/mobile/songs/:songId (songId in URL path parameter)
// 2. DELETE /api/mobile/songs (songId in JSON body)
// 3. DELETE /api/mobile/libraries/:libraryId/songs/:songId (scoped by libraryId)
// 4. POST /api/mobile/songs/delete (fallback for clients where DELETE body is restricted)
router.delete('/songs/:songId', deleteSong);
router.delete('/songs', deleteSong);
router.delete('/libraries/:libraryId/songs/:songId', deleteSong);
router.post('/songs/delete', deleteSong);

export default router;
