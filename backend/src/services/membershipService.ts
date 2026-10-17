import { MembershipRepository, MembershipTypeRepository, UserRepository } from '../repositories';
import { Membership } from '../types';

export class MembershipService {
  static async getMembershipById(id: string): Promise<Membership> {
    const membership = await MembershipRepository.findById(id);
    if (!membership) {
      throw new Error('Membership not found');
    }
    return membership;
  }

  static async getClientMemberships(clientId: string, filters?: { status?: string }): Promise<Membership[]> {
    const user = await UserRepository.findById(clientId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'client') {
      throw new Error('User must be a client');
    }

    return MembershipRepository.findByClientId(clientId, filters);
  }

  static async getActiveClientMemberships(clientId: string): Promise<Membership[]> {
    return MembershipRepository.findActiveByClientId(clientId);
  }

  static async requestMembershipExtension(
    membershipId: string,
    clientId: string,
    quantity: number,
    unit: 'days' | 'visits',
    reason: string
  ): Promise<any> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Укажите положительное целое количество дней или занятий.');
    }
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 1000) {
      throw new Error('Укажите причину продления (от 3 до 1000 символов).');
    }
    return MembershipRepository.requestExtension(membershipId, clientId, quantity, unit, reason);
  }

  static async getExtensionRequests(filters?: { status?: string; client_id?: string }): Promise<any[]> {
    return MembershipRepository.findExtensionRequests(filters);
  }

  static async approveExtensionRequest(
    requestId: string,
    reviewedBy: string,
    adminComment?: string
  ): Promise<any> {
    return MembershipRepository.updateExtensionRequest(
      requestId,
      'approved',
      reviewedBy,
      adminComment
    );
  }

  static async rejectExtensionRequest(
    requestId: string,
    reviewedBy: string,
    adminComment?: string
  ): Promise<any> {
    return MembershipRepository.updateExtensionRequest(
      requestId,
      'rejected',
      reviewedBy,
      adminComment
    );
  }

  static async cancelMembership(id: string): Promise<Membership> {
    const membership = await MembershipRepository.findById(id);
    if (!membership) {
      throw new Error('Membership not found');
    }

    if (membership.status !== 'active') {
      throw new Error('Membership is not active');
    }

    const updated = await MembershipRepository.update(id, { status: 'cancelled' });
    if (!updated) {
      throw new Error('Failed to cancel membership');
    }

    return updated;
  }
}
