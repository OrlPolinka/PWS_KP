import { Request, Response } from 'express';
import { BookingService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class BookingController {
  static async getClientBookings(req: Request, res: Response) {
    try {
      const { client_id } = req.params;
      const { status } = req.query;
      const bookings = await BookingService.getClientBookings(client_id, {
        status: status as string,
      });
      
      res.json(bookings);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getMyBookings(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { status } = req.query;
      const bookings = await BookingService.getClientBookings(userId, {
        status: status as string,
      });
      
      res.json(bookings);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getScheduleBookings(req: Request, res: Response) {
    try {
      const { schedule_id } = req.params;
      const bookings = await BookingService.getScheduleBookings(schedule_id);
      
      res.json(bookings);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async createBooking(req: Request, res: Response) {
    try {
      const client_id = req.user!.userId;
      const { schedule_id, membership_id, class_date } = req.body;
      const booking = await BookingService.createBooking({
        client_id,
        schedule_id,
        membership_id,
        class_date,
      });
      
      res.status(201).json(booking);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async cancelBooking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cancelledBy = req.user!.userId;
      const booking = await BookingService.cancelBooking(id, cancelledBy);
      
      res.json(booking);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async checkInBooking(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const checkedInBy = req.user!.userId;
      const booking = await BookingService.checkInBooking(id, checkedInBy);
      
      res.json(booking);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getClientVisitHistory(req: Request, res: Response) {
    try {
      const { client_id } = req.params;
      const { limit } = req.query;
      const history = await BookingService.getClientVisitHistory(
        client_id,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json(history);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getMyVisitHistory(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { limit } = req.query;
      const history = await BookingService.getClientVisitHistory(
        userId,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json(history);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
