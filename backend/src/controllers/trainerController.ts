import { Request, Response } from 'express';
import { TrainerService } from '../services';
import { AppError } from '../middleware/errorHandler';
import { removeTrainerMediaFile, trainerMediaUrl } from '../middleware/trainerMediaUpload';

export class TrainerController {
  static async getAllTrainers(req: Request, res: Response) {
    try {
      const { is_published } = req.query;
      const trainers = await TrainerService.getAllTrainers({
        is_published: req.user?.role === 'admin'
          ? is_published === 'true' ? true : is_published === 'false' ? false : undefined
          : true,
      });
      
      res.json(trainers);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getTrainerById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const trainer = await TrainerService.getTrainerById(id, req.user?.role === 'admin');
      
      res.json(trainer);
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async createTrainer(req: Request, res: Response) {
    try {
      const { user_id, ...trainerData } = req.body;
      const trainer = await TrainerService.createTrainer(user_id, trainerData);
      
      res.status(201).json(trainer);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getMyProfile(req: Request, res: Response) {
    try {
      res.json(await TrainerService.getMyProfile(req.user!.userId));
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async updateMyProfile(req: Request, res: Response) {
    try {
      res.json(await TrainerService.updateMyProfile(req.user!.userId, req.body));
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async saveProfileMedia(req: Request, res: Response) {
    const files = (req.files || {}) as { [fieldname: string]: Express.Multer.File[] };
    const uploadedFiles = [...(files.photo || []), ...(files.media || [])];
    try {
      const photo = files.photo?.[0];
      if (photo && photo.size > 5 * 1024 * 1024) {
        throw new Error('Фото профиля не должно превышать 5 МБ.');
      }

      const trainer = await TrainerService.getMyProfile(req.user!.userId);
      const media = (files.media || []).map((file) => trainerMediaUrl(file.filename));
      const result = await TrainerService.saveProfileMedia(
        req.user!.userId,
        photo ? trainerMediaUrl(photo.filename) : undefined,
        media
      );

      if (photo && trainer.photo_url && trainer.photo_url !== result.photo_url) {
        removeTrainerMediaFile(trainer.photo_url);
      }
      res.status(201).json(result);
    } catch (error: any) {
      uploadedFiles.forEach((file) => removeTrainerMediaFile(trainerMediaUrl(file.filename)));
      throw new AppError(400, error.message);
    }
  }

  static async removeProfileMedia(req: Request, res: Response) {
    try {
      const { url, kind } = req.body as { url?: unknown; kind?: unknown };
      if (typeof url !== 'string' || (kind !== 'photo' && kind !== 'gallery')) {
        throw new AppError(400, 'Не удалось определить медиафайл для удаления.');
      }

      const result = await TrainerService.removeProfileMedia(req.user!.userId, url, kind);
      removeTrainerMediaFile(url);
      res.json(result);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(400, error.message);
    }
  }

  static async updateTrainer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const trainer = await TrainerService.updateTrainer(id, req.body);
      
      res.json(trainer);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async deleteTrainer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await TrainerService.deleteTrainer(id);
      
      res.json({ message: 'Trainer deleted successfully' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async setTrainerPublished(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { is_published } = req.body;
      const trainer = await TrainerService.setTrainerPublished(id, is_published);
      
      res.json(trainer);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
