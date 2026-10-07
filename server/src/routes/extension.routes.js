import { Router } from 'express';
import { createExtensionLibrary, listExtensionLibraries } from '../controllers/library.controller.js';
import { saveSong } from '../controllers/song.controller.js';
import requireExtensionAuth from '../middlewares/extension-auth.js';

const router = Router();

router.use(requireExtensionAuth);
router.get('/libraries', listExtensionLibraries);
router.post('/libraries', createExtensionLibrary);
router.put('/libraries/:libraryId/songs', saveSong);

export default router;
