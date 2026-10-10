import { Request, Response } from 'express';
import { AuthService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, role, full_name, phone } = req.body;
      const result = await AuthService.register({ email, password, role, full_name, phone });
      
      res.status(201).json({
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          full_name: result.user.full_name,
          phone: result.user.phone,
          photo_url: result.user.photo_url,
        },
        token: result.token,
      });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      
      res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          full_name: result.user.full_name,
          phone: result.user.phone,
          photo_url: result.user.photo_url,
        },
        token: result.token,
      });
    } catch (error: any) {
      throw new AppError(401, error.message);
    }
  }

  static async googleCallback(req: Request, res: Response) {
    try {
      const user = req.user as any;
      const result = await AuthService.googleLogin({
        email: user.emails[0].value,
        name: user.displayName,
        picture: user.photos?.[0]?.value,
      });
      
      res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          full_name: result.user.full_name,
          photo_url: result.user.photo_url,
        },
        token: result.token,
        isNewUser: result.isNewUser,
      });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { oldPassword, newPassword } = req.body;
      
      await AuthService.changePassword(userId, oldPassword, newPassword);
      
      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async setGooglePassword(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { password } = req.body;
      
      await AuthService.setGooglePassword(userId, password);
      
      res.json({ message: 'Password set successfully' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getMe(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { UserService } = await import('../services');
      const user = await UserService.getUserById(userId);
      
      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone: user.phone,
        photo_url: user.photo_url,
        client_code: user.client_code,
        is_active: user.is_active,
      });
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }
}
