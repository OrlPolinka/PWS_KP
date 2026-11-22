import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Calendar, Plus, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import api from '../services/api';
import { DanceStyle } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { matchesSearchPrefix } from '../lib/search';
import { useActionDialog } from '../components/ActionDialog';
import Modal from '../components/Modal';

const DanceStylesPage = () => {
  const { user } = useAuth();
  const { confirm, alert, dialog } = useActionDialog();
  const [styles, setStyles] = useState<DanceStyle[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<DanceStyle['difficulty']>('beginner');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => {
    void fetchStyles();
  }, [user?.role]);

  const fetchStyles = async () => {
    try {
      const response = await api.get<DanceStyle[]>('/dance-styles');
      setStyles(response.data);
    } catch (fetchError) {
      console.error('Error fetching dance styles:', fetchError);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setDifficulty('beginner');
    setError('');
    setFormOpen(true);
  };

  const openEdit = (style: DanceStyle) => {
    setEditingId(style.id);
    setName(style.name);
    setDescription(style.description || '');
    setDifficulty(style.difficulty || 'beginner');
    setError('');
    setFormOpen(true);
  };

  const saveStyle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      const data = { name, description, difficulty };
      if (editingId) await api.put(`/dance-styles/${editingId}`, data);
      else await api.post('/dance-styles', data);
      setFormOpen(false);
      await fetchStyles();
    } catch (saveError: any) {
      setError(saveError.response?.data?.error || 'Не удалось сохранить стиль');
    }
  };

  const deleteStyle = async (style: DanceStyle) => {
    if (!await confirm(`Переместить стиль «${style.name}» в архив? Занятия и история сохранятся, но стиль нельзя будет выбрать для новых занятий.`, 'В архив')) return;
    try {
      await api.delete(`/dance-styles/${style.id}`);
      await fetchStyles();
    } catch (deleteError: any) {
      await alert(deleteError.response?.data?.error || 'Не удалось удалить стиль');
    }
  };

  const setStyleActive = async (style: DanceStyle, isActive: boolean) => {
    try {
      await api.patch(`/dance-styles/${style.id}/active`, { is_active: isActive });
      await fetchStyles();
    } catch (updateError: any) {
      await alert(updateError.response?.data?.error || 'Не удалось изменить статус стиля');
    }
  };

  const permanentlyDeleteStyle = async (style: DanceStyle) => {
    if (!await confirm(`Полностью удалить стиль «${style.name}»? Вместе с ним будут удалены связанные занятия, бронирования и посещения. Это действие нельзя отменить.`)) return;
    try {
      await api.delete(`/dance-styles/${style.id}/permanent`);
      await fetchStyles();
    } catch (deleteError: any) {
      await alert(deleteError.response?.data?.error || 'Не удалось удалить стиль насовсем');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setDifficultyFilter('');
    setStatusFilter('active');
  };

  const visibleStyles = styles.filter((style) => {
    return matchesSearchPrefix(search, style.name, style.description) &&
      (!difficultyFilter || style.difficulty === difficultyFilter) &&
      (user?.role !== 'admin' || statusFilter === 'all' || (statusFilter === 'active' ? style.is_active : !style.is_active));
  });

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div>
      {dialog}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Стили танцев</h1>
        {user?.role === 'admin' && <button onClick={openCreate} className="btn btn-primary flex items-center gap-2"><Plus size={18} />Добавить стиль</button>}
      </div>

      {formOpen && user?.role === 'admin' && <Modal title={editingId ? 'Изменить стиль' : 'Новый стиль'} onClose={() => setFormOpen(false)}>
        <form onSubmit={saveStyle} className="space-y-4">
          <label className="block text-sm">Название<input required maxLength={100} className="input mt-1" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="block text-sm">Описание<textarea rows={4} className="input mt-1" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label className="block max-w-sm text-sm">Уровень сложности<select className="input mt-1" value={difficulty} onChange={(event) => setDifficulty(event.target.value as DanceStyle['difficulty'])}><option value="beginner">Начальный</option><option value="intermediate">Средний</option><option value="advanced">Продвинутый</option></select></label>
          {error && <p role="alert" className="text-error">{error}</p>}
          <button type="submit" className="btn btn-primary">{editingId ? 'Сохранить' : 'Добавить'}</button>
        </form>
      </Modal>}

      <section className="mb-6 grid grid-cols-1 gap-3 border-y border-surface2 py-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Поиск по названию или описанию<input className="input mt-1" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="text-sm">Сложность<select className="input mt-1" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}><option value="">Любая сложность</option><option value="beginner">Начальная</option><option value="intermediate">Средняя</option><option value="advanced">Продвинутая</option></select></label>
        {user?.role === 'admin' && <label className="text-sm">Статус<select className="input mt-1" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Активные</option><option value="archived">В архиве</option><option value="all">Все</option></select></label>}
        <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
          <p className="text-sm text-textSecondary">Найдено стилей: {visibleStyles.length}</p>
          <button type="button" onClick={resetFilters} className="text-sm text-primary hover:underline">Сбросить фильтры</button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleStyles.length === 0 ? (
          <div className="card col-span-full text-center text-textSecondary">
            {styles.length === 0 ? 'Стили танцев пока не добавлены' : 'Стили по выбранным критериям не найдены'}
          </div>
        ) : visibleStyles.map((style) => (
          <article key={style.id} className="card min-w-0">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Music size={24} className="text-primary" />
              </div>
              <Link to={`/styles/${style.id}`} className="min-w-0 flex-1 break-words text-xl font-bold hover:text-primary">{style.name}</Link>
              {user?.role === 'admin' && <div className="flex shrink-0 gap-1"><button type="button" onClick={() => openEdit(style)} title="Изменить" aria-label={`Изменить стиль ${style.name}`} className="rounded-lg p-2 hover:bg-surface2"><Pencil size={16} /></button>{style.is_active ? <button type="button" onClick={() => void deleteStyle(style)} title="В архив" aria-label={`Переместить в архив стиль ${style.name}`} className="rounded-lg p-2 text-error hover:bg-surface2"><Trash2 size={16} /></button> : <><button type="button" onClick={() => void setStyleActive(style, true)} title="Восстановить" aria-label={`Восстановить стиль ${style.name}`} className="rounded-lg p-2 text-primary hover:bg-surface2"><RotateCcw size={16} /></button><button type="button" onClick={() => void permanentlyDeleteStyle(style)} title="Удалить насовсем" aria-label={`Удалить стиль ${style.name} насовсем`} className="rounded-lg p-2 text-error hover:bg-surface2"><Trash2 size={16} /></button></>}</div>}
            </div>

            {user?.role === 'admin' && !style.is_active && <p className="mb-3 text-xs text-warning">В архиве</p>}
            {style.description && <p className="mb-4 text-sm text-textSecondary">{style.description}</p>}

            <Link to={`/styles/${style.id}`} className="mb-3 inline-block text-sm text-primary hover:underline">Подробнее о стиле</Link>

            {style.is_active && <div className="mt-4 flex items-center justify-end border-t border-surface2 pt-4">
              <Link
                to={`/schedule?style=${style.id}`}
                className="flex items-center space-x-1 text-sm text-primary hover:underline"
              >
                <Calendar size={14} />
                <span>Расписание</span>
              </Link>
            </div>}
          </article>
        ))}
      </div>
    </div>
  );
};

export default DanceStylesPage;
