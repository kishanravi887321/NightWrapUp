import { Router } from 'express';
import { listExtensionLibraries } from '../controllers/library.controller.js';
import { saveSong } from '../controllers/song.controller.js';
import requireExtensionAuth from '../middlewares/extension-auth.js';

const router = Router();

router.use(requireExtensionAuth);
router.get('/libraries', listExtensionLibraries);
router.put('/libraries/:libraryId/songs', saveSong);

export default router;
