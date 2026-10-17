import { Router } from 'express';
import { BookingController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/my', authenticate, authorize('client'), BookingController.getMyBookings);
router.get('/my/history', authenticate, authorize('client'), BookingController.getMyVisitHistory);
router.post('/', authenticate, authorize('client'), BookingController.createBooking);
router.patch('/:id/cancel', authenticate, BookingController.cancelBooking);
router.patch('/:id/check-in', authenticate, authorize('trainer'), BookingController.checkInBooking);

router.get('/client/:client_id', authenticate, authorize('admin'), BookingController.getClientBookings);
router.get('/client/:client_id/history', authenticate, authorize('admin'), BookingController.getClientVisitHistory);
router.get('/schedule/:schedule_id/attendance', authenticate, authorize('trainer'), BookingController.getAttendanceRoster);
router.post('/schedule/:schedule_id/attendance', authenticate, authorize('trainer'), BookingController.markAttendanceByIdentifier);
router.get('/schedule/:schedule_id', authenticate, authorize('trainer'), BookingController.getScheduleBookings);

export default router;
