import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories';
import { config } from '../config';
import { User, UserRole, JwtPayload } from '../types';
import { UserService } from './userService';

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    role: UserRole;
    full_name: string;
    phone?: string;
  }): Promise<{ user: User; token: string }> {
    // Only clients can register
    if (data.role !== 'client') {
      throw new Error('Registration is only available for clients');
    }

    const existingUser = await UserRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await UserRepository.create({
      email: data.email,
      password_hash: passwordHash,
      role: data.role,
      full_name: data.full_name,
      phone: data.phone,
    });

    // Generate QR code once at registration
    await UserService.generateQRCode(user.id);

    const token = this.generateToken(user);
    return { user, token };
  }

  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    if (user.password_hash === '') {
      throw new Error('Please login with Google OAuth');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  static async googleLogin(profile: {
    email: string;
    name: string;
    picture?: string;
  }): Promise<{ user: User; token: string; isNewUser: boolean }> {
    let user = await UserRepository.findByEmail(profile.email);

    if (user) {
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }
      const token = this.generateToken(user);
      return { user, token, isNewUser: false };
    }

    user = await UserRepository.createGoogleUser({
      email: profile.email,
      role: 'client',
      full_name: profile.name,
      photo_url: profile.picture,
    });

    // Generate QR code once at registration for Google users
    await UserService.generateQRCode(user.id);

    const token = this.generateToken(user);
    return { user, token, isNewUser: true };
  }

  static generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
    });
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  }

  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.password_hash === '') {
      throw new Error('Cannot change password for Google OAuth users');
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid old password');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await UserRepository.updatePassword(userId, newPasswordHash);
  }

  static async setGooglePassword(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 10);
    await UserRepository.updatePassword(userId, passwordHash);
  }
}
