import { MessageRepository, UserRepository } from '../repositories';
import { Message } from '../types';

export class MessageService {
  static async getContacts(userId: string, search = '', role?: string) {
    const allowedRoles = ['admin', 'trainer', 'client'];
    if (role && !allowedRoles.includes(role)) {
      throw new Error('Invalid role filter');
    }

    return MessageRepository.getContacts(userId, search.trim().slice(0, 100), role);
  }

  static async getMessageById(id: number): Promise<Message> {
    const message = await MessageRepository.findById(id);
    if (!message) {
      throw new Error('Message not found');
    }
    return message;
  }

  static async sendMessage(data: {
    sender_id: string;
    receiver_id: string;
    content: string;
  }): Promise<Message> {
    if (data.sender_id === data.receiver_id) {
      throw new Error('Cannot send message to yourself');
    }

    const sender = await UserRepository.findById(data.sender_id);
    if (!sender) {
      throw new Error('Sender not found');
    }

    const receiver = await UserRepository.findById(data.receiver_id);
    if (!receiver) {
      throw new Error('Receiver not found');
    }

    if (!sender.is_active || !receiver.is_active) {
      throw new Error('One or both users are not active');
    }

    if (!data.content || data.content.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    if (data.content.trim().length > 5000) {
      throw new Error('Message cannot exceed 5000 characters');
    }

    const message = await MessageRepository.create(data);
    return message;
  }

  static async editMessage(id: number, senderId: string, content: string): Promise<Message> {
    const message = await MessageRepository.findById(id);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender_id !== senderId) {
      throw new Error('Only sender can edit their own messages');
    }

    if (!content || content.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    if (content.trim().length > 5000) {
      throw new Error('Message cannot exceed 5000 characters');
    }

    const updated = await MessageRepository.update(id, { content });
    if (!updated) {
      throw new Error('Failed to edit message');
    }

    return updated;
  }

  static async getDialog(userId1: string, userId2: string, limit?: number): Promise<Message[]> {
    const user1 = await UserRepository.findById(userId1);
    const user2 = await UserRepository.findById(userId2);

    if (!user1 || !user2) {
      throw new Error('One or both users not found');
    }

    return MessageRepository.getDialog(userId1, userId2, limit);
  }

  static async getUserConversations(userId: string): Promise<any[]> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return MessageRepository.getUserConversations(userId);
  }

  static async markMessageAsRead(id: number, userId: string): Promise<Message> {
    const message = await MessageRepository.findById(id);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.receiver_id !== userId) {
      throw new Error('Only receiver can mark message as read');
    }

    const updated = await MessageRepository.markAsRead(id);
    if (!updated) {
      throw new Error('Failed to mark message as read');
    }

    return updated;
  }

  static async markConversationAsRead(userId1: string, userId2: string): Promise<void> {
    const user1 = await UserRepository.findById(userId1);
    const user2 = await UserRepository.findById(userId2);

    if (!user1 || !user2) {
      throw new Error('One or both users not found');
    }

    await MessageRepository.markConversationAsRead(userId1, userId2);
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return MessageRepository.getUnreadCount(userId);
  }

  static async deleteMessage(id: number, senderId: string): Promise<void> {
    const message = await MessageRepository.findById(id);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender_id !== senderId) {
      throw new Error('Only sender can delete their own messages');
    }

    const deleted = await MessageRepository.delete(id, senderId);
    if (!deleted) {
      throw new Error('Failed to delete message');
    }
  }
}
