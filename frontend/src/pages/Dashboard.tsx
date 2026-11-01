import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Bell,
  Calendar,
  CreditCard,
  MessageSquare,
  Newspaper,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface DashboardStat {
  key: string;
  value: number | string;
}

interface DashboardClass {
  id: string;
  dance_style_name: string;
  trainer_name: string;
  hall_name: string;
  class_date: string;
  start_time: string;
}

interface DashboardNews {
  id: string;
  title: string;
  created_at: string;
}

interface DashboardData {
  stats: DashboardStat[];
  upcomingClasses: DashboardClass[];
  latestNews: DashboardNews[];
}

const statDisplay: Record<string, { label: string; icon: typeof Calendar; color: string }> = {
  users: { label: 'Активных пользователей', icon: Users, color: 'text-primary' },
  classes_today: { label: 'Занятий сегодня', icon: Calendar, color: 'text-success' },
  extension_requests: { label: 'Запросов на продление', icon: CreditCard, color: 'text-warning' },
  published_news: { label: 'Опубликовано новостей', icon: Newspaper, color: 'text-primary' },
  classes_week: { label: 'Занятий на этой неделе', icon: Calendar, color: 'text-primary' },
  active_clients: { label: 'Клиентов с занятиями в ближайший месяц', icon: Users, color: 'text-success' },
  upcoming_classes: { label: 'Предстоящих занятий', icon: Calendar, color: 'text-primary' },
  remaining_visits: { label: 'Осталось посещений', icon: CreditCard, color: 'text-success' },
  unread_messages: { label: 'Непрочитанных сообщений', icon: MessageSquare, color: 'text-warning' },
  unread_notifications: { label: 'Непрочитанных уведомлений', icon: Bell, color: 'text-primary' },
};

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<DashboardData>('/dashboard')
      .then(({ data }) => {
        if (active) setDashboard(data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        const apiError = axios.isAxiosError<{ error?: string }>(loadError)
          ? loadError.response?.data?.error
          : undefined;
        setError(apiError || 'Не удалось загрузить данные главной страницы.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const formatClassDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    });

  const formatNewsDate = (date: string) =>
    new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  if (loading) return <div className="py-8 text-center">Загрузка...</div>;

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">Добро пожаловать, {user?.full_name}!</h1>

      {error && <p role="alert" className="card mb-6 text-error">{error}</p>}

      {dashboard && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {dashboard.stats.map((stat) => {
              const display = statDisplay[stat.key];
              if (!display) return null;
              const Icon = display.icon;
              return (
                <div key={stat.key} className="card">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="mb-1 text-sm text-textSecondary">{display.label}</p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <Icon size={32} className={display.color} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="card">
              <h2 className="mb-4 text-xl font-bold">Ближайшие занятия</h2>
              {dashboard.upcomingClasses.length ? (
                <div className="space-y-3">
                  {dashboard.upcomingClasses.map((item) => (
                    <div key={`${item.id}-${item.class_date}`} className="rounded-lg bg-surface2 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.dance_style_name}</p>
                          <p className="text-sm text-textSecondary">
                            {formatClassDate(item.class_date)}, {item.start_time.slice(0, 5)}
                          </p>
                          <p className="text-sm text-textSecondary">Тренер: {item.trainer_name}</p>
                        </div>
                        <span className="text-primary">{item.hall_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-textSecondary">Ближайших занятий пока нет.</p>
              )}
            </section>

            <section className="card">
              <h2 className="mb-4 text-xl font-bold">Последние новости</h2>
              {dashboard.latestNews.length ? (
                <div className="space-y-3">
                  {dashboard.latestNews.map((item) => (
                    <article key={item.id} className="rounded-lg bg-surface2 p-3">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-textSecondary">{formatNewsDate(item.created_at)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-textSecondary">Опубликованных новостей пока нет.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
