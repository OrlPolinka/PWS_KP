import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, MapPin, UserRound } from 'lucide-react';
import api from '../services/api';
import { DanceStyle, ScheduleListItem } from '../types';

const weekdays = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const difficultyNames = { beginner: 'Начальный', intermediate: 'Средний', advanced: 'Продвинутый' };

const DanceStyleDetailsPage = () => {
  const { id } = useParams();
  const [style, setStyle] = useState<DanceStyle | null>(null);
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    Promise.all([
      api.get<DanceStyle>(`/dance-styles/${id}`),
      api.get<ScheduleListItem[]>('/schedule', { params: { dance_style_id: id, status: 'scheduled' } }),
    ]).then(([styleResponse, scheduleResponse]) => {
      if (!current) return;
      setStyle(styleResponse.data);
      setSchedules(scheduleResponse.data);
    }).catch((requestError: any) => {
      if (current) setError(requestError.response?.data?.error || 'Не удалось загрузить стиль танца');
    });
    return () => { current = false; };
  }, [id]);

  if (error) return <div className="card text-center"><p>{error}</p><Link to="/styles" className="mt-4 inline-block text-primary hover:underline">Вернуться к стилям</Link></div>;
  if (!style) return <div className="py-8 text-center">Загрузка...</div>;

  const trainers = Array.from(new Map(schedules.map((schedule) => [schedule.trainer_id, schedule.trainer_name])));

  return (
    <article className="mx-auto max-w-4xl">
      <Link to="/styles" className="mb-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft size={16} />К стилям танцев</Link>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{style.name}</h1>
        {style.difficulty && <p className="mt-2 text-sm text-primary">{difficultyNames[style.difficulty]}</p>}
        {style.description && <p className="mt-4 max-w-2xl leading-relaxed text-textSecondary">{style.description}</p>}
      </header>

      <section className="border-t border-surface2 py-6">
        <h2 className="mb-4 text-xl font-bold">Тренеры направления</h2>
        {trainers.length === 0 ? <p className="text-textSecondary">Пока нет занятий по этому направлению</p> : <div className="flex flex-wrap gap-3">{trainers.map(([trainerId, trainerName]) => <Link key={trainerId} to={`/trainers/${trainerId}`} className="inline-flex items-center gap-2 text-primary hover:underline"><UserRound size={17} />{trainerName}</Link>)}</div>}
      </section>

      <section className="border-t border-surface2 py-6">
        <h2 className="mb-4 text-xl font-bold">Занятия по расписанию</h2>
        <div className="divide-y divide-surface2">
          {schedules.length === 0 ? <p className="py-3 text-textSecondary">Занятий пока нет</p> : schedules.map((schedule) => <div key={schedule.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="space-y-1">
              <p className="font-medium">{weekdays[schedule.day_of_week]} · {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</p>
              <p className="flex items-center gap-2 text-sm text-textSecondary"><MapPin size={15} />{schedule.hall_name}</p>
              <p className="flex items-center gap-2 text-sm text-textSecondary"><UserRound size={15} /><Link to={`/trainers/${schedule.trainer_id}`} className="hover:text-primary">{schedule.trainer_name}</Link></p>
            </div>
            <Link to={`/schedule/${schedule.id}`} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><CalendarDays size={16} /><Clock size={15} />Подробнее</Link>
          </div>)}
        </div>
      </section>
    </article>
  );
};

export default DanceStyleDetailsPage;
