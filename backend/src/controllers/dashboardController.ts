import { Request, Response } from 'express';
import { DashboardService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class DashboardController {
  static async getDashboard(req: Request, res: Response) {
    try {
      const dashboard = await DashboardService.getDashboard(req.user!.userId, req.user!.role);
      res.json(dashboard);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load dashboard';
      throw new AppError(500, message);
    }
  }
}
