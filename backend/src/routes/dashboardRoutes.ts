import { Router } from 'express';
import { DashboardController } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, DashboardController.getDashboard);

export default router;
