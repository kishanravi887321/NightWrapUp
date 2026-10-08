import { Router } from 'express';
import {
  createExtensionCredential,
  createMobileSecretKey,
  googleAuth,
  logout,
  mobileLogin,
  mobileRefresh,
  revokeMobileSecretKey,
  refresh,
} from '../controllers/auth.controller.js';
import requireAuth from '../middlewares/auth.js';

const router = Router();

router.post('/google', googleAuth);
router.post('/refresh', refresh);
router.post('/mobile-login', mobileLogin);
router.post('/mobile-refresh', mobileRefresh);
router.post('/extension-token', requireAuth, createExtensionCredential);
router.post('/mobile-key', requireAuth, createMobileSecretKey);
router.delete('/mobile-key', requireAuth, revokeMobileSecretKey);
router.post('/logout', requireAuth, logout);

export default router;
