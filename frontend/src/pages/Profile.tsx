import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Camera, Save, UserRound } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

type ProfileForm = Pick<User, 'full_name' | 'email'> & { phone: string };

const roleLabels: Record<User['role'], string> = {
  admin: 'Администратор',
  trainer: 'Тренер',
  client: 'Клиент',
};

const normalizePhone = (value: string) => value.replace(/[\s\u00a0\u202f().-]/g, '');

const loadProfileImage = (src: string) => new Promise<void>((resolve, reject) => {
  const image = new Image();
  const timeout = window.setTimeout(() => reject(new Error('Превышено время ожидания загрузки фото.')), 10000);
  image.onload = () => {
    window.clearTimeout(timeout);
    resolve();
  };
  image.onerror = () => {
    window.clearTimeout(timeout);
    reject(new Error('Фото сохранено, но не открывается. Проверьте адрес backend и доступность папки /uploads.'));
  };
  image.src = src;
});

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState<ProfileForm>({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(user?.photo_url || '');
  const [photoPreviewError, setPhotoPreviewError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(user?.photo_url || '');
      setPhotoPreviewError(false);
      return;
    }

    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    setPhotoPreviewError(false);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo, user?.photo_url]);

  useEffect(() => {
    let active = true;
    api.get<Partial<User>>('/auth/me')
      .then(({ data }) => {
        if (!active) return;
        if (data.full_name && data.email) {
          setForm({ full_name: data.full_name, email: data.email, phone: data.phone || '' });
          updateUser(data);
        }
      })
      .catch((loadError: unknown) => {
        console.error('Failed to load account profile:', loadError);
        if (active) setError('Не удалось загрузить актуальные данные профиля.');
      });
    return () => { active = false; };
  }, [updateUser]);

  const onPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setError('');
    setNotice('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
      setError('Выберите изображение в формате JPEG, PNG или WebP.');
      event.target.value = '';
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Размер фотографии не должен превышать 5 МБ.');
      event.target.value = '';
      return;
    }
    setPhoto(selectedFile);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (form.full_name.trim().length < 2) {
      setError('Имя должно содержать не менее 2 символов.');
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError('Новый пароль должен содержать не менее 8 символов.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Новый пароль и подтверждение не совпадают.');
      return;
    }
    const normalizedPhone = normalizePhone(form.phone);
    const phoneDigits = normalizedPhone.replace(/\D/g, '');
    if (
      normalizedPhone &&
      (!/^\+?\d+$/.test(normalizedPhone) || phoneDigits.length < 7 || phoneDigits.length > 15)
    ) {
      setError('Введите телефон с 7–15 цифрами. Можно использовать +, пробелы, скобки и дефисы.');
      return;
    }
    const data = new FormData();
    data.append('full_name', form.full_name.trim());
    data.append('email', form.email.trim());
    data.append('phone', normalizedPhone);
    if (photo) data.append('photo', photo);
    if (newPassword) {
      data.append('current_password', currentPassword);
      data.append('new_password', newPassword);
    }

    setLoading(true);
    try {
      const response = await api.patch<Partial<User>>('/users/me/profile', data, {
        headers: { 'Content-Type': undefined },
      });
      if (photo) {
        if (!response.data.photo_url || response.data.photo_url === user?.photo_url) {
          throw new Error('Сервер не подтвердил загрузку фото. Проверьте подключение и повторите попытку.');
        }
        await loadProfileImage(response.data.photo_url);
      }
      updateUser(response.data);
      setPhoto(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice(photo ? 'Личные данные и фото сохранены.' : 'Личные данные сохранены.');
    } catch (saveError: unknown) {
      const responseData = typeof saveError === 'object' && saveError !== null && 'response' in saveError
        ? (saveError as { response?: { data?: { error?: string; message?: string } } }).response?.data
        : undefined;
      const message = saveError instanceof Error ? saveError.message : undefined;
      setError(responseData?.error || responseData?.message || message || 'Не удалось сохранить данные профиля.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex items-center gap-3">
        <UserRound size={28} className="text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Личный кабинет</h1>
          <p className="mt-1 text-textSecondary">{roleLabels[user.role]}</p>
        </div>
      </header>

      {error && <p role="alert" className="card mb-4 border-error text-error">{error}</p>}
      {notice && <p role="status" className="card mb-4 border-success text-success">{notice}</p>}

      <form className="space-y-6" onSubmit={saveProfile}>
        <section className="card">
          <h2 className="mb-5 text-xl font-semibold">Личная информация</h2>
          <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface2">
              {photoPreview && !photoPreviewError
                ? <img src={photoPreview} alt="Фото профиля" onError={() => setPhotoPreviewError(true)} className="h-full w-full object-cover" />
                : <UserRound size={44} className="text-textSecondary" />}
            </div>
            <div>
              <label className="btn btn-secondary inline-flex cursor-pointer items-center gap-2">
                <Camera size={18} />
                Загрузить фото
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={onPhotoChange}
                />
              </label>
              <p className="mt-2 text-sm text-textSecondary">JPEG, PNG или WebP, до 5 МБ.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Имя и фамилия
              <input
                className="input mt-1"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <label className="text-sm">
              Электронная почта
              <input
                type="email"
                className="input mt-1"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Телефон
              <input
                type="tel"
                className="input mt-1"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                maxLength={25}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+375 29 123-45-67"
              />
              <span className="mt-1 block text-xs text-textSecondary">От 7 до 15 цифр; можно указать код страны.</span>
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-2 text-xl font-semibold">Изменить пароль</h2>
          <p className="mb-5 text-sm text-textSecondary">
            Оставьте новые поля пустыми, если не хотите менять пароль. Для аккаунта с паролем потребуется текущий пароль.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              Текущий пароль
              <input
                type="password"
                className="input mt-1"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className="text-sm">
              Новый пароль
              <input
                type="password"
                className="input mt-1"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            <label className="text-sm">
              Повторите новый пароль
              <input
                type="password"
                className="input mt-1"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          </div>
        </section>

        <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={loading}>
          <Save size={18} />
          {loading ? 'Сохранение…' : 'Сохранить изменения'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
