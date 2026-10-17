import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

const GoogleAuthCallback = () => {
  const { completeGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const callbackParams = new URLSearchParams(window.location.hash.slice(1));
    const token = callbackParams.get('token');
    const serializedUser = callbackParams.get('user');
    window.history.replaceState({}, document.title, window.location.pathname);

    if (!token || !serializedUser) {
      setError('Не удалось завершить вход через Google. Попробуйте войти ещё раз.');
      return;
    }

    try {
      const user = JSON.parse(serializedUser) as Partial<User>;
      if (
        !user.id ||
        !user.email ||
        !user.full_name ||
        !user.role ||
        !['admin', 'trainer', 'client'].includes(user.role)
      ) {
        throw new Error('Invalid Google authentication response');
      }
      completeGoogleLogin({ user: user as User, token });
      navigate('/dashboard', { replace: true });
    } catch (callbackError) {
      console.error('Failed to process Google authentication response:', callbackError);
      setError('Не удалось обработать ответ Google. Попробуйте войти ещё раз.');
    }
  }, [completeGoogleLogin, navigate]);

  if (!error) return <div className="min-h-screen flex items-center justify-center">Выполняется вход через Google…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md text-center">
        <p role="alert" className="text-error">{error}</p>
        <Link to="/login" className="mt-4 inline-block text-primary hover:underline">Вернуться ко входу</Link>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
