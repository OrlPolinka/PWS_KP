import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Search, UserRound } from 'lucide-react';
import api from '../services/api';
import { DirectoryUser, UserRole } from '../types';
import { normalizeMediaUrl, showMediaPlaceholder } from '../lib/media';

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  trainer: 'Тренер',
  client: 'Клиент',
};

const UsersPage = () => {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const resetFilters = () => {
    setSearch('');
    setRole('');
    setActive('');
  };

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get<DirectoryUser[]>('/users', {
          params: {
            search: search.trim() || undefined,
            role: role || undefined,
            is_active: active || undefined,
          },
        });
        if (!cancelled) {
          setUsers(response.data);
          setError('');
        }
      } catch (requestError: unknown) {
        if (!cancelled) {
          const message = typeof requestError === 'object' && requestError !== null && 'response' in requestError
            ? (requestError as { response?: { data?: { error?: string } } }).response?.data?.error
            : undefined;
          setError(message || 'Не удалось загрузить список пользователей.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search, role, active]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Пользователи</h1>
        <p className="mt-2 text-textSecondary">Клиенты, тренеры и администраторы студии</p>
      </div>

      <section className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr]">
        <label className="text-sm">
          Поиск по имени, email или телефону
          <span className="relative mt-1 block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-10"
              placeholder="Начните вводить..."
            />
          </span>
        </label>
        <label className="text-sm">
          Роль
          <select value={role} onChange={(event) => setRole(event.target.value)} className="input mt-1">
            <option value="">Все роли</option>
            <option value="client">Клиенты</option>
            <option value="trainer">Тренеры</option>
            <option value="admin">Администраторы</option>
          </select>
        </label>
        <label className="text-sm">
          Статус аккаунта
          <select value={active} onChange={(event) => setActive(event.target.value)} className="input mt-1">
            <option value="">Любой</option>
            <option value="true">Активные</option>
            <option value="false">Неактивные</option>
          </select>
        </label>
        <button type="button" onClick={resetFilters} className="text-left text-sm text-primary hover:underline sm:col-span-2 lg:col-span-3">
          Сбросить фильтры
        </button>
      </section>

      {error && <p role="alert" className="card mb-4 border-error text-error">{error}</p>}
      <p className="mb-4 text-sm text-textSecondary">
        {loading ? 'Загрузка пользователей...' : `Найдено пользователей: ${users.length}`}
      </p>

      {!loading && users.length === 0 ? (
        <div className="card text-center text-textSecondary">
          Пользователи по выбранным критериям не найдены.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((person) => (
            <Link
              key={person.id}
              to={`/users/${person.id}`}
              className="card flex min-w-0 items-start gap-4 transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {person.photo_url ? (
                <img
                  src={normalizeMediaUrl(person.photo_url)}
                  onError={showMediaPlaceholder}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <UserRound size={25} className="text-primary" />
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="break-words font-bold">{person.full_name}</span>
                  {!person.is_active && (
                    <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-textSecondary">Неактивен</span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-primary">{roleLabels[person.role]}</span>
                <span className="mt-3 flex min-w-0 items-center gap-2 text-sm text-textSecondary">
                  <Mail size={15} className="shrink-0" />
                  <span className="truncate">{person.email}</span>
                </span>
                {person.phone && (
                  <span className="mt-1 flex items-center gap-2 text-sm text-textSecondary">
                    <Phone size={15} className="shrink-0" />
                    <span>{person.phone}</span>
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default UsersPage;
