import { Request, Response } from 'express';
import { TrainerService } from '../services';
import { AppError } from '../middleware/errorHandler';

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
    try {
      const files = (req.files || []) as Express.Multer.File[];
      const mediaUrls = files.map((file) => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
      res.status(201).json(await TrainerService.addProfileMedia(req.user!.userId, mediaUrls));
    } catch (error: any) {
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
