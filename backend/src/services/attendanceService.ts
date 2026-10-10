import { AttendanceRepository, BookingRepository, TrainerRepository } from '../repositories';

export class AttendanceService {
  static async markAttendance(data: {
    booking_id: string;
    trainer_id: string;
    is_present: boolean;
    notes?: string;
  }): Promise<any> {
    const booking = await BookingRepository.findById(data.booking_id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'booked') {
      throw new Error('Cannot mark attendance for non-booked classes');
    }

    const trainer = await TrainerRepository.findById(data.trainer_id);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    const existing = await AttendanceRepository.findByBookingId(data.booking_id);
    if (existing) {
      throw new Error('Attendance already marked for this booking');
    }

    const attendance = await AttendanceRepository.create(data);

    await BookingRepository.update(data.booking_id, {
      status: data.is_present ? 'attended' : 'no_show',
    });

    return attendance;
  }

  static async getAttendanceById(id: number): Promise<any> {
    const attendance = await AttendanceRepository.findById(id);
    if (!attendance) {
      throw new Error('Attendance record not found');
    }
    return attendance;
  }

  static async getTrainerAttendance(trainerId: string, filters?: {
    date_from?: Date;
    date_to?: Date;
  }): Promise<any[]> {
    const trainer = await TrainerRepository.findById(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    return AttendanceRepository.findByTrainerId(trainerId, filters);
  }

  static async updateAttendance(id: number, data: {
    is_present?: boolean;
    notes?: string;
  }): Promise<any> {
    const attendance = await AttendanceRepository.findById(id);
    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    const updated = await AttendanceRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update attendance');
    }

    if (data.is_present !== undefined) {
      const booking = await BookingRepository.findById(attendance.booking_id);
      if (booking) {
        await BookingRepository.update(attendance.booking_id, {
          status: data.is_present ? 'attended' : 'no_show',
        });
      }
    }

    return updated;
  }
}
