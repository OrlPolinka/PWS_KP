import { useState, useEffect, FormEvent } from 'react';
import { Calendar, User as UserIcon, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { News } from '../types';
import { useAuth } from '../contexts/AuthContext';

const NewsPage = () => {
  const { user } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
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
      await api.post('/news', { title, content, image_url: imageUrl || undefined });
      setTitle('');
      setContent('');
      setImageUrl('');
      setFormOpen(false);
      await fetchNews();
    } catch (createError: any) {
      setError(createError.response?.data?.error || 'Не удалось добавить новость');
    }
  };

  const deleteNews = async (id: string) => {
    if (!window.confirm('Удалить эту новость?')) return;
    try {
      await api.delete(`/news/${id}`);
      await fetchNews();
    } catch (deleteError: any) {
      window.alert(deleteError.response?.data?.error || 'Не удалось удалить новость');
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
        <h1 className="text-3xl font-bold">Новости</h1>
        {user?.role === 'admin' && <button onClick={() => setFormOpen(!formOpen)} className="btn btn-primary flex items-center gap-2"><Plus size={18} />Добавить новость</button>}
      </div>

      {formOpen && user?.role === 'admin' && (
        <form onSubmit={createNews} className="card mb-8 space-y-4">
          <label className="block text-sm">Заголовок<input required maxLength={255} className="input mt-1" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="block text-sm">Текст новости<textarea required rows={5} className="input mt-1" value={content} onChange={(event) => setContent(event.target.value)} /></label>
          <label className="block text-sm">Ссылка на изображение<input type="url" className="input mt-1" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></label>
          {error && <p role="alert" className="text-error">{error}</p>}
          <button type="submit" className="btn btn-primary">Опубликовать</button>
        </form>
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

            {item.image_url && <img src={item.image_url} alt="" className="mb-4 max-h-96 w-full rounded-lg object-cover" />}

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
