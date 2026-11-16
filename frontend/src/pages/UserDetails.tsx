import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Mail, Phone, UserRound } from 'lucide-react';
import api from '../services/api';
import { DirectoryUser, UserRole } from '../types';
import { normalizeMediaUrl } from '../lib/media';

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  trainer: 'Тренер',
  client: 'Клиент',
};

const UserDetailsPage = () => {
  const { id } = useParams();
  const [person, setPerson] = useState<DirectoryUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Пользователь не найден.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await api.get<DirectoryUser>(`/users/${encodeURIComponent(id)}`);
        if (!cancelled) {
          setPerson(response.data);
          setError('');
        }
      } catch (requestError: unknown) {
        if (!cancelled) {
          const message = typeof requestError === 'object' && requestError !== null && 'response' in requestError
            ? (requestError as { response?: { data?: { error?: string } } }).response?.data?.error
            : undefined;
          setError(message || 'Не удалось загрузить профиль пользователя.');
          setPerson(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchUser();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="py-8 text-center">Загрузка профиля...</div>;

  if (!person) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link to="/users" className="mb-5 inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft size={16} />
          К списку пользователей
        </Link>
        <p role="alert" className="card text-error">{error || 'Пользователь не найден.'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/users" className="mb-6 inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft size={16} />
        К списку пользователей
      </Link>

      <section className="card">
        <header className="flex flex-wrap items-center gap-5 border-b border-surface2 pb-6">
          {person.photo_url ? (
            <img
              src={normalizeMediaUrl(person.photo_url)}
              alt=""
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
              <UserRound size={34} className="text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-bold sm:text-3xl">{person.full_name}</h1>
            <p className="mt-1 text-primary">{roleLabels[person.role]}</p>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              person.is_active ? 'bg-green-100 text-green-800' : 'bg-surface2 text-textSecondary'
            }`}>
              {person.is_active ? 'Активный аккаунт' : 'Аккаунт неактивен'}
            </span>
          </div>
        </header>

        <dl className="divide-y divide-surface2">
          <div className="flex flex-wrap items-center gap-3 py-4">
            <dt className="flex w-36 items-center gap-2 text-sm text-textSecondary">
              <Mail size={17} />
              Email
            </dt>
            <dd className="min-w-0">
              <a href={`mailto:${person.email}`} className="break-all text-primary hover:underline">{person.email}</a>
            </dd>
          </div>
          <div className="flex flex-wrap items-center gap-3 py-4">
            <dt className="flex w-36 items-center gap-2 text-sm text-textSecondary">
              <Phone size={17} />
              Телефон
            </dt>
            <dd>
              {person.phone
                ? <a href={`tel:${person.phone}`} className="text-primary hover:underline">{person.phone}</a>
                : <span className="text-textSecondary">Не указан</span>}
            </dd>
          </div>
          <div className="flex flex-wrap items-center gap-3 py-4">
            <dt className="flex w-36 items-center gap-2 text-sm text-textSecondary">
              <CalendarDays size={17} />
              В студии с
            </dt>
            <dd>{new Date(person.created_at).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
};

export default UserDetailsPage;
