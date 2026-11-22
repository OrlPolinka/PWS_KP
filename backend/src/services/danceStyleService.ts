import { DanceStyleRecord, DanceStyleRepository } from '../repositories/danceStyleRepository';

type DanceStyleInput = Pick<DanceStyleRecord, 'name' | 'description' | 'difficulty'>;

export class DanceStyleService {
  static async getById(id: number, includeArchived = false): Promise<DanceStyleRecord> {
    const style = await DanceStyleRepository.findById(id);
    if (!style || (!style.is_active && !includeArchived)) throw new Error('Стиль танца не найден');
    return style;
  }

  static async getAll(includeArchived = false): Promise<DanceStyleRecord[]> {
    return DanceStyleRepository.findAll(includeArchived);
  }

  static async create(data: DanceStyleInput): Promise<DanceStyleRecord> {
    this.validate(data);
    return DanceStyleRepository.create({ ...data, name: data.name.trim(), description: data.description?.trim() || undefined });
  }

  static async update(id: number, data: Partial<DanceStyleInput>): Promise<DanceStyleRecord> {
    const current = await DanceStyleRepository.findById(id);
    if (!current) throw new Error('Стиль танца не найден');
    this.validate({
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      difficulty: data.difficulty ?? current.difficulty,
    });
    const updated = await DanceStyleRepository.update(id, {
      ...data,
      name: data.name?.trim(),
      description: data.description?.trim(),
    });
    if (!updated) throw new Error('Не удалось изменить стиль танца');
    return updated;
  }

  static async remove(id: number): Promise<void> {
    const current = await DanceStyleRepository.findById(id);
    if (!current) throw new Error('Стиль танца не найден');
    if (!current.is_active) return;
    const archived = await DanceStyleRepository.setActive(id, false);
    if (!archived) throw new Error('Не удалось переместить стиль в архив');
  }

  static async setActive(id: number, isActive: boolean): Promise<DanceStyleRecord> {
    if (typeof isActive !== 'boolean') throw new Error('Некорректный статус стиля');
    const current = await DanceStyleRepository.findById(id);
    if (!current) throw new Error('Стиль танца не найден');
    const updated = await DanceStyleRepository.setActive(id, isActive);
    if (!updated) throw new Error('Не удалось изменить статус стиля');
    return updated;
  }

  static async permanentlyDelete(id: number): Promise<void> {
    const current = await DanceStyleRepository.findById(id);
    if (!current) throw new Error('Стиль танца не найден');
    if (current.is_active) throw new Error('Сначала переместите стиль в архив');
    await DanceStyleRepository.delete(id);
  }

  private static validate(data: DanceStyleInput) {
    if (!data.name?.trim()) throw new Error('Укажите название стиля');
    if (!['beginner', 'intermediate', 'advanced'].includes(data.difficulty)) {
      throw new Error('Выберите корректный уровень сложности');
    }
  }
}