import { useState, useEffect, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, User as UserIcon, Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { ScheduleListItem, ScheduleOptions, TrainerListItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

const weekDays = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 7, label: 'Воскресенье' },
];

type ScheduleForm = {
  day_of_week: number;
  trainer_id: string;
  hall_id: number;
  dance_style_id: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
};

const emptyForm: ScheduleForm = {
  day_of_week: 1,
  trainer_id: '',
  hall_id: 0,
  dance_style_id: 0,
  start_time: '18:00',
  end_time: '19:00',
  max_capacity: 10,
};

const SchedulePage = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [options, setOptions] = useState<ScheduleOptions>({ halls: [], dance_styles: [] });
  const [trainers, setTrainers] = useState<TrainerListItem[]>([]);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState(searchParams.get('trainer') || '');
  const [selectedStyle, setSelectedStyle] = useState(searchParams.get('style') || '');
  const [selectedHall, setSelectedHall] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('scheduled');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [capacityFrom, setCapacityFrom] = useState('');
  const [capacityTo, setCapacityTo] = useState('');

  useEffect(() => {
    fetchSchedules();
    if (user?.role === 'admin') fetchOptions();
  }, [user?.role]);

  const fetchSchedules = async () => {
    try {
      const response = await api.get<ScheduleListItem[]>('/schedule');
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [optionsResponse, trainersResponse] = await Promise.all([
        api.get<ScheduleOptions>('/schedule/options'),
        api.get<TrainerListItem[]>('/trainers'),
      ]);
      setOptions(optionsResponse.data);
      setTrainers(trainersResponse.data.filter((trainer) => trainer.is_active));
    } catch (fetchError) {
      console.error('Error loading schedule options:', fetchError);
    }
  };

  const formatTime = (timeString: string) => timeString.slice(0, 5);
  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      trainer_id: trainers[0]?.id || '',
      hall_id: Number(options.halls[0]?.id || 0),
      dance_style_id: options.dance_styles[0]?.id || 0,
    });
    setError('');
    setFormOpen(true);
  };
  const openEdit = (schedule: ScheduleListItem) => {
    setEditingId(schedule.id);
    setForm({
      day_of_week: schedule.day_of_week,
      trainer_id: schedule.trainer_id,
      hall_id: schedule.hall_id,
      dance_style_id: schedule.dance_style_id,
      start_time: formatTime(schedule.start_time),
      end_time: formatTime(schedule.end_time),
      max_capacity: schedule.max_capacity,
    });
    setError('');
    setFormOpen(true);
  };
  const saveSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      if (editingId) await api.put(`/schedule/${editingId}`, form);
      else await api.post('/schedule', form);
      setFormOpen(false);
      await fetchSchedules();
    } catch (saveError: any) {
      setError(saveError.response?.data?.error || 'Не удалось сохранить занятие');
    }
  };
  const deleteSchedule = async (id: string) => {
    if (!window.confirm('Удалить занятие из недельного расписания?')) return;
    try {
      await api.delete(`/schedule/${id}`);
      await fetchSchedules();
    } catch (deleteError: any) {
      window.alert(deleteError.response?.data?.error || 'Не удалось удалить занятие');
    }
  };
  const visibleSchedules = schedules.filter((schedule) => {
    const searchText = `${schedule.dance_style_name} ${schedule.trainer_name} ${schedule.hall_name}`.toLocaleLowerCase('ru');
    const start = formatTime(schedule.start_time);
    const end = formatTime(schedule.end_time);
    return (user?.role === 'admin'
      ? selectedStatus === 'all' || schedule.status === selectedStatus
      : schedule.status === 'scheduled') &&
      (!search || searchText.includes(search.toLocaleLowerCase('ru'))) &&
      (!selectedDay || String(schedule.day_of_week) === selectedDay) &&
      (!selectedTrainer || schedule.trainer_id === selectedTrainer) &&
      (!selectedStyle || String(schedule.dance_style_id) === selectedStyle) &&
      (!selectedHall || schedule.hall_name === selectedHall) &&
      (!timeFrom || start >= timeFrom) && (!timeTo || end <= timeTo) &&
      (!capacityFrom || schedule.max_capacity >= Number(capacityFrom)) &&
      (!capacityTo || schedule.max_capacity <= Number(capacityTo));
  });
  const trainerOptions = Array.from(new Map(schedules.map((schedule) => [schedule.trainer_id, schedule.trainer_name])));
  const styleOptions = Array.from(new Map(schedules.map((schedule) => [String(schedule.dance_style_id), schedule.dance_style_name])));
  const hallOptions = Array.from(new Set(schedules.map((schedule) => schedule.hall_name))).sort();

  const resetFilters = () => {
    setSearchParams({});
    setSearch('');
    setSelectedDay('');
    setSelectedTrainer('');
    setSelectedStyle('');
    setSelectedHall('');
    setSelectedStatus('scheduled');
    setTimeFrom('');
    setTimeTo('');
    setCapacityFrom('');
    setCapacityTo('');
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Расписание занятий</h1>
        {user?.role === 'admin' && (
          <button onClick={openCreate} className="btn btn-primary flex items-center space-x-2">
            <Plus size={18} /><span>Добавить занятие</span>
          </button>
        )}
      </div>

      <section className="mb-8 grid grid-cols-1 gap-3 border-y border-surface2 py-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Поиск по стилю, тренеру или залу<input className="input mt-1" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="text-sm">День недели<select className="input mt-1" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}><option value="">Все дни</option>{weekDays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
        <label className="text-sm">Тренер<select className="input mt-1" value={selectedTrainer} onChange={(event) => setSelectedTrainer(event.target.value)}><option value="">Все тренеры</option>{trainerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="text-sm">Стиль<select className="input mt-1" value={selectedStyle} onChange={(event) => setSelectedStyle(event.target.value)}><option value="">Все стили</option>{styleOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="text-sm">Зал<select className="input mt-1" value={selectedHall} onChange={(event) => setSelectedHall(event.target.value)}><option value="">Все залы</option>{hallOptions.map((hall) => <option key={hall} value={hall}>{hall}</option>)}</select></label>
        {user?.role === 'admin' && <label className="text-sm">Статус занятия<select className="input mt-1" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}><option value="scheduled">Запланировано</option><option value="cancelled">Отменено</option><option value="completed">Завершено</option><option value="rescheduled">Перенесено</option><option value="all">Все статусы</option></select></label>}
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Начало не раньше<input type="time" className="input mt-1" value={timeFrom} onChange={(event) => setTimeFrom(event.target.value)} /></label><label className="text-sm">Окончание не позже<input type="time" className="input mt-1" value={timeTo} onChange={(event) => setTimeTo(event.target.value)} /></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Мест от<input type="number" min={1} className="input mt-1" value={capacityFrom} onChange={(event) => setCapacityFrom(event.target.value)} /></label><label className="text-sm">Мест до<input type="number" min={1} className="input mt-1" value={capacityTo} onChange={(event) => setCapacityTo(event.target.value)} /></label></div>
        <div className="flex items-end justify-between gap-3"><span className="pb-2 text-sm text-textSecondary">Найдено: {visibleSchedules.length}</span><button type="button" onClick={resetFilters} className="pb-2 text-sm text-primary hover:underline">Сбросить</button></div>
      </section>

      {formOpen && user?.role === 'admin' && (
        <form onSubmit={saveSchedule} className="card mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between sm:col-span-2 lg:col-span-4">
            <h2 className="text-xl font-bold">{editingId ? 'Изменить занятие' : 'Новое занятие'}</h2>
            <button type="button" aria-label="Закрыть" onClick={() => setFormOpen(false)} className="p-2 hover:bg-surface2 rounded-lg"><X size={18} /></button>
          </div>
          <label className="text-sm">День недели
            <select className="input mt-1" value={form.day_of_week} onChange={(event) => setForm({ ...form, day_of_week: Number(event.target.value) })}>
              {weekDays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
            </select>
          </label>
          <label className="text-sm">Тренер
            <select required className="input mt-1" value={form.trainer_id} onChange={(event) => setForm({ ...form, trainer_id: event.target.value })}>
              <option value="">Выберите тренера</option>
              {trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.full_name}</option>)}
            </select>
          </label>
          <label className="text-sm">Зал
            <select required className="input mt-1" value={form.hall_id} onChange={(event) => setForm({ ...form, hall_id: Number(event.target.value) })}>
              <option value={0}>Выберите зал</option>
              {options.halls.map((hall) => <option key={hall.id} value={hall.id}>{hall.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Стиль танца
            <select required className="input mt-1" value={form.dance_style_id} onChange={(event) => setForm({ ...form, dance_style_id: Number(event.target.value) })}>
              <option value={0}>Выберите стиль</option>
              {options.dance_styles.map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Начало<input required type="time" className="input mt-1" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></label>
          <label className="text-sm">Окончание<input required type="time" className="input mt-1" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></label>
          <label className="text-sm">Вместимость<input required type="number" min={1} className="input mt-1" value={form.max_capacity} onChange={(event) => setForm({ ...form, max_capacity: Number(event.target.value) })} /></label>
          <div className="flex items-end"><button type="submit" className="btn btn-primary w-full">{editingId ? 'Сохранить' : 'Добавить'}</button></div>
          {error && <p role="alert" className="text-error sm:col-span-2 lg:col-span-4">{error}</p>}
        </form>
      )}

      {visibleSchedules.length === 0 ? <div className="card text-center text-textSecondary">{schedules.length === 0 ? 'На этой неделе занятий нет' : 'Занятий по выбранным критериям не найдено'}</div> : <div className="space-y-8">
        {weekDays.map((day) => {
          const daySchedules = visibleSchedules.filter((schedule) => schedule.day_of_week === day.value);
          return (
            <section key={day.value}>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Calendar size={20} className="text-primary" />{day.label}</h2>
              {daySchedules.length === 0 ? <p className="text-sm text-textSecondary">Занятий нет</p> : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {daySchedules.map((schedule) => (
                    <article key={schedule.id} className="card min-w-0">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/schedule/${schedule.id}`} className="mb-1 block break-words text-xl font-bold hover:text-primary">{schedule.dance_style_name}</Link>
                          <span className="text-textSecondary">{formatTime(schedule.start_time)}–{formatTime(schedule.end_time)}</span>
                        </div>
                        {user?.role === 'admin' && <div className="flex shrink-0 gap-1">
                          <button onClick={() => openEdit(schedule)} title="Изменить" aria-label="Изменить занятие" className="rounded-lg p-2 hover:bg-surface2"><Pencil size={16} /></button>
                          <button onClick={() => deleteSchedule(schedule.id)} title="Удалить" aria-label="Удалить занятие" className="rounded-lg p-2 text-error hover:bg-surface2"><Trash2 size={16} /></button>
                        </div>}
                      </div>
                      <div className="space-y-2 text-sm text-textSecondary">
                        <div className="flex items-center gap-2"><MapPin size={16} /><span>{schedule.hall_name}</span></div>
                        <div className="flex items-center gap-2"><UserIcon size={16} /><span className="truncate">{schedule.trainer_name}</span></div>
                        <div>Мест: {schedule.max_capacity}</div>
                      </div>
                      <Link to={`/schedule/${schedule.id}`} className="mt-4 inline-block border-t border-surface2 pt-4 text-sm text-primary hover:underline">Подробнее о занятии</Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>}
    </div>
  );
};

export default SchedulePage;
