import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import trainerRoutes from './trainerRoutes';
import scheduleRoutes from './scheduleRoutes';
import membershipTypeRoutes from './membershipTypeRoutes';
import membershipRoutes from './membershipRoutes';
import bookingRoutes from './bookingRoutes';
import attendanceRoutes from './attendanceRoutes';
import messageRoutes from './messageRoutes';
import newsRoutes from './newsRoutes';
import notificationRoutes from './notificationRoutes';
import danceStyleRoutes from './danceStyleRoutes';
import paymentRoutes from './paymentRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/trainers', trainerRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/membership-types', membershipTypeRoutes);
router.use('/memberships', membershipRoutes);
router.use('/bookings', bookingRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/messages', messageRoutes);
router.use('/news', newsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dance-styles', danceStyleRoutes);
router.use('/payments', paymentRoutes);

export default router;
