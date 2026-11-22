import { Request, Response } from 'express';
import { DanceStyleService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class DanceStyleController {
  static async getById(req: Request, res: Response) {
    try {
      res.json(await DanceStyleService.getById(Number(req.params.id), req.user?.role === 'admin'));
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      res.json(await DanceStyleService.getAll(req.user?.role === 'admin'));
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async create(req: Request, res: Response) {
    try {
      res.status(201).json(await DanceStyleService.create(req.body));
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async update(req: Request, res: Response) {
    try {
      res.json(await DanceStyleService.update(Number(req.params.id), req.body));
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      await DanceStyleService.remove(Number(req.params.id));
      res.json({ message: 'Стиль танца перемещён в архив' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async setActive(req: Request, res: Response) {
    try {
      res.json(await DanceStyleService.setActive(Number(req.params.id), req.body.is_active));
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async permanentlyDelete(req: Request, res: Response) {
    try {
      await DanceStyleService.permanentlyDelete(Number(req.params.id));
      res.json({ message: 'Стиль танца удалён насовсем' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}