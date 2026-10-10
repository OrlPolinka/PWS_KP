import { Router } from 'express';
import { ScheduleController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, ScheduleController.getAllSchedules);
router.get('/options', authenticate, ScheduleController.getOptions);
router.get('/:id', authenticate, ScheduleController.getScheduleById);
router.post('/', authenticate, authorize('admin'), ScheduleController.createSchedule);
router.put('/:id', authenticate, authorize('admin'), ScheduleController.updateSchedule);
router.delete('/:id', authenticate, authorize('admin'), ScheduleController.deleteSchedule);
router.patch('/:id/cancel', authenticate, authorize('admin'), ScheduleController.cancelSchedule);
router.get('/trainer/:trainer_id', authenticate, ScheduleController.getTrainerSchedule);
router.get('/:id/capacity', authenticate, ScheduleController.checkScheduleCapacity);

export default router;
