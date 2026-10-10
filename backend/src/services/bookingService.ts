import { BookingRepository, ScheduleRepository, MembershipRepository, UserRepository } from '../repositories';
import { Booking } from '../types';

export class BookingService {
  static async getBookingById(id: string): Promise<Booking> {
    const booking = await BookingRepository.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    return booking;
  }

  static async getClientBookings(clientId: string, filters?: { status?: string }): Promise<Booking[]> {
    const user = await UserRepository.findById(clientId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'client') {
      throw new Error('User must be a client');
    }

    return BookingRepository.findByClientId(clientId, filters);
  }

  static async getScheduleBookings(scheduleId: string): Promise<Booking[]> {
    const schedule = await ScheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return BookingRepository.findByScheduleId(scheduleId);
  }

  static async createBooking(data: {
    schedule_id: string;
    client_id: string;
    membership_id: string;
    class_date: string;
  }): Promise<Booking> {
    const user = await UserRepository.findById(data.client_id);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'client') {
      throw new Error('User must be a client');
    }

    const schedule = await ScheduleRepository.findById(data.schedule_id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (schedule.status !== 'scheduled') {
      throw new Error('Cannot book a cancelled or completed class');
    }

    const requestedDate = new Date(`${data.class_date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.class_date) || Number.isNaN(requestedDate.getTime())) {
      throw new Error('A valid class date is required');
    }
    if (requestedDate.toISOString().slice(0, 10) !== data.class_date) {
      throw new Error('A valid class date is required');
    }
    const requestedDay = requestedDate.getUTCDay() || 7;
    if (requestedDay !== schedule.day_of_week) {
      throw new Error('Selected date does not match the weekly class day');
    }
    const requestedStart = new Date(`${data.class_date}T${schedule.start_time}`);
    if (requestedStart.getTime() <= Date.now()) {
      throw new Error('Cannot book a class in the past');
    }

    const membership = await MembershipRepository.findForBooking(
      data.membership_id,
      data.client_id,
      data.class_date,
      schedule.dance_style_id
    );
    if (!membership) {
      throw new Error('Membership not found');
    }

    if (membership.client_id !== data.client_id) {
      throw new Error('Membership does not belong to this client');
    }

    if (membership.status !== 'active') {
      throw new Error('Membership is not active');
    }

    if (!membership.date_valid) {
      throw new Error('Membership is not valid on the selected class date');
    }

    if (!membership.visits_valid) {
      throw new Error('No remaining visits on this membership');
    }

    if (!membership.style_valid) {
      throw new Error('Membership does not cover this dance style');
    }

    const existingBooking = await BookingRepository.findByClientAndSchedule(
      data.client_id,
      data.schedule_id,
      data.class_date
    );
    if (existingBooking && existingBooking.status === 'booked') {
      throw new Error('Already booked for this class');
    }

    if (await BookingRepository.hasOverlappingBooking(
      data.client_id,
      data.class_date,
      schedule.start_time,
      schedule.end_time
    )) {
      throw new Error('You already have a booking that overlaps this class');
    }

    const capacity = await ScheduleRepository.checkCapacity(data.schedule_id, data.class_date);
    if (capacity.current >= capacity.max) {
      throw new Error('Class is fully booked');
    }

    const booking = await BookingRepository.create(data);
    return booking;
  }

  static async cancelBooking(bookingId: string, cancelledBy: string): Promise<Booking> {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'booked') {
      throw new Error('Booking cannot be cancelled');
    }

    const user = await UserRepository.findById(cancelledBy);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'client' && booking.client_id !== cancelledBy) {
      throw new Error('Clients can only cancel their own bookings');
    }

    const cancelled = await BookingRepository.cancel(bookingId, cancelledBy);
    if (!cancelled) {
      throw new Error('Failed to cancel booking');
    }

    return cancelled;
  }

  static async checkInBooking(bookingId: string, checkedInBy: string): Promise<Booking> {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== 'booked') {
      throw new Error('Booking is not active');
    }

    if (booking.checked_in) {
      throw new Error('Client already checked in');
    }

    const checkedIn = await BookingRepository.checkIn(bookingId, checkedInBy);
    if (!checkedIn) {
      throw new Error('Failed to check in client');
    }

    return checkedIn;
  }

  static async getClientVisitHistory(clientId: string, limit?: number): Promise<any[]> {
    const user = await UserRepository.findById(clientId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'client') {
      throw new Error('User must be a client');
    }

    return BookingRepository.getClientVisitHistory(clientId, limit);
  }
}
