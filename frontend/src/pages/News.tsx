import { useState, useEffect, FormEvent } from 'react';
import { Calendar, User as UserIcon, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { News } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { normalizeMediaUrl, showMediaPlaceholder } from '../lib/media';
import { useActionDialog } from '../components/ActionDialog';
import Modal from '../components/Modal';

const NewsPage = () => {
  const { user } = useAuth();
  const { confirm, alert, dialog } = useActionDialog();
  const [news, setNews] = useState<News[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await api.get<News[]>('/news');
      setNews(response.data);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNews = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      const data = new FormData();
      data.append('title', title);
      data.append('content', content);
      if (image) data.append('image', image);
      await api.post('/news', data, { headers: { 'Content-Type': undefined } });
      setTitle('');
      setContent('');
      setImage(null);
      setFormOpen(false);
      await fetchNews();
    } catch (createError: any) {
      setError(createError.response?.data?.error || 'Не удалось добавить новость');
    }
  };

  const deleteNews = async (id: string) => {
    if (!await confirm('Удалить эту новость?')) return;
    try {
      await api.delete(`/news/${id}`);
      await fetchNews();
    } catch (deleteError: any) {
      await alert(deleteError.response?.data?.error || 'Не удалось удалить новость');
    }
  };

  const openCreateForm = () => {
    setTitle('');
    setContent('');
    setImage(null);
    setError('');
    setFormOpen(true);
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
      {dialog}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Новости</h1>
        {user?.role === 'admin' && <button type="button" onClick={openCreateForm} className="btn btn-primary flex items-center gap-2"><Plus size={18} />Добавить новость</button>}
      </div>

      {formOpen && user?.role === 'admin' && (
        <Modal title="Новая новость" onClose={() => setFormOpen(false)}>
          <form onSubmit={createNews} className="space-y-4">
            <label className="block text-sm">Заголовок<input required maxLength={255} className="input mt-1" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="block text-sm">Текст новости<textarea required rows={5} className="input mt-1" value={content} onChange={(event) => setContent(event.target.value)} /></label>
            <label className="block text-sm">Изображение новости
              <input type="file" accept="image/jpeg,image/png,image/webp" className="input mt-1" onChange={(event) => setImage(event.target.files?.[0] || null)} />
              <span className="mt-1 block text-xs text-textSecondary">JPEG, PNG или WebP, до 5 МБ.</span>
            </label>
            {error && <p role="alert" className="text-error">{error}</p>}
            <button type="submit" className="btn btn-primary">Опубликовать</button>
          </form>
        </Modal>
      )}

      <div className="grid grid-cols-1 gap-6">
        {news.filter((item) => user?.role === 'admin' || item.is_published).map((item) => (
          <div key={item.id} className="card">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
                <div className="flex items-center space-x-4 text-textSecondary text-sm">
                  <div className="flex items-center space-x-1">
                    <UserIcon size={14} />
                    <span>{item.author_name || item.author?.full_name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
              {user?.role === 'admin' && <button onClick={() => deleteNews(item.id)} aria-label="Удалить новость" title="Удалить новость" className="rounded-lg p-2 text-error hover:bg-surface2"><Trash2 size={18} /></button>}
            </div>

            {user?.role === 'admin' && !item.is_published && <p className="mb-3 text-sm text-warning">Черновик</p>}

            {item.image_url && <img src={normalizeMediaUrl(item.image_url)} alt="" onError={showMediaPlaceholder} className="mb-4 max-h-96 w-full rounded-lg object-cover" />}

            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{item.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsPage;
