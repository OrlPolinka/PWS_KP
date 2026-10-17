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
    requestedDays: number,
    reason?: string
  ): Promise<any> {
    const membership = await MembershipRepository.findById(membershipId);
    if (!membership) {
      throw new Error('Membership not found');
    }

    if (membership.status !== 'active') {
      throw new Error('Membership must be active to request extension');
    }

    if (requestedDays <= 0) {
      throw new Error('Requested days must be positive');
    }

    const request = await MembershipRepository.requestExtension(membershipId, requestedDays, reason);
    return request;
  }

  static async getExtensionRequests(filters?: { status?: string; client_id?: string }): Promise<any[]> {
    return MembershipRepository.findExtensionRequests(filters);
  }

  static async approveExtensionRequest(
    requestId: string,
    reviewedBy: string,
    adminComment?: string
  ): Promise<any> {
    const request = await MembershipRepository.findExtensionRequests();
    const targetRequest = request.find(r => r.id === requestId);
    
    if (!targetRequest) {
      throw new Error('Extension request not found');
    }

    if (targetRequest.status !== 'pending') {
      throw new Error('Request has already been processed');
    }

    const updated = await MembershipRepository.updateExtensionRequest(
      requestId,
      'approved',
      reviewedBy,
      adminComment
    );

    return updated;
  }

  static async rejectExtensionRequest(
    requestId: string,
    reviewedBy: string,
    adminComment?: string
  ): Promise<any> {
    const request = await MembershipRepository.findExtensionRequests();
    const targetRequest = request.find(r => r.id === requestId);
    
    if (!targetRequest) {
      throw new Error('Extension request not found');
    }

    if (targetRequest.status !== 'pending') {
      throw new Error('Request has already been processed');
    }

    const updated = await MembershipRepository.updateExtensionRequest(
      requestId,
      'rejected',
      reviewedBy,
      adminComment
    );

    return updated;
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
