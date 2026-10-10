import { ScheduleRepository } from '../repositories';
import { Schedule } from '../types';

export class ScheduleService {
  static async getScheduleById(id: string): Promise<Schedule> {
    const schedule = await ScheduleRepository.findById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    return schedule;
  }

  static async getAllSchedules(filters?: {
    trainer_id?: string;
    day_of_week?: number;
    dance_style_id?: number;
    status?: string;
  }): Promise<Schedule[]> {
    return ScheduleRepository.findAll(filters);
  }

  static async createSchedule(data: {
    trainer_id: string;
    hall_id: number;
    dance_style_id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_capacity: number;
    created_by: string;
  }): Promise<Schedule> {
    this.validateSlot(data.day_of_week, data.start_time, data.end_time, data.max_capacity);
    if (await ScheduleRepository.hasConflict(data)) {
      throw new Error('Тренер или зал уже занят в это время');
    }

    const schedule = await ScheduleRepository.create(data);
    return schedule;
  }

  static async updateSchedule(id: string, data: Partial<Schedule>): Promise<Schedule> {
    const schedule = await ScheduleRepository.findById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    this.validateSlot(data.day_of_week ?? schedule.day_of_week, data.start_time ?? schedule.start_time,
      data.end_time ?? schedule.end_time, data.max_capacity ?? schedule.max_capacity);
    const nextValues = {
      trainer_id: data.trainer_id ?? schedule.trainer_id,
      hall_id: data.hall_id ?? schedule.hall_id,
      day_of_week: data.day_of_week ?? schedule.day_of_week,
      start_time: data.start_time ?? schedule.start_time,
      end_time: data.end_time ?? schedule.end_time,
    };
    if (await ScheduleRepository.hasConflict(nextValues, id)) {
      throw new Error('Тренер или зал уже занят в это время');
    }

    const updated = await ScheduleRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update schedule');
    }

    return updated;
  }

  static async deleteSchedule(id: string): Promise<void> {
    const schedule = await ScheduleRepository.findById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const cancelled = await ScheduleRepository.update(id, {
      status: 'cancelled',
      cancel_reason: 'Занятие удалено из недельного расписания',
    });
    if (!cancelled) throw new Error('Failed to remove schedule');
  }

  static async cancelSchedule(id: string, reason?: string): Promise<Schedule> {
    const schedule = await ScheduleRepository.findById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (schedule.status === 'cancelled') {
      throw new Error('Schedule is already cancelled');
    }

    const updated = await ScheduleRepository.update(id, {
      status: 'cancelled',
      cancel_reason: reason,
    });

    if (!updated) {
      throw new Error('Failed to cancel schedule');
    }

    return updated;
  }

  static async getTrainerSchedule(trainerId: string): Promise<Schedule[]> {
    return ScheduleRepository.getTrainerSchedule(trainerId);
  }

  static async getOptions() {
    return ScheduleRepository.getOptions();
  }

  static async checkScheduleCapacity(scheduleId: string, classDate: string): Promise<{ current: number; max: number }> {
    return ScheduleRepository.checkCapacity(scheduleId, classDate);
  }

  private static validateSlot(dayOfWeek: number, startTime: string, endTime: string, capacity: number) {
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
      throw new Error('Day of week must be between 1 (Monday) and 7 (Sunday)');
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(startTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(endTime) || startTime >= endTime) {
      throw new Error('Class end time must be after start time');
    }
    if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
      throw new Error('Capacity must be a positive integer');
    }
  }
}
