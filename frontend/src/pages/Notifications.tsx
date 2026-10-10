import { useState, useEffect } from 'react';
import { Bell, Check, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { Notification } from '../types';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Только что';
    if (hours < 24) return `${hours} ч. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Уведомления</h1>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn btn-secondary flex items-center space-x-2">
            <CheckCircle size={18} />
            <span>Отметить все как прочитанные</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <Bell size={48} className="text-textSecondary mx-auto mb-4" />
          <p className="text-textSecondary">У вас нет уведомлений</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`card ${!notification.is_read ? 'border-primary' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-bold">{notification.title}</h3>
                    {!notification.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                    )}
                  </div>
                  <p className="text-textSecondary mb-2">{notification.message}</p>
                  <p className="text-sm text-textSecondary">{formatDate(notification.created_at)}</p>
                </div>
                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="p-2 hover:bg-surface2 rounded-lg transition-colors"
                  >
                    <Check size={18} className="text-textSecondary" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
