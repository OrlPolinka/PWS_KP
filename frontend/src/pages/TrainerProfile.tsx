import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ImagePlus, Save, User } from 'lucide-react';
import api from '../services/api';
import { ScheduleListItem, TrainerListItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

const weekdays = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const mediaUrls = (gallery?: TrainerListItem['gallery']) => (gallery || []).map((item) =>
  typeof item === 'string' ? item : item.url
);

const youtubeEmbedUrl = (value: string) => {
  try {
    const url = new URL(value);
    const videoId = url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : url.hostname.endsWith('youtube.com')
        ? url.searchParams.get('v')
        : null;
    return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` : null;
  } catch {
    return null;
  }
};

const TrainerProfilePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isOwnProfile = !id && user?.role === 'trainer';
  const [profile, setProfile] = useState<TrainerListItem | null>(null);
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [galleryText, setGalleryText] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get<TrainerListItem>(isOwnProfile ? '/trainers/me/profile' : `/trainers/${id}`);
      setProfile(response.data);
      setGalleryText(mediaUrls(response.data.gallery).join('\n'));
    } catch (fetchError: any) {
      setError(fetchError.response?.data?.error || 'Не удалось загрузить профиль тренера');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [id, isOwnProfile]);

  useEffect(() => {
    if (!profile?.id) return;
    let current = true;
    setSchedules([]);
    setSchedulesLoading(true);
    api.get<ScheduleListItem[]>('/schedule', {
      params: { trainer_id: profile.id, status: 'scheduled' },
    }).then((response) => {
      if (current) setSchedules(response.data);
    }).catch((fetchError) => {
      console.error('Error fetching trainer schedule:', fetchError);
      if (current) setSchedules([]);
    }).finally(() => {
      if (current) setSchedulesLoading(false);
    });
    return () => { current = false; };
  }, [profile?.id]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError('');
    try {
      const response = await api.patch<TrainerListItem>('/trainers/me/profile', {
        specialization: profile.specialization,
        bio: profile.bio,
        experience_years: profile.experience_years,
        education: profile.education,
        achievements: profile.achievements,
        video_url: profile.video_url,
        custom_page_title: profile.custom_page_title,
        custom_page_content: profile.custom_page_content,
        gallery: galleryText.split('\n').map((url) => url.trim()).filter(Boolean),
      });
      setProfile(response.data);
      setGalleryText(mediaUrls(response.data.gallery).join('\n'));
    } catch (saveError: any) {
      setError(saveError.response?.data?.error || 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  const uploadMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    const payload = new FormData();
    Array.from(files).forEach((file) => payload.append('media', file));
    setSaving(true);
    setError('');
    try {
      const response = await api.post<TrainerListItem>('/trainers/me/media', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(response.data);
      setGalleryText(mediaUrls(response.data.gallery).join('\n'));
    } catch (uploadError: any) {
      setError(uploadError.response?.data?.error || 'Не удалось загрузить медиа');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center">Загрузка...</div>;
  if (!profile) return <div className="card text-center"><p>{error || 'Профиль не найден'}</p><Link to="/trainers" className="mt-4 inline-block text-primary hover:underline">Вернуться к тренерам</Link></div>;

  const gallery = galleryText.split('\n').map((url) => url.trim()).filter(Boolean);
  const photoUrl = profile.photo_url || profile.user_photo_url;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/trainers" className="mb-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft size={16} />К списку тренеров</Link>
      <header className="mb-8 flex flex-wrap items-center gap-5">
        {photoUrl ? <img src={photoUrl} alt={profile.full_name} className="h-24 w-24 rounded-full object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20"><User size={36} className="text-primary" /></div>}
        <div>
          <h1 className="text-3xl font-bold">{profile.full_name}</h1>
          <p className="mt-1 text-primary">{profile.specialization || 'Тренер'}</p>
          {profile.experience_years !== undefined && <p className="mt-1 text-sm text-textSecondary">Опыт: {profile.experience_years} лет</p>}
        </div>
      </header>

      {isOwnProfile ? <form onSubmit={saveProfile} className="space-y-5">
        <label className="block text-sm">Направление<input className="input mt-1" value={profile.specialization || ''} onChange={(event) => setProfile({ ...profile, specialization: event.target.value })} /></label>
        <label className="block text-sm">Ссылка на фото профиля<input type="url" className="input mt-1" value={profile.photo_url || ''} onChange={(event) => setProfile({ ...profile, photo_url: event.target.value })} /></label>
        <label className="block text-sm">О себе<textarea rows={5} className="input mt-1" value={profile.bio || ''} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">Опыт, лет<input type="number" min={0} className="input mt-1" value={profile.experience_years ?? ''} onChange={(event) => setProfile({ ...profile, experience_years: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
          <label className="block text-sm">Образование<input className="input mt-1" value={profile.education || ''} onChange={(event) => setProfile({ ...profile, education: event.target.value })} /></label>
        </div>
        <label className="block text-sm">Достижения<textarea rows={3} className="input mt-1" value={profile.achievements || ''} onChange={(event) => setProfile({ ...profile, achievements: event.target.value })} /></label>
        <label className="block text-sm">Название страницы<input className="input mt-1" value={profile.custom_page_title || ''} onChange={(event) => setProfile({ ...profile, custom_page_title: event.target.value })} /></label>
        <label className="block text-sm">Дополнительное описание<textarea rows={4} className="input mt-1" value={profile.custom_page_content || ''} onChange={(event) => setProfile({ ...profile, custom_page_content: event.target.value })} /></label>
        <label className="block text-sm">Ссылка на видео<input type="url" className="input mt-1" value={profile.video_url || ''} onChange={(event) => setProfile({ ...profile, video_url: event.target.value })} /></label>
        <label className="block text-sm">Медиа: по одной ссылке на строку<textarea rows={4} className="input mt-1 font-mono text-xs" value={galleryText} onChange={(event) => setGalleryText(event.target.value)} /></label>
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-surface2 px-4 py-2 text-sm hover:bg-surface2">
          <ImagePlus size={18} />Загрузить фото или видео
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple className="sr-only" onChange={(event) => { void uploadMedia(event.target.files); event.target.value = ''; }} />
        </label>
        {error && <p role="alert" className="text-error">{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={17} />{saving ? 'Сохранение...' : 'Сохранить профиль'}</button>
      </form> : <div className="space-y-5">
        {profile.bio && <p className="whitespace-pre-wrap leading-relaxed">{profile.bio}</p>}
        {profile.education && <section><h2 className="mb-2 text-lg font-bold">Образование</h2><p className="whitespace-pre-wrap text-textSecondary">{profile.education}</p></section>}
        {profile.achievements && <section><h2 className="mb-2 text-lg font-bold">Достижения</h2><p className="whitespace-pre-wrap text-textSecondary">{profile.achievements}</p></section>}
        {(profile.custom_page_title || profile.custom_page_content) && <section><h2 className="mb-2 text-lg font-bold">{profile.custom_page_title || 'О тренере'}</h2><p className="whitespace-pre-wrap text-textSecondary">{profile.custom_page_content}</p></section>}
        {profile.video_url && (/\.(mp4|webm)(\?|$)/i.test(profile.video_url)
          ? <video src={profile.video_url} controls className="max-h-[32rem] w-full rounded-lg bg-black" />
          : youtubeEmbedUrl(profile.video_url)
            ? <iframe src={youtubeEmbedUrl(profile.video_url) || undefined} title={`Видео ${profile.full_name}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="aspect-video w-full rounded-lg border-0" />
            : <a href={profile.video_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Посмотреть видео</a>)}
        {gallery.length > 0 && <section><h2 className="mb-4 text-xl font-bold">Фото и видео</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{gallery.map((url) => /\.(mp4|webm)(\?|$)/i.test(url) ? <video key={url} src={url} controls className="w-full rounded-lg bg-black" /> : <img key={url} src={url} alt={`Медиа ${profile.full_name}`} className="max-h-96 w-full rounded-lg object-cover" />)}</div></section>}
        {!profile.bio && !profile.education && !profile.achievements && gallery.length === 0 && !profile.video_url && <p className="text-textSecondary">Тренер пока не добавил информацию о себе.</p>}
      </div>}

      <section className="mt-8 border-t border-surface2 py-6">
        <h2 className="mb-4 text-xl font-bold">Расписание и направления</h2>
        <Link to={`/schedule?trainer=${profile.id}`} className="mb-4 inline-flex items-center gap-2 text-primary hover:underline">
          <CalendarDays size={17} />Все занятия тренера
        </Link>
        {schedulesLoading ? <p className="text-sm text-textSecondary">Загрузка расписания...</p> : schedules.length > 0 ? <div className="divide-y divide-surface2">
          {schedules.map((schedule) => <div key={schedule.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="text-sm text-textSecondary">{weekdays[schedule.day_of_week]} · {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</span>
            <div className="flex flex-wrap items-center gap-4">
              <Link to={`/schedule/${schedule.id}`} className="text-primary hover:underline">{schedule.dance_style_name}</Link>
              <Link to={`/styles/${schedule.dance_style_id}`} className="text-sm text-textSecondary hover:text-primary">О стиле</Link>
            </div>
          </div>)}
        </div> : <p className="text-sm text-textSecondary">У тренера пока нет занятий в расписании.</p>}
      </section>
    </div>
  );
};

export default TrainerProfilePage;
