import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import api from '../services/api';

interface ExtensionRequest {
  id: string;
  membership_id: string;
  client_name: string;
  membership_type_name: string;
  end_date: string;
  reason: string;
  requested_days: number | null;
  requested_visits: number | null;
  requested_unit: 'days' | 'visits';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const MembershipExtensionRequestsPage = () => {
  const [requests, setRequests] = useState<ExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await api.get<ExtensionRequest[]>('/memberships/extension-requests', {
        params: { status: 'pending' },
      });
      setRequests(response.data);
      setError('');
    } catch (fetchError: unknown) {
      const message = typeof fetchError === 'object' && fetchError !== null && 'response' in fetchError
        ? (fetchError as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(message || 'Не удалось загрузить запросы на продление.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const reviewRequest = async (requestId: string, decision: 'approve' | 'reject') => {
    setReviewingId(requestId);
    setError('');
    try {
      await api.patch(`/memberships/extension-requests/${encodeURIComponent(requestId)}/${decision}`);
      await fetchRequests();
    } catch (reviewError: unknown) {
      const message = typeof reviewError === 'object' && reviewError !== null && 'response' in reviewError
        ? (reviewError as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(message || 'Не удалось обработать запрос.');
    } finally {
      setReviewingId(null);
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (loading) return <div className="py-8 text-center">Загрузка...</div>;

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Clock className="text-primary" size={28} />
        <h1 className="text-3xl font-bold">Запросы на продление</h1>
      </div>

      {error && <p role="alert" className="card mb-6 border-error text-error">{error}</p>}
      {requests.length === 0 ? (
        <div className="card text-center text-textSecondary">Новых запросов на продление нет.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <article key={request.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold">{request.membership_type_name}</h2>
                  <p className="mt-1 text-textSecondary">Клиент: {request.client_name}</p>
                  <p className="text-sm text-textSecondary">
                    Абонемент истёк {formatDate(request.end_date)} · запрос от {formatDate(request.created_at)}
                  </p>
                  <p className="mt-4">
                    Просит добавить: <strong>
                      {request.requested_unit === 'visits'
                        ? `${request.requested_visits} занятий`
                        : `${request.requested_days} дней`}
                    </strong>
                  </p>
                  <div className="mt-3 rounded-lg bg-surface2 p-3">
                    <h3 className="mb-1 text-sm font-semibold">Причина</h3>
                    <p className="whitespace-pre-wrap">{request.reason}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void reviewRequest(request.id, 'approve')}
                    disabled={reviewingId !== null}
                    className="btn btn-primary flex items-center gap-2 disabled:opacity-60"
                  >
                    <Check size={18} />
                    {reviewingId === request.id ? 'Обработка...' : 'Одобрить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void reviewRequest(request.id, 'reject')}
                    disabled={reviewingId !== null}
                    className="btn btn-secondary flex items-center gap-2 disabled:opacity-60"
                  >
                    <X size={18} />
                    Отклонить
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default MembershipExtensionRequestsPage;
