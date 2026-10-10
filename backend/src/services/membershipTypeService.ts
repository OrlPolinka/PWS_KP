import { DanceStyleRepository, MembershipTypeRepository } from '../repositories';
import { MembershipType } from '../types';

export class MembershipTypeService {
  static async getMembershipTypeById(id: number): Promise<MembershipType> {
    const type = await MembershipTypeRepository.findById(id);
    if (!type) {
      throw new Error('Membership type not found');
    }
    return type;
  }

  static async getAllMembershipTypes(filters?: { is_active?: boolean }): Promise<MembershipType[]> {
    return MembershipTypeRepository.findAll(filters);
  }

  static async createMembershipType(data: {
    name: string;
    description?: string;
    price: number;
    visit_count?: number | null;
    duration_days: number;
    dance_style_id?: number | null;
  }): Promise<MembershipType> {
    this.validate(data);
    await this.validateDanceStyle(data.dance_style_id);

    const type = await MembershipTypeRepository.create(data);
    return type;
  }

  private static validate(data: {
    name?: string;
    price?: number;
    visit_count?: number | null;
    duration_days?: number;
  }) {
    if (data.name !== undefined && !data.name.trim()) throw new Error('Name cannot be empty');
    if (data.price !== undefined && (!Number.isFinite(Number(data.price)) || data.price < 0)) {
      throw new Error('Price must be non-negative');
    }
    if (data.visit_count !== undefined && data.visit_count !== null && data.visit_count <= 0) {
      throw new Error('Visit count must be positive or null for unlimited');
    }
    if (data.duration_days !== undefined && (!Number.isInteger(Number(data.duration_days)) || data.duration_days <= 0)) {
      throw new Error('Duration must be positive');
    }
  }

  static async updateMembershipType(id: number, data: Partial<MembershipType>): Promise<MembershipType> {
    const type = await MembershipTypeRepository.findById(id);
    if (!type) {
      throw new Error('Membership type not found');
    }

    this.validate(data);
    if (data.dance_style_id !== undefined) await this.validateDanceStyle(data.dance_style_id);

    const updated = await MembershipTypeRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update membership type');
    }

    return updated;
  }

  private static async validateDanceStyle(styleId?: number | null) {
    if (styleId == null) return;
    const style = await DanceStyleRepository.findById(styleId);
    if (!style || !style.is_active) throw new Error('Выбранное направление не найдено или удалено');
  }

  static async deleteMembershipType(id: number): Promise<void> {
    const type = await MembershipTypeRepository.findById(id);
    if (!type) {
      throw new Error('Membership type not found');
    }

    const updated = await MembershipTypeRepository.setActive(id, false);
    if (!updated) throw new Error('Failed to archive membership type');
  }

  static async setMembershipTypeActive(id: number, isActive: boolean): Promise<MembershipType> {
    const type = await MembershipTypeRepository.findById(id);
    if (!type) {
      throw new Error('Membership type not found');
    }

    const updated = await MembershipTypeRepository.setActive(id, isActive);
    if (!updated) {
      throw new Error('Failed to update membership type status');
    }

    return updated;
  }
}
