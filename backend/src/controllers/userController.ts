import { Request, Response } from 'express';
import { UserService } from '../services';
import { AppError } from '../middleware/errorHandler';
import { removePreviousProfilePhoto, removeUploadedProfilePhoto } from '../middleware/profilePhotoUpload';

export class UserController {
  static async updateMyProfile(req: Request, res: Response) {
    const uploadedPhoto = req.file;
    try {
      const currentUser = await UserService.getUserById(req.user!.userId);
      const photoUrl = uploadedPhoto
        ? `${req.protocol}://${req.get('host')}/uploads/${uploadedPhoto.filename}`
        : undefined;
      const user = await UserService.updateMyProfile(req.user!.userId, req.body, photoUrl);

      if (uploadedPhoto && currentUser.photo_url !== photoUrl) {
        try {
          removePreviousProfilePhoto(currentUser.photo_url, req.get('host') || '');
        } catch (cleanupError) {
          console.error('Failed to remove previous profile photo:', cleanupError);
        }
      }

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone: user.phone,
        photo_url: user.photo_url,
        is_active: user.is_active,
        client_code: user.client_code,
      });
    } catch (error: unknown) {
      if (uploadedPhoto) {
        try {
          removeUploadedProfilePhoto(uploadedPhoto.filename);
        } catch (cleanupError) {
          console.error('Failed to remove rejected profile photo:', cleanupError);
        }
      }
      const message = error instanceof Error ? error.message : 'Не удалось сохранить профиль.';
      throw new AppError(400, message);
    }
  }

  static async getAllUsers(req: Request, res: Response) {
    try {
      const { role, is_active } = req.query;
      const users = await UserService.getAllUsers({
        role: role as any,
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      });

      res.json(users);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async createUserByAdmin(req: Request, res: Response) {
    try {
      const createdBy = req.user!.userId;
      const user = await UserService.createUserByAdmin({
        ...req.body,
        createdBy,
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone: user.phone,
      });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);

      res.json(user);
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.updateUser(id, req.body);

      res.json(user);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = req.user!.userId;
      const currentUserRole = req.user!.role;

      // Clients can only delete their own account
      if (currentUserRole === 'client' && id !== currentUserId) {
        throw new AppError(403, 'Clients can only delete their own account');
      }

      // Admins cannot delete themselves
      if (currentUserRole === 'admin' && id === currentUserId) {
        throw new AppError(403, 'Admins cannot delete their own account');
      }

      await UserService.deleteUser(id);
      
      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async deactivateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.deactivateUser(id);
      
      res.json(user);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async activateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.activateUser(id);
      
      res.json(user);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getQRCode(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const qrCode = await UserService.generateQRCode(userId);
      const user = await UserService.getUserById(userId);
      res.json({ qr_code: qrCode, client_code: user.client_code, full_name: user.full_name });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getUserByQRToken(req: Request, res: Response) {
    try {
      const { qr_token } = req.params;
      const user = await UserService.getUserByQRToken(qr_token);
      
      res.json({
        id: user.id,
        full_name: user.full_name,
        client_code: user.client_code,
        photo_url: user.photo_url,
      });
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async getUserByClientCode(req: Request, res: Response) {
    try {
      const { client_code } = req.params;
      const user = await UserService.getUserByClientCode(client_code);
      
      res.json({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        photo_url: user.photo_url,
      });
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }
}
