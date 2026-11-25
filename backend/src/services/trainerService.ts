import { ScheduleRepository, TrainerRepository, UserRepository } from '../repositories';
import { TrainerProfile } from '../types';

export class TrainerService {
  private static validateExperience(experienceYears: number | null | undefined): void {
    if (
      experienceYears !== undefined &&
      experienceYears !== null &&
      (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 70)
    ) {
      throw new Error('Опыт тренера должен быть целым числом от 0 до 70 лет');
    }
  }

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
    this.validateExperience(data.experience_years);
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
      photo_url: data.photo_url ?? undefined,
      video_url: data.video_url ?? undefined,
      gallery: data.gallery,
      certificates: data.certificates,
      social_links: data.social_links,
      custom_page_title: data.custom_page_title,
      custom_page_content: data.custom_page_content,
    });

    return trainer;
  }

  static async updateTrainer(id: string, data: Partial<TrainerProfile>): Promise<TrainerProfile> {
    this.validateExperience(data.experience_years);
    const trainer = await TrainerRepository.findById(id);
    if (!trainer) {
      throw new Error('Trainer not found');
    }
    if (data.specialization !== undefined) {
      await ScheduleRepository.validateTrainerSpecialization(id, data.specialization);
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
    if (trainer.is_published) {
      throw new Error('Сначала переместите профиль тренера в архив');
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

  static async saveProfileMedia(userId: string, photoUrl: string | undefined, mediaUrls: string[]): Promise<TrainerProfile> {
    const trainer = await TrainerRepository.findByUserId(userId);
    if (!trainer) throw new Error('Trainer profile not found');
    const data: Partial<TrainerProfile> = {};
    if (photoUrl !== undefined) data.photo_url = photoUrl;
    if (mediaUrls.length) {
      const gallery = Array.isArray(trainer.gallery) ? trainer.gallery : [];
      data.gallery = [...gallery, ...mediaUrls];
    }
    return TrainerService.updateTrainer(trainer.id, data);
  }

  static async removeProfileMedia(userId: string, mediaUrl: string, kind: 'photo' | 'gallery'): Promise<TrainerProfile> {
    const trainer = await TrainerRepository.findByUserId(userId);
    if (!trainer) throw new Error('Trainer profile not found');

    if (kind === 'photo') {
      if (trainer.photo_url !== mediaUrl) throw new Error('Фото профиля не найдено');
      return TrainerService.updateTrainer(trainer.id, { photo_url: null });
    }

    const gallery = Array.isArray(trainer.gallery) ? trainer.gallery : [];
    const filteredGallery = gallery.filter((item) =>
      (typeof item === 'string' ? item : item?.url) !== mediaUrl
    );
    if (filteredGallery.length === gallery.length) {
      if (trainer.video_url !== mediaUrl) throw new Error('Медиафайл не найден');
      return TrainerService.updateTrainer(trainer.id, { video_url: null });
    }
    return TrainerService.updateTrainer(trainer.id, { gallery: filteredGallery });
  }

  static async setTrainerPublished(id: string, isPublished: boolean): Promise<TrainerProfile> {
    if (typeof isPublished !== 'boolean') {
      throw new Error('Некорректный статус публикации профиля тренера');
    }
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
