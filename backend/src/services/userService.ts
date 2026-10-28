import { UserRepository } from '../repositories';
import { User, UserRole } from '../types';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

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

  static async updateMyProfile(
    userId: string,
    data: { full_name?: unknown; email?: unknown; phone?: unknown; current_password?: unknown; new_password?: unknown },
    photoUrl?: string
  ): Promise<User> {
    const user = await this.getUserById(userId);
    const fullName = typeof data.full_name === 'string' ? data.full_name.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const rawPhone = typeof data.phone === 'string' ? data.phone.trim() : '';
    const phone = rawPhone.replace(/[\s\u00a0\u202f().-]/g, '');

    if (fullName.length < 2 || fullName.length > 100) {
      throw new Error('Имя должно содержать от 2 до 100 символов.');
    }
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    ) {
      throw new Error('Введите корректный адрес электронной почты.');
    }
    if (
      phone &&
      (!/^\+?\d+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)
    ) {
      throw new Error('Введите корректный номер телефона (от 7 до 15 цифр).');
    }

    const existingEmailUser = await UserRepository.findByEmail(email);
    if (existingEmailUser && existingEmailUser.id !== userId) {
      throw new Error('Этот адрес электронной почты уже используется.');
    }

    const updateData: Partial<User> = { full_name: fullName, email, phone };
    if (photoUrl) updateData.photo_url = photoUrl;

    const newPassword = typeof data.new_password === 'string' ? data.new_password : '';
    if (newPassword) {
      if (newPassword.length < 8 || newPassword.length > 128) {
        throw new Error('Новый пароль должен содержать от 8 до 128 символов.');
      }

      if (user.password_hash) {
        const currentPassword = typeof data.current_password === 'string' ? data.current_password : '';
        if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password_hash))) {
          throw new Error('Текущий пароль указан неверно.');
        }
      }
      updateData.password_hash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await UserRepository.update(userId, updateData);
    if (!updatedUser) throw new Error('Не удалось сохранить профиль.');
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

    if (user.role !== 'client') {
      throw new Error('QR code is only available for clients');
    }

    if (!user.qr_token) {
      const qrToken = randomUUID();
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
