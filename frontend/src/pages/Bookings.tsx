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
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingDateFrom, setBookingDateFrom] = useState('');
  const [bookingDateTo, setBookingDateTo] = useState('');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleStyle, setScheduleStyle] = useState('');
  const [scheduleTrainer, setScheduleTrainer] = useState('');
  const [scheduleHall, setScheduleHall] = useState('');
  const [scheduleDay, setScheduleDay] = useState('');

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
      alert(error.response?.data?.error || 'Ошибка бронирования');
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

  const visibleBookings = myBookings.filter((booking) => {
    const searchText = `${booking.dance_style_name || ''} ${booking.trainer_name || ''} ${booking.hall_name || ''}`.toLocaleLowerCase('ru');
    const date = booking.class_date.slice(0, 10);
    return (!bookingSearch || searchText.includes(bookingSearch.toLocaleLowerCase('ru'))) &&
      (!bookingStatus || booking.status === bookingStatus) &&
      (!bookingDateFrom || date >= bookingDateFrom) && (!bookingDateTo || date <= bookingDateTo);
  });
  const visibleSchedules = availableSchedules.filter((schedule) => {
    const searchText = `${schedule.dance_style_name} ${schedule.trainer_name} ${schedule.hall_name}`.toLocaleLowerCase('ru');
    return (!scheduleSearch || searchText.includes(scheduleSearch.toLocaleLowerCase('ru'))) &&
      (!scheduleStyle || String(schedule.dance_style_id) === scheduleStyle) &&
      (!scheduleTrainer || schedule.trainer_id === scheduleTrainer) &&
      (!scheduleHall || schedule.hall_name === scheduleHall) &&
      (!scheduleDay || schedule.day_of_week === Number(scheduleDay));
  });
  const scheduleStyles = Array.from(new Map(availableSchedules.map((schedule) => [String(schedule.dance_style_id), schedule.dance_style_name])));
  const scheduleTrainers = Array.from(new Map(availableSchedules.map((schedule) => [schedule.trainer_id, schedule.trainer_name])));
  const scheduleHalls = Array.from(new Set(availableSchedules.map((schedule) => schedule.hall_name))).sort();

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Мои бронирования</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Мои бронирования</h2>
          <div className="mb-4 grid grid-cols-1 gap-3 border-y border-surface2 py-4 sm:grid-cols-2">
            <label className="text-sm">Поиск по занятию, тренеру или залу<input className="input mt-1" value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} /></label>
            <label className="text-sm">Статус<select className="input mt-1" value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)}><option value="">Все статусы</option><option value="booked">Забронировано</option><option value="cancelled">Отменено</option><option value="attended">Посещено</option><option value="no_show">Неявка</option></select></label>
            <label className="text-sm">Дата занятия от<input type="date" className="input mt-1" value={bookingDateFrom} onChange={(event) => setBookingDateFrom(event.target.value)} /></label>
            <label className="text-sm">Дата занятия до<input type="date" className="input mt-1" value={bookingDateTo} onChange={(event) => setBookingDateTo(event.target.value)} /></label>
            <p className="text-sm text-textSecondary sm:col-span-2">Найдено: {visibleBookings.length}</p>
          </div>
          <div className="space-y-4">
            {visibleBookings.length === 0 ? (
              <div className="card text-center py-8 text-textSecondary">
                {myBookings.length === 0 ? 'У вас нет бронирований' : 'Бронирования по выбранным критериям не найдены'}
              </div>
            ) : (
              visibleBookings.map((booking) => (
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
                        <div className="flex items-center space-x-1">
                          <UserIcon size={14} />
                          <span>{booking.trainer_name || 'Тренер не указан'}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      booking.status === 'booked' ? 'bg-success/20 text-success' :
                      booking.status === 'cancelled' || booking.status === 'no_show' ? 'bg-error/20 text-error' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {booking.status === 'booked' ? 'Забронировано' :
                       booking.status === 'cancelled' ? 'Отменено' :
                       booking.status === 'no_show' ? 'Неявка' : 'Посещено'}
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
          <div className="mb-4 grid grid-cols-1 gap-3 border-y border-surface2 py-4 sm:grid-cols-2">
            <label className="text-sm">Поиск по занятию, тренеру или залу<input className="input mt-1" value={scheduleSearch} onChange={(event) => setScheduleSearch(event.target.value)} /></label>
            <label className="text-sm">Стиль<select className="input mt-1" value={scheduleStyle} onChange={(event) => setScheduleStyle(event.target.value)}><option value="">Все стили</option>{scheduleStyles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
            <label className="text-sm">Тренер<select className="input mt-1" value={scheduleTrainer} onChange={(event) => setScheduleTrainer(event.target.value)}><option value="">Все тренеры</option>{scheduleTrainers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
            <label className="text-sm">Зал<select className="input mt-1" value={scheduleHall} onChange={(event) => setScheduleHall(event.target.value)}><option value="">Все залы</option>{scheduleHalls.map((hall) => <option key={hall} value={hall}>{hall}</option>)}</select></label>
            <label className="text-sm">День недели<select className="input mt-1" value={scheduleDay} onChange={(event) => setScheduleDay(event.target.value)}><option value="">Все дни</option>{Array.from({ length: 7 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{dayNames[day % 7]}</option>)}</select></label>
            <p className="text-sm text-textSecondary sm:self-end">Найдено: {visibleSchedules.length}</p>
          </div>
          <div className="space-y-4">
            {visibleSchedules.length === 0 ? (
              <div className="card text-center py-8 text-textSecondary">
                {availableSchedules.length === 0 ? 'Нет доступных занятий' : 'Занятия по выбранным критериям не найдены'}
              </div>
            ) : (
              visibleSchedules.map((schedule) => (
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
