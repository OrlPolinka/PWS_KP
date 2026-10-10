import { Router } from 'express';
import { DanceStyleController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, DanceStyleController.getAll);
router.get('/:id', authenticate, DanceStyleController.getById);
router.post('/', authenticate, authorize('admin'), DanceStyleController.create);
router.put('/:id', authenticate, authorize('admin'), DanceStyleController.update);
router.delete('/:id', authenticate, authorize('admin'), DanceStyleController.remove);

export default router;