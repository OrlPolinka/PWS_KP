import { UserRepository } from '../repositories';
import { User, UserRole } from '../types';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';

export class UserService {
  static async getUserById(id: string): Promise<User> {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  static async getAllUsers(filters?: { role?: UserRole; is_active?: boolean }): Promise<User[]> {
    return UserRepository.findAll(filters);
  }

  static async createUserByAdmin(data: {
    email: string;
    password: string;
    role: UserRole;
    full_name: string;
    phone?: string;
    createdBy: string;
  }): Promise<User> {
    const existingUser = await UserRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Admin cannot create another admin with the same ID (themselves)
    if (data.role === 'admin' && data.createdBy === data.email) {
      throw new Error('Admin cannot create themselves');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await UserRepository.create({
      email: data.email,
      password_hash: passwordHash,
      role: data.role,
      full_name: data.full_name,
      phone: data.phone,
    });

    // Generate QR code for clients
    if (data.role === 'client') {
      await this.generateQRCode(user.id);
    }

    return user;
  }

  static async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await UserRepository.update(id, data);
    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    return updatedUser;
  }

  static async deleteUser(id: string): Promise<void> {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const deleted = await UserRepository.delete(id);
    if (!deleted) {
      throw new Error('Failed to delete user');
    }
  }

  static async deactivateUser(id: string): Promise<User> {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const deactivated = await UserRepository.deactivate(id);
    if (!deactivated) {
      throw new Error('Failed to deactivate user');
    }

    return deactivated;
  }

  static async activateUser(id: string): Promise<User> {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const activated = await UserRepository.activate(id);
    if (!activated) {
      throw new Error('Failed to activate user');
    }

    return activated;
  }

  static async generateQRCode(userId: string): Promise<string> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate QR token if it doesn't exist
    if (!user.qr_token) {
      const qrToken = Math.floor(100000 + Math.random() * 900000).toString();
      await UserRepository.update(userId, { qr_token: qrToken });
      user.qr_token = qrToken;
    }

    const qrCodeDataUrl = await QRCode.toDataURL(user.qr_token.toString());
    return qrCodeDataUrl;
  }

  static async getUserByQRToken(qrToken: string): Promise<User> {
    const user = await UserRepository.findByQrToken(qrToken);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  static async getUserByClientCode(clientCode: string): Promise<User> {
    const user = await UserRepository.findByClientCode(clientCode);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
