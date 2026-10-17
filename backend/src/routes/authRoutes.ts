import { Router } from 'express';
import { AuthController } from '../controllers';
import { authenticate } from '../middleware/auth';
import passport from 'passport';
import { config } from '../config';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.frontendUrl}/login?error=google_auth_failed`,
  }),
  AuthController.googleCallback
);

router.post('/change-password', authenticate, AuthController.changePassword);
router.post('/set-google-password', authenticate, AuthController.setGooglePassword);
router.get('/me', authenticate, AuthController.getMe);

export default router;
