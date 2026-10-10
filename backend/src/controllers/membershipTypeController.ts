import { Request, Response } from 'express';
import { MembershipTypeService } from '../services';
import { AppError } from '../middleware/errorHandler';

export class MembershipTypeController {
  static async getAllMembershipTypes(req: Request, res: Response) {
    try {
      const { is_active } = req.query;
      const types = await MembershipTypeService.getAllMembershipTypes({
        is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      });
      
      res.json(types);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async getMembershipTypeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const type = await MembershipTypeService.getMembershipTypeById(parseInt(id));
      
      res.json(type);
    } catch (error: any) {
      throw new AppError(404, error.message);
    }
  }

  static async createMembershipType(req: Request, res: Response) {
    try {
      const type = await MembershipTypeService.createMembershipType(req.body);
      
      res.status(201).json(type);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async updateMembershipType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const type = await MembershipTypeService.updateMembershipType(parseInt(id), req.body);
      
      res.json(type);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async deleteMembershipType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await MembershipTypeService.deleteMembershipType(parseInt(id));
      
      res.json({ message: 'Membership type deleted successfully' });
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }

  static async setMembershipTypeActive(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const type = await MembershipTypeService.setMembershipTypeActive(parseInt(id), is_active);
      
      res.json(type);
    } catch (error: any) {
      throw new AppError(400, error.message);
    }
  }
}
