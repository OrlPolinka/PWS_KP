import { Request, Response } from 'express';
import { ScheduleService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class ScheduleController {
  static async getAllSchedules(req: Request, res: Response) {
    try {
      const { trainer_id, day_of_week, dance_style_id, status } = req.query;
      const schedules = await ScheduleService.getAllSchedules({
        trainer_id: trainer_id as string,
        day_of_week: day_of_week ? Number(day_of_week) : undefined,
        dance_style_id: dance_style_id ? Number(dance_style_id) : undefined,
        status: status as string,
      });
      
      res.json(schedules);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getOptions(req: Request, res: Response) {
    try {
      res.json(await ScheduleService.getOptions());
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getScheduleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const schedule = await ScheduleService.getScheduleById(id);
      
      res.json(schedule);
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async createSchedule(req: Request, res: Response) {
    try {
      const created_by = req.user!.userId;
      const schedule = await ScheduleService.createSchedule({
        ...req.body,
        created_by,
      });
      
      res.status(201).json(schedule);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async updateSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const schedule = await ScheduleService.updateSchedule(id, req.body);
      
      res.json(schedule);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async deleteSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ScheduleService.deleteSchedule(id);
      
      res.json({ message: 'Schedule deleted successfully' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async cancelSchedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const schedule = await ScheduleService.cancelSchedule(id, reason);
      
      res.json(schedule);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getTrainerSchedule(req: Request, res: Response) {
    try {
      const { trainer_id } = req.params;
      const schedules = await ScheduleService.getTrainerSchedule(trainer_id);
      
      res.json(schedules);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async checkScheduleCapacity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const classDate = String(req.query.class_date || '');
      const capacity = await ScheduleService.checkScheduleCapacity(id, classDate);
      
      res.json(capacity);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
