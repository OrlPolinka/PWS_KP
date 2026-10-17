import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus } from 'lucide-react';
import { authService } from '../services/authService';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        role: 'client',
        full_name: formData.full_name,
        phone: formData.phone || undefined,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Dance Studio</h1>
            <p className="text-textSecondary">Создайте аккаунт</p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          Регистрация доступна только для клиентов. Администраторы и тренеры создаются администратором.

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-medium mb-2">Полное имя</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="input"
                placeholder="Иван Иванов"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Телефон (необязательно)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Пароль</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Подтвердите пароль</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center space-x-2"
            >
              <UserPlus size={18} />
              <span>{loading ? 'Регистрация...' : 'Зарегистрироваться'}</span>
            </button>
          </form>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => authService.googleLogin()}
              className="btn btn-secondary w-full flex items-center justify-center space-x-2"
            >
              <span>Зарегистрироваться через Google</span>
            </button>
          </div>

          <div className="mt-6 text-center text-textSecondary">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
