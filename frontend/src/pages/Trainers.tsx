import { FormEvent, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Star, ArrowUpRight, Plus, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { TrainerListItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

type TrainerForm = {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  specialization: string;
  experience_years: string;
  bio: string;
};

const emptyForm: TrainerForm = {
  full_name: '', email: '', password: '', phone: '', specialization: '', experience_years: '', bio: '',
};

const TrainersPage = () => {
  const { user } = useAuth();
  const [trainers, setTrainers] = useState<TrainerListItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const response = await api.get<TrainerListItem[]>('/trainers');
      setTrainers(response.data);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      setError('Не удалось загрузить список тренеров');
    } finally {
      setLoading(false);
    }
  };

  const createTrainer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    let createdUserId = '';
    try {
      const userResponse = await api.post('/users/create', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        role: 'trainer',
      });
      createdUserId = userResponse.data.id;
      await api.post('/trainers', {
        user_id: createdUserId,
        specialization: form.specialization || undefined,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined,
        bio: form.bio || undefined,
      });
      setForm(emptyForm);
      setFormOpen(false);
      await fetchTrainers();
    } catch (createError: any) {
      if (createdUserId) {
        try { await api.delete(`/users/${createdUserId}`); } catch { /* Preserve the original error. */ }
      }
      setError(createError.response?.data?.error || 'Не удалось добавить тренера');
    }
  };

  const deleteTrainer = async (trainer: TrainerListItem) => {
    if (!window.confirm(`Удалить тренера ${trainer.full_name} вместе с его расписанием, бронированиями и историей посещений?`)) return;
    try {
      await api.delete(`/trainers/${trainer.id}`);
      await fetchTrainers();
    } catch (deleteError: any) {
      setError(deleteError.response?.data?.error || 'Не удалось удалить тренера');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Наши тренеры</h1>
        {user?.role === 'admin' && <button onClick={() => { setError(''); setFormOpen(!formOpen); }} className="btn btn-primary flex items-center gap-2"><Plus size={18} />Добавить тренера</button>}
      </div>

      {formOpen && user?.role === 'admin' && <form onSubmit={createTrainer} className="card mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between sm:col-span-2"><h2 className="text-xl font-bold">Новый тренер</h2><button type="button" aria-label="Закрыть" onClick={() => setFormOpen(false)} className="rounded-lg p-2 hover:bg-surface2"><X size={18} /></button></div>
        <label className="text-sm">Имя и фамилия<input required className="input mt-1" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
        <label className="text-sm">Email<input required type="email" className="input mt-1" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label className="text-sm">Временный пароль<input required minLength={8} type="password" className="input mt-1" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        <label className="text-sm">Телефон<input type="tel" className="input mt-1" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        <label className="text-sm">Направление<input className="input mt-1" value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} /></label>
        <label className="text-sm">Опыт, лет<input type="number" min={0} className="input mt-1" value={form.experience_years} onChange={(event) => setForm({ ...form, experience_years: event.target.value })} /></label>
        <label className="text-sm sm:col-span-2">Описание профиля<textarea rows={3} className="input mt-1" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
        {error && <p role="alert" className="text-error sm:col-span-2">{error}</p>}
        <button type="submit" className="btn btn-primary sm:col-span-2">Создать аккаунт тренера</button>
      </form>}
      {error && !formOpen && <p role="alert" className="mb-4 text-error">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainers.length === 0 ? (
          <div className="card col-span-full text-center text-textSecondary">
            Тренеры пока не добавлены
          </div>
        ) : trainers.map((trainer) => (
          <article
            key={trainer.id}
            className="card min-w-0"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start space-x-4">
              {trainer.photo_url ? (
                <img
                  src={trainer.photo_url}
                  alt={trainer.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                  <User size={32} className="text-white" />
                </div>
              )}
              <div className="min-w-0">
                <Link to={`/trainers/${trainer.id}`} className="break-words text-xl font-bold hover:text-primary">{trainer.full_name}</Link>
                <p className="text-primary text-sm">{trainer.specialization}</p>
              </div>
              </div>
              {user?.role === 'admin' && <button onClick={() => deleteTrainer(trainer)} title="Удалить тренера" aria-label={`Удалить ${trainer.full_name}`} className="shrink-0 rounded-lg p-2 text-error hover:bg-surface2"><Trash2 size={18} /></button>}
            </div>

            {trainer.bio && (
              <p className="text-textSecondary mb-4 line-clamp-3">{trainer.bio}</p>
            )}

            <div className="space-y-2 text-textSecondary text-sm">
              {trainer.experience_years && (
                <div className="flex items-center space-x-2">
                  <Star size={16} />
                  <span>Опыт: {trainer.experience_years} лет</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface2 pt-4">
              <Link to={`/trainers/${trainer.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Профиль тренера <ArrowUpRight size={14} />
              </Link>
              <Link
                to={`/schedule?trainer=${encodeURIComponent(trainer.id)}`}
                className="text-primary hover:underline text-sm"
              >
                Посмотреть расписание →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default TrainersPage;
