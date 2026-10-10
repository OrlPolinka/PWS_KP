import { Router } from 'express';
import { AttendanceController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, authorize('trainer'), AttendanceController.markAttendance);
router.get('/my', authenticate, authorize('trainer'), AttendanceController.getMyAttendance);
router.get('/:id', authenticate, AttendanceController.getAttendanceById);
router.put('/:id', authenticate, authorize('trainer'), AttendanceController.updateAttendance);

router.get('/trainer/:trainer_id', authenticate, authorize('admin'), AttendanceController.getTrainerAttendance);

export default router;
