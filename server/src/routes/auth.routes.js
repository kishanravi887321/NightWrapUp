import { Router } from 'express';
import {
  createExtensionCredential,
  googleAuth,
  logout,
  refresh,
} from '../controllers/auth.controller.js';
import requireAuth from '../middlewares/auth.js';

const router = Router();

router.post('/google', googleAuth);
router.post('/refresh', refresh);
router.post('/extension-token', requireAuth, createExtensionCredential);
router.post('/logout', requireAuth, logout);

export default router;
