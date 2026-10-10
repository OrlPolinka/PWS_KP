import { Request, Response } from 'express';
import { MembershipService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class MembershipController {
  static async getClientMemberships(req: Request, res: Response) {
    try {
      const { client_id } = req.params;
      const { status } = req.query;
      const memberships = await MembershipService.getClientMemberships(client_id, {
        status: status as string,
      });
      
      res.json(memberships);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getMyMemberships(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { status } = req.query;
      const memberships = await MembershipService.getClientMemberships(userId, {
        status: status as string,
      });
      
      res.json(memberships);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async purchaseMembership(req: Request, res: Response) {
    try {
      const client_id = req.user!.userId;
      const { membership_type_id, payment_id } = req.body;
      const membership = await MembershipService.purchaseMembership({
        client_id,
        membership_type_id,
        payment_id,
      });
      
      res.status(201).json(membership);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async requestExtension(req: Request, res: Response) {
    try {
      const { membership_id } = req.params;
      const { requested_days, reason } = req.body;
      const request = await MembershipService.requestMembershipExtension(
        membership_id,
        requested_days,
        reason
      );
      
      res.status(201).json(request);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getExtensionRequests(req: Request, res: Response) {
    try {
      const { status, client_id } = req.query;
      const requests = await MembershipService.getExtensionRequests({
        status: status as string,
        client_id: client_id as string,
      });
      
      res.json(requests);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async approveExtensionRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { admin_comment } = req.body;
      const reviewedBy = req.user!.userId;
      const request = await MembershipService.approveExtensionRequest(id, reviewedBy, admin_comment);
      
      res.json(request);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async rejectExtensionRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { admin_comment } = req.body;
      const reviewedBy = req.user!.userId;
      const request = await MembershipService.rejectExtensionRequest(id, reviewedBy, admin_comment);
      
      res.json(request);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async cancelMembership(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const membership = await MembershipService.cancelMembership(id);
      
      res.json(membership);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
