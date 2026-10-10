import { TrainerRepository, UserRepository } from '../repositories';
import { TrainerProfile } from '../types';

export class TrainerService {
  static async getTrainerById(id: string, includeUnpublished = false): Promise<TrainerProfile> {
    const trainer = await TrainerRepository.findById(id);
    if (!trainer || !trainer.is_active || (!includeUnpublished && !trainer.is_published)) {
      throw new Error('Trainer not found');
    }
    return trainer;
  }

  static async getTrainerByUserId(userId: string): Promise<TrainerProfile> {
    const trainer = await TrainerRepository.findByUserId(userId);
    if (!trainer) {
      throw new Error('Trainer profile not found');
    }
    return trainer;
  }

  static async getAllTrainers(filters?: { is_published?: boolean }): Promise<any[]> {
    return TrainerRepository.findAll(filters);
  }

  static async createTrainer(userId: string, data: Partial<TrainerProfile>): Promise<TrainerProfile> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'trainer') {
      throw new Error('User must have trainer role');
    }

    const existing = await TrainerRepository.findByUserId(userId);
    if (existing) {
      throw new Error('Trainer profile already exists');
    }

    const trainer = await TrainerRepository.create({
      user_id: userId,
      specialization: data.specialization,
      bio: data.bio,
      experience_years: data.experience_years,
      education: data.education,
      achievements: data.achievements,
      photo_url: data.photo_url,
      video_url: data.video_url,
      gallery: data.gallery,
      certificates: data.certificates,
      social_links: data.social_links,
      custom_page_title: data.custom_page_title,
      custom_page_content: data.custom_page_content,
    });

    return trainer;
  }

  static async updateTrainer(id: string, data: Partial<TrainerProfile>): Promise<TrainerProfile> {
    const trainer = await TrainerRepository.findById(id);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    const allowedData: Partial<TrainerProfile> = {
      specialization: data.specialization,
      bio: data.bio,
      experience_years: data.experience_years,
      education: data.education,
      achievements: data.achievements,
      photo_url: data.photo_url,
      video_url: data.video_url,
      gallery: data.gallery,
      certificates: data.certificates,
      social_links: data.social_links,
      custom_page_title: data.custom_page_title,
      custom_page_content: data.custom_page_content,
    };
    const updated = await TrainerRepository.update(id, allowedData);
    if (!updated) {
      throw new Error('Failed to update trainer');
    }

    return (await TrainerRepository.findById(id)) || updated;
  }

  static async deleteTrainer(id: string): Promise<void> {
    const trainer = await TrainerRepository.findById(id);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    await TrainerRepository.delete(id);
  }

  static async getMyProfile(userId: string): Promise<TrainerProfile> {
    return TrainerService.getTrainerByUserId(userId);
  }

  static async updateMyProfile(userId: string, data: Partial<TrainerProfile>): Promise<TrainerProfile> {
    const trainer = await TrainerRepository.findByUserId(userId);
    if (!trainer) throw new Error('Trainer profile not found');
    return TrainerService.updateTrainer(trainer.id, data);
  }

  static async addProfileMedia(userId: string, mediaUrls: string[]): Promise<TrainerProfile> {
    const trainer = await TrainerRepository.findByUserId(userId);
    if (!trainer) throw new Error('Trainer profile not found');
    const gallery = Array.isArray(trainer.gallery) ? trainer.gallery : [];
    return TrainerService.updateTrainer(trainer.id, { gallery: [...gallery, ...mediaUrls] });
  }

  static async setTrainerPublished(id: string, isPublished: boolean): Promise<TrainerProfile> {
    const trainer = await TrainerRepository.findById(id);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    const updated = await TrainerRepository.setPublished(id, isPublished);
    if (!updated) {
      throw new Error('Failed to update trainer publication status');
    }

    return updated;
  }
}
