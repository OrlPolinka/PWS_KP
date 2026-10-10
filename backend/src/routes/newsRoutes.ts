import { Router } from 'express';
import { NewsController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, NewsController.getAllNews);
router.get('/:id', authenticate, NewsController.getNewsById);
router.post('/', authenticate, authorize('admin'), NewsController.createNews);
router.put('/:id', authenticate, authorize('admin'), NewsController.updateNews);
router.delete('/:id', authenticate, authorize('admin'), NewsController.deleteNews);
router.patch('/:id/published', authenticate, authorize('admin'), NewsController.setNewsPublished);

export default router;
