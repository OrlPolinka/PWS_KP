import { Router } from 'express';
import { TrainerController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';
import { trainerMediaUpload } from '../middleware/trainerMediaUpload';

const router = Router();

router.get('/', authenticate, TrainerController.getAllTrainers);
router.get('/me/profile', authenticate, authorize('trainer'), TrainerController.getMyProfile);
router.patch('/me/profile', authenticate, authorize('trainer'), TrainerController.updateMyProfile);
router.post('/me/media', authenticate, authorize('trainer'), trainerMediaUpload.array('media', 8), TrainerController.saveProfileMedia);
router.get('/:id', authenticate, TrainerController.getTrainerById);
router.post('/', authenticate, authorize('admin'), TrainerController.createTrainer);
router.put('/:id', authenticate, authorize('admin'), TrainerController.updateTrainer);
router.delete('/:id', authenticate, authorize('admin'), TrainerController.deleteTrainer);
router.patch('/:id/published', authenticate, authorize('admin'), TrainerController.setTrainerPublished);

export default router;
