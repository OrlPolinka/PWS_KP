import { FormEvent, useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle, Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { MembershipType, Membership } from '../types';
import { useAuth } from '../contexts/AuthContext';

type MembershipTypeForm = {
  name: string;
  description: string;
  price: string;
  visit_count: string;
  duration_days: string;
};

const emptyForm: MembershipTypeForm = { name: '', description: '', price: '', visit_count: '', duration_days: '30' };

const MembershipsPage = () => {
  const { user } = useAuth();
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [myMemberships, setMyMemberships] = useState<Membership[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user?.role]);

  const fetchData = async () => {
    try {
      const typesRes = await api.get<MembershipType[]>('/membership-types');
      setMembershipTypes(typesRes.data);
      if (user?.role === 'client') {
        const membershipsRes = await api.get<Membership[]>('/memberships/my');
        setMyMemberships(membershipsRes.data);
      } else {
        setMyMemberships([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setFormOpen(true);
  };

  const openEdit = (type: MembershipType) => {
    setEditingId(type.id);
    setForm({
      name: type.name,
      description: type.description || '',
      price: String(type.price),
      visit_count: type.visit_count == null ? '' : String(type.visit_count),
      duration_days: String(type.duration_days),
    });
    setError('');
    setFormOpen(true);
  };

  const saveType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      visit_count: form.visit_count === '' ? null : Number(form.visit_count),
      duration_days: Number(form.duration_days),
    };
    try {
      if (editingId) await api.put(`/membership-types/${editingId}`, payload);
      else await api.post('/membership-types', payload);
      setFormOpen(false);
      await fetchData();
    } catch (saveError: any) {
      setError(saveError.response?.data?.error || 'Не удалось сохранить тип абонемента');
    }
  };

  const setTypeActive = async (type: MembershipType, isActive: boolean) => {
    try {
      if (isActive) await api.patch(`/membership-types/${type.id}/active`, { is_active: true });
      else await api.delete(`/membership-types/${type.id}`);
      await fetchData();
    } catch (updateError: any) {
      window.alert(updateError.response?.data?.error || 'Не удалось изменить тип абонемента');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Абонементы</h1>
        {user?.role === 'admin' && <button onClick={openCreate} className="btn btn-primary flex items-center gap-2"><Plus size={18} />Добавить тип</button>}
      </div>

      {formOpen && user?.role === 'admin' && <form onSubmit={saveType} className="card mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between sm:col-span-2"><h2 className="text-xl font-bold">{editingId ? 'Изменить тип' : 'Новый тип абонемента'}</h2><button type="button" aria-label="Закрыть" onClick={() => setFormOpen(false)} className="rounded-lg p-2 hover:bg-surface2"><X size={18} /></button></div>
        <label className="text-sm">Название<input required maxLength={100} className="input mt-1" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="text-sm">Цена, ₽<input required type="number" min={0} step="0.01" className="input mt-1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
        <label className="text-sm">Длительность, дней<input required type="number" min={1} className="input mt-1" value={form.duration_days} onChange={(event) => setForm({ ...form, duration_days: event.target.value })} /></label>
        <label className="text-sm">Посещений<input type="number" min={1} placeholder="Без ограничений" className="input mt-1" value={form.visit_count} onChange={(event) => setForm({ ...form, visit_count: event.target.value })} /></label>
        <label className="text-sm sm:col-span-2">Описание<textarea rows={3} className="input mt-1" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        {error && <p role="alert" className="text-error sm:col-span-2">{error}</p>}
        <button type="submit" className="btn btn-primary sm:col-span-2">{editingId ? 'Сохранить изменения' : 'Создать тип'}</button>
      </form>}

      {user?.role === 'client' && myMemberships.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Мои абонементы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myMemberships.map((membership) => (
              <div key={membership.id} className="card border-primary">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{membership.membership_type?.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    membership.status === 'active' ? 'bg-success/20 text-success' :
                    membership.status === 'expired' ? 'bg-error/20 text-error' :
                    'bg-warning/20 text-warning'
                  }`}>
                    {membership.status === 'active' ? 'Активен' :
                     membership.status === 'expired' ? 'Истек' : 'Отменен'}
                  </span>
                </div>

                <div className="space-y-2 text-textSecondary">
                  <div className="flex items-center space-x-2">
                    <Clock size={16} />
                    <span>Действует до: {formatDate(membership.end_date)}</span>
                  </div>
                  {membership.remaining_visits !== null && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle size={16} />
                      <span>Осталось посещений: {membership.remaining_visits}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Доступные абонементы</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {membershipTypes.filter((type) => user?.role === 'admin' || type.is_active).map((type) => (
            <div key={type.id} className="card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <CreditCard size={24} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="break-words text-xl font-bold">{type.name}</h3>
                  <p className="text-2xl font-bold text-primary">{type.price} ₽</p>
                </div>
                </div>
                {user?.role === 'admin' && <div className="flex shrink-0 gap-1"><button onClick={() => openEdit(type)} title="Изменить" aria-label={`Изменить тип ${type.name}`} className="rounded-lg p-2 hover:bg-surface2"><Pencil size={16} /></button>{type.is_active ? <button onClick={() => setTypeActive(type, false)} title="Архивировать" aria-label={`Архивировать ${type.name}`} className="rounded-lg p-2 text-error hover:bg-surface2"><Trash2 size={16} /></button> : <button onClick={() => setTypeActive(type, true)} className="text-sm text-primary hover:underline">Активировать</button>}</div>}
              </div>

              {user?.role === 'admin' && !type.is_active && <p className="mb-3 text-xs text-warning">В архиве</p>}

              {type.description && (
                <p className="text-textSecondary mb-4">{type.description}</p>
              )}

              <div className="space-y-2 text-textSecondary text-sm mb-4">
                <div className="flex items-center space-x-2">
                  <Clock size={16} />
                  <span>Длительность: {type.duration_days} дней</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} />
                  <span>{type.visit_count == null ? 'Без ограничений по посещениям' : `Посещений: ${type.visit_count}`}</span>
                </div>
              </div>

              {user?.role === 'client' && type.is_active && <button className="btn btn-primary w-full">Купить</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MembershipsPage;
