import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, User as UserIcon, X, Check } from 'lucide-react';
import api from '../services/api';
import { Booking, Membership, ScheduleListItem } from '../types';

const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const nextDateForWeekday = (dayOfWeek: number, startTime: string) => {
  const date = new Date();
  const currentDay = date.getDay() || 7;
  let dayOffset = (dayOfWeek - currentDay + 7) % 7;
  if (dayOffset === 0 && startTime.slice(0, 5) <= `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`) {
    dayOffset = 7;
  }
  date.setDate(date.getDate() + dayOffset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const upcomingDatesForWeekday = (dayOfWeek: number, startTime: string) => {
  const firstDate = nextDateForWeekday(dayOfWeek, startTime);
  const [year, month, day] = firstDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Array.from({ length: 8 }, (_, index) => {
    const occurrence = new Date(date);
    occurrence.setDate(date.getDate() + index * 7);
    return `${occurrence.getFullYear()}-${String(occurrence.getMonth() + 1).padStart(2, '0')}-${String(occurrence.getDate()).padStart(2, '0')}`;
  });
};

const BookingsPage = () => {
  const [searchParams] = useSearchParams();
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<ScheduleListItem[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedMembershipId, setSelectedMembershipId] = useState('');
  const [selectedDates, setSelectedDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const scheduleId = searchParams.get('schedule');
    const classDate = searchParams.get('class_date');
    if (scheduleId && classDate) {
      setSelectedDates((current) => ({ ...current, [scheduleId]: classDate }));
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, schedulesRes, membershipsRes] = await Promise.all([
        api.get('/bookings/my'),
        api.get('/schedule'),
        api.get('/memberships/my'),
      ]);
      setMyBookings(bookingsRes.data);
      setAvailableSchedules(schedulesRes.data.filter((s: ScheduleListItem) => s.status === 'scheduled'));
      setMemberships(membershipsRes.data.filter((membership: Membership) => membership.status === 'active'));
      setSelectedMembershipId((current) => current || membershipsRes.data.find((membership: Membership) => membership.status === 'active')?.id || '');
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const bookClass = async (scheduleId: string) => {
    const schedule = availableSchedules.find((item) => item.id === scheduleId);
    if (!schedule || !selectedMembershipId) return;
    try {
      await api.post('/bookings', {
        schedule_id: scheduleId,
        membership_id: selectedMembershipId,
        class_date: selectedDates[scheduleId] || nextDateForWeekday(schedule.day_of_week, schedule.start_time),
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка бронирования');
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      fetchData();
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeString?: string) => timeString?.slice(0, 5) || '—';

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Мои бронирования</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Активные бронирования</h2>
          <div className="space-y-4">
            {myBookings.length === 0 ? (
              <div className="card text-center py-8 text-textSecondary">
                У вас нет активных бронирований
              </div>
            ) : (
              myBookings.map((booking) => (
                <div key={booking.id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{booking.dance_style_name || booking.schedule?.dance_style?.name}</h3>
                      <div className="flex items-center space-x-4 text-textSecondary text-sm mt-2">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{formatDate(booking.class_date)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{formatTime(booking.start_time)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin size={14} />
                          <span>{booking.hall_name || booking.schedule?.hall?.name}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      booking.status === 'booked' ? 'bg-success/20 text-success' :
                      booking.status === 'cancelled' ? 'bg-error/20 text-error' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {booking.status === 'booked' ? 'Забронировано' :
                       booking.status === 'cancelled' ? 'Отменено' : 'Посещено'}
                    </span>
                  </div>

                  {booking.status === 'booked' && (
                    <button
                      onClick={() => cancelBooking(booking.id)}
                      className="btn btn-secondary flex items-center space-x-2"
                    >
                      <X size={16} />
                      <span>Отменить</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Доступные занятия</h2>
          <div className="space-y-4">
            {availableSchedules.length === 0 ? (
              <div className="card text-center py-8 text-textSecondary">
                Нет доступных занятий
              </div>
            ) : (
              availableSchedules.map((schedule) => (
                <div key={schedule.id} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{schedule.dance_style_name}</h3>
                      <div className="flex items-center space-x-4 text-textSecondary text-sm mt-2">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{dayNames[schedule.day_of_week % 7]}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock size={14} />
                          <span>{formatTime(schedule.start_time)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin size={14} />
                          <span>{schedule.hall_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-textSecondary text-sm">
                      <UserIcon size={14} />
                      <span>{schedule.trainer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Дата занятия: ${schedule.dance_style_name}`}
                        value={selectedDates[schedule.id] || nextDateForWeekday(schedule.day_of_week, schedule.start_time)}
                        onChange={(event) => setSelectedDates({ ...selectedDates, [schedule.id]: event.target.value })}
                        className="input max-w-48"
                      >
                        {upcomingDatesForWeekday(schedule.day_of_week, schedule.start_time).map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}
                      </select>
                      <button
                        onClick={() => bookClass(schedule.id)}
                        disabled={memberships.length === 0}
                        className="btn btn-primary flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Check size={16} />
                        <span>Записаться</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {memberships.length === 0 && (
            <p className="mt-4 text-sm text-textSecondary">Для записи нужен активный абонемент. Оформить его можно в разделе «Абонементы».</p>
          )}
          {memberships.length > 1 && <label className="mt-4 block max-w-md text-sm">Использовать абонемент
            <select className="input mt-1" value={selectedMembershipId} onChange={(event) => setSelectedMembershipId(event.target.value)}>
              {memberships.map((membership) => <option key={membership.id} value={membership.id}>{membership.membership_type?.name || 'Абонемент'} · до {formatDate(membership.end_date)}</option>)}
            </select>
          </label>}
        </div>
      </div>
    </div>
  );
};

export default BookingsPage;
