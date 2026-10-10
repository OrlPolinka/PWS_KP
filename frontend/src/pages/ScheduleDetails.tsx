import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, MapPin, Users, UserRound } from 'lucide-react';
import api from '../services/api';
import { ScheduleListItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

const weekdays = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const nextClassDate = (dayOfWeek: number, startTime: string) => {
  const date = new Date();
  const currentDay = date.getDay() || 7;
  let offset = (dayOfWeek - currentDay + 7) % 7;
  const nowTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (offset === 0 && startTime.slice(0, 5) <= nowTime) offset = 7;
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const ScheduleDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleListItem | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    api.get<ScheduleListItem>(`/schedule/${id}`)
      .then((response) => { if (current) setSchedule(response.data); })
      .catch((requestError: any) => { if (current) setError(requestError.response?.data?.error || 'Не удалось загрузить занятие'); });
    return () => { current = false; };
  }, [id]);

  if (error) return <div className="card text-center"><p>{error}</p><Link to="/schedule" className="mt-4 inline-block text-primary hover:underline">Вернуться к расписанию</Link></div>;
  if (!schedule) return <div className="py-8 text-center">Загрузка...</div>;

  const classDate = nextClassDate(schedule.day_of_week, schedule.start_time);
  const dateLabel = new Date(`${classDate}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  return (
    <article className="mx-auto max-w-4xl">
      <Link to="/schedule" className="mb-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft size={16} />К недельному расписанию</Link>
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-primary">{weekdays[schedule.day_of_week]}</p>
        <h1 className="text-3xl font-bold">{schedule.dance_style_name}</h1>
        {schedule.dance_style_description && <p className="mt-3 max-w-2xl leading-relaxed text-textSecondary">{schedule.dance_style_description}</p>}
      </header>

      <div className="grid grid-cols-1 gap-4 border-y border-surface2 py-6 sm:grid-cols-2">
        <div className="flex items-center gap-3"><Clock className="shrink-0 text-primary" /><span>{schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</span></div>
        <div className="flex items-center gap-3"><CalendarDays className="shrink-0 text-primary" /><span>Каждый {weekdays[schedule.day_of_week].toLowerCase()}</span></div>
        <div className="flex items-center gap-3"><MapPin className="shrink-0 text-primary" /><span>{schedule.hall_name}{schedule.hall_capacity ? ` · до ${schedule.hall_capacity} человек` : ''}</span></div>
        <div className="flex items-center gap-3"><Users className="shrink-0 text-primary" /><span>Группа до {schedule.max_capacity} человек</span></div>
      </div>

      <section className="py-6">
        <h2 className="mb-3 text-xl font-bold">Тренер</h2>
        <Link to={`/trainers/${schedule.trainer_id}`} className="inline-flex items-center gap-3 text-primary hover:underline">
          <UserRound size={20} /><span>{schedule.trainer_name}</span>
        </Link>
        {schedule.trainer_specialization && <p className="mt-2 text-sm text-textSecondary">{schedule.trainer_specialization}</p>}
      </section>

      <section className="border-t border-surface2 py-6">
        <h2 className="mb-3 text-xl font-bold">Направление</h2>
        <Link to={`/styles/${schedule.dance_style_id}`} className="text-primary hover:underline">Подробнее о стиле «{schedule.dance_style_name}»</Link>
      </section>

      {user?.role === 'client' && schedule.status === 'scheduled' && (
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Link to={`/bookings?schedule=${schedule.id}&class_date=${classDate}`} className="btn btn-primary">Записаться на {dateLabel}</Link>
          <span className="text-sm text-textSecondary">Дата подставится в бронирование автоматически</span>
        </div>
      )}
    </article>
  );
};

export default ScheduleDetailsPage;
