import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, CreditCard, MessageSquare, Newspaper, Bell } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    { icon: Calendar, label: 'Занятий на неделе', value: '12', color: 'text-primary' },
    { icon: Users, label: 'Активных клиентов', value: '45', color: 'text-success' },
    { icon: CreditCard, label: 'Активных абонементов', value: '38', color: 'text-warning' },
    { icon: MessageSquare, label: 'Новых сообщений', value: '5', color: 'text-primary' },
  ];

  const adminStats = [
    { icon: Users, label: 'Всего пользователей', value: '120', color: 'text-primary' },
    { icon: Calendar, label: 'Занятий сегодня', value: '8', color: 'text-success' },
    { icon: CreditCard, label: 'Запросов на продление', value: '3', color: 'text-warning' },
    { icon: Newspaper, label: 'Опубликовано новостей', value: '15', color: 'text-primary' },
  ];

  const clientStats = [
    { icon: Calendar, label: 'Предстоящих занятий', value: '3', color: 'text-primary' },
    { icon: CreditCard, label: 'Осталось посещений', value: '5', color: 'text-success' },
    { icon: MessageSquare, label: 'Непрочитанных сообщений', value: '2', color: 'text-warning' },
    { icon: Bell, label: 'Новых уведомлений', value: '1', color: 'text-primary' },
  ];

  const displayStats = user?.role === 'admin' ? adminStats : user?.role === 'client' ? clientStats : stats;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Добро пожаловать, {user?.full_name}!</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {displayStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-textSecondary text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <Icon size={32} className={stat.color} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Ближайшие занятия</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-surface2 rounded-lg">
                <div>
                  <p className="font-medium">Хип-хоп</p>
                  <p className="text-sm text-textSecondary">Сегодня, 18:00</p>
                </div>
                <span className="text-primary">Зал 1</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Последние новости</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-surface2 rounded-lg">
                <p className="font-medium">Новый стиль танцев - Contemporary</p>
                <p className="text-sm text-textSecondary mt-1">2 часа назад</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
