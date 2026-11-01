import { Request, Response } from 'express';
import { AttendanceService } from '../services';
import { TrainerService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class AttendanceController {
  static async markAttendance(req: Request, res: Response) {
    try {
      const trainer = await TrainerService.getTrainerByUserId(req.user!.userId);
      const attendance = await AttendanceService.markAttendance({
        ...req.body,
        trainer_id: trainer.id,
      });
      
      res.status(201).json(attendance);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getAttendanceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const attendance = await AttendanceService.getAttendanceById(parseInt(id));
      
      res.json(attendance);
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async getTrainerAttendance(req: Request, res: Response) {
    try {
      const { trainer_id } = req.params;
      const { date_from, date_to } = req.query;
      const attendance = await AttendanceService.getTrainerAttendance(trainer_id, {
        date_from: date_from ? new Date(date_from as string) : undefined,
        date_to: date_to ? new Date(date_to as string) : undefined,
      });
      
      res.json(attendance);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getMyAttendance(req: Request, res: Response) {
    try {
      const trainer = await TrainerService.getTrainerByUserId(req.user!.userId);
      const { date_from, date_to } = req.query;
      const attendance = await AttendanceService.getTrainerAttendance(trainer.id, {
        date_from: date_from ? new Date(date_from as string) : undefined,
        date_to: date_to ? new Date(date_to as string) : undefined,
      });
      
      res.json(attendance);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async updateAttendance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const attendance = await AttendanceService.updateAttendance(
        parseInt(id, 10),
        req.user!.userId,
        req.body
      );
      
      res.json(attendance);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
