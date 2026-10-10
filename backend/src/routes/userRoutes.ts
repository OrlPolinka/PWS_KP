import { Router } from 'express';
import { UserController } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, authorize('admin'), UserController.getAllUsers);
router.post('/create', authenticate, authorize('admin'), UserController.createUserByAdmin);
router.get('/me', authenticate, UserController.getUserById.bind(UserController));
router.get('/qr-code', authenticate, UserController.getQRCode);
router.get('/by-qr/:qr_token', UserController.getUserByQRToken);
router.get('/by-code/:client_code', UserController.getUserByClientCode);

router.get('/:id', authenticate, UserController.getUserById);
router.put('/:id', authenticate, authorize('admin'), UserController.updateUser);
router.delete('/:id', authenticate, UserController.deleteUser);
router.patch('/:id/deactivate', authenticate, authorize('admin'), UserController.deactivateUser);
router.patch('/:id/activate', authenticate, authorize('admin'), UserController.activateUser);

export default router;
