import { FormEvent, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Star, ArrowUpRight, Archive, Plus, RotateCcw, Trash2 } from 'lucide-react';
import api from '../services/api';
import { TrainerListItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { normalizeMediaUrl, showMediaPlaceholder } from '../lib/media';
import { matchesSearchPrefix } from '../lib/search';
import NumericInput from '../components/NumericInput';
import { useActionDialog } from '../components/ActionDialog';
import PasswordInput from '../components/PasswordInput';
import Modal from '../components/Modal';

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
  const { alert, confirm, dialog } = useActionDialog();
  const [trainers, setTrainers] = useState<TrainerListItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [experienceFrom, setExperienceFrom] = useState('');
  const [experienceTo, setExperienceTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const invalidExperienceRange = Boolean(experienceFrom && experienceTo && Number(experienceFrom) > Number(experienceTo));

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

  const openCreateForm = () => {
    setForm(emptyForm);
    setError('');
    setFormOpen(true);
  };

  const archiveTrainer = async (trainer: TrainerListItem) => {
    if (!await confirm(`Переместить профиль тренера ${trainer.full_name} в архив? Он исчезнет из публичного каталога, но аккаунт, расписание и история сохранятся.`, 'В архив')) return;
    try {
      await api.patch(`/trainers/${trainer.id}/published`, { is_published: false });
      await fetchTrainers();
    } catch (deleteError: any) {
      await alert(deleteError.response?.data?.error || 'Не удалось переместить тренера в архив');
    }
  };

  const restoreTrainer = async (trainer: TrainerListItem) => {
    try {
      await api.patch(`/trainers/${trainer.id}/published`, { is_published: true });
      await fetchTrainers();
    } catch (restoreError: any) {
      await alert(restoreError.response?.data?.error || 'Не удалось восстановить профиль тренера');
    }
  };

  const permanentlyDeleteTrainer = async (trainer: TrainerListItem) => {
    if (!await confirm(`Полностью удалить тренера ${trainer.full_name}, его аккаунт, расписание, бронирования и историю посещений? Это действие нельзя отменить.`)) return;
    try {
      await api.delete(`/trainers/${trainer.id}`);
      await fetchTrainers();
    } catch (deleteError: any) {
      await alert(deleteError.response?.data?.error || 'Не удалось удалить тренера насовсем');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSpecializationFilter('');
    setExperienceFrom('');
    setExperienceTo('');
    setStatusFilter('active');
  };

  const visibleTrainers = trainers.filter((trainer) => {
    return !invalidExperienceRange &&
      matchesSearchPrefix(search, trainer.full_name) &&
      (!specializationFilter || trainer.specialization === specializationFilter) &&
      (!experienceFrom || (trainer.experience_years !== undefined && trainer.experience_years >= Number(experienceFrom))) &&
      (!experienceTo || (trainer.experience_years !== undefined && trainer.experience_years <= Number(experienceTo))) &&
      (user?.role !== 'admin' || statusFilter === 'all' || (statusFilter === 'active' ? trainer.is_published : !trainer.is_published));
  });

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div>
      {dialog}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Наши тренеры</h1>
        {user?.role === 'admin' && <button type="button" onClick={openCreateForm} className="btn btn-primary flex items-center gap-2"><Plus size={18} />Добавить тренера</button>}
      </div>

      {formOpen && user?.role === 'admin' && <Modal title="Новый тренер" onClose={() => setFormOpen(false)} maxWidthClass="max-w-3xl">
        <form onSubmit={createTrainer} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">Имя и фамилия<input required className="input mt-1" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></label>
          <label className="text-sm">Email<input required type="email" className="input mt-1" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="text-sm">Временный пароль<PasswordInput required minLength={8} className="input mt-1" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          <label className="text-sm">Телефон<input type="tel" className="input mt-1" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="text-sm">Направления<input className="input mt-1" placeholder="Например: Hip Hop, Contemporary" value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} /><span className="mt-1 block text-xs text-textSecondary">Если указаны направления, они должны совпадать со стилем занятия. Перечисляйте через запятую.</span></label>
          <label className="text-sm">Опыт, лет<NumericInput min={0} max={70} step={1} className="input mt-1" value={form.experience_years} onChange={(event) => setForm({ ...form, experience_years: event.target.value })} /></label>
          <label className="text-sm sm:col-span-2">Описание профиля<textarea rows={3} className="input mt-1" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
          {error && <p role="alert" className="text-error sm:col-span-2">{error}</p>}
          <button type="submit" className="btn btn-primary sm:col-span-2">Создать аккаунт тренера</button>
        </form>
      </Modal>}
      {error && !formOpen && <p role="alert" className="mb-4 text-error">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Поиск тренера
          <input className="input mt-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Например, Анна Зубарева" />
        </label>
        <label className="text-sm">Направление
          <select className="input mt-1" value={specializationFilter} onChange={(event) => setSpecializationFilter(event.target.value)}>
            <option value="">Все направления</option>
            {Array.from(new Set(trainers.map((trainer) => trainer.specialization).filter(Boolean))).sort().map((specialization) => <option key={specialization} value={specialization}>{specialization}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Опыт от, лет<NumericInput min={0} max={experienceTo || 70} step={1} className="input mt-1" value={experienceFrom} onChange={(event) => setExperienceFrom(event.target.value)} /></label>
          <label className="text-sm">Опыт до, лет<NumericInput min={experienceFrom || 0} max={70} step={1} className="input mt-1" value={experienceTo} onChange={(event) => setExperienceTo(event.target.value)} /></label>
        </div>
        {user?.role === 'admin' && <label className="text-sm">Статус
          <select className="input mt-1" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="active">Активные</option>
            <option value="archived">В архиве</option>
            <option value="all">Все</option>
          </select>
        </label>}
      </div>
      {invalidExperienceRange && <p role="alert" className="mb-4 text-error">Опыт «от» не может быть больше опыта «до».</p>}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-textSecondary">Найдено тренеров: {visibleTrainers.length}</p>
        <button type="button" onClick={resetFilters} className="text-sm text-primary hover:underline">Сбросить фильтры</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleTrainers.length === 0 ? (
          <div className="card col-span-full text-center text-textSecondary">
            {trainers.length === 0 ? 'Тренеры пока не добавлены' : 'Тренеры по выбранным критериям не найдены'}
          </div>
        ) : visibleTrainers.map((trainer) => (
          <article
            key={trainer.id}
            className="card min-w-0"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start space-x-4">
              {trainer.photo_url ? (
                <img
                  src={normalizeMediaUrl(trainer.photo_url)}
                  onError={showMediaPlaceholder}
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
                {!trainer.is_published && <p className="mt-1 text-xs text-warning">В архиве</p>}
              </div>
              </div>
              {user?.role === 'admin' && <div className="flex shrink-0 gap-1">
                {trainer.is_published ? (
                  <button type="button" onClick={() => void archiveTrainer(trainer)} title="В архив" aria-label={`Переместить ${trainer.full_name} в архив`} className="rounded-lg p-2 text-error hover:bg-surface2"><Archive size={18} /></button>
                ) : (
                  <>
                    <button type="button" onClick={() => void restoreTrainer(trainer)} title="Восстановить" aria-label={`Восстановить ${trainer.full_name}`} className="rounded-lg p-2 text-primary hover:bg-surface2"><RotateCcw size={18} /></button>
                    <button type="button" onClick={() => void permanentlyDeleteTrainer(trainer)} title="Удалить насовсем" aria-label={`Удалить ${trainer.full_name} насовсем`} className="rounded-lg p-2 text-error hover:bg-surface2"><Trash2 size={18} /></button>
                  </>
                )}
              </div>}
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
              {(user?.role === 'admin' || user?.role === 'trainer') && (
                <Link to={`/users/${encodeURIComponent(trainer.user_id)}`} className="text-sm text-primary hover:underline">
                  Контакты и данные аккаунта
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default TrainersPage;
