import { FormEvent, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Clock, CheckCircle, Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { DanceStyle, MembershipType, Membership } from '../types';
import { useAuth } from '../contexts/AuthContext';

type MembershipTypeForm = {
  name: string;
  description: string;
  price: string;
  visit_count: string;
  duration_days: string;
};

const emptyForm: MembershipTypeForm = { name: '', description: '', price: '', visit_count: '', duration_days: '30' };

const getPaymentError = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  return fallback;
};

const MembershipsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [myMemberships, setMyMemberships] = useState<Membership[]>([]);
  const [danceStyles, setDanceStyles] = useState<DanceStyle[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [myMembershipSearch, setMyMembershipSearch] = useState('');
  const [myMembershipStatus, setMyMembershipStatus] = useState('');
  const [myMembershipDateFrom, setMyMembershipDateFrom] = useState('');
  const [myMembershipDateTo, setMyMembershipDateTo] = useState('');
  const [visitsFrom, setVisitsFrom] = useState('');
  const [visitsTo, setVisitsTo] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [typeStyle, setTypeStyle] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [durationFrom, setDurationFrom] = useState('');
  const [durationTo, setDurationTo] = useState('');
  const [visitPolicy, setVisitPolicy] = useState('');
  const [typeStatus, setTypeStatus] = useState('active');
  const [checkoutTypeId, setCheckoutTypeId] = useState<number | null>(null);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [testPaymentId, setTestPaymentId] = useState<string | null>(null);
  const [testCardNumber, setTestCardNumber] = useState('');
  const [testExpiryDate, setTestExpiryDate] = useState('');
  const [testCvc, setTestCvc] = useState('');
  const [testZipCode, setTestZipCode] = useState('');
  const [testPaymentError, setTestPaymentError] = useState('');
  const [testPaymentLoading, setTestPaymentLoading] = useState(false);
  const [extensionTarget, setExtensionTarget] = useState<Membership | null>(null);
  const [extensionQuantity, setExtensionQuantity] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionError, setExtensionError] = useState('');
  const [extensionSubmitting, setExtensionSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user?.role]);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');
    if (!paymentId) return;
    const paymentMode = searchParams.get('payment_mode');

    let cancelled = false;
    if (searchParams.get('payment_result') === 'cancelled') {
      setPaymentNotice('Оплата отменена. Абонемент не оформлен.');
      setTestPaymentId(null);
      setSearchParams({}, { replace: true });
      return;
    }

    let attempts = 0;
    if (paymentMode !== 'mock') setPaymentNotice('Проверяем статус оплаты...');

    const checkPayment = async () => {
      try {
        const response = await api.get<{ status: string }>(`/payments/${encodeURIComponent(paymentId)}`);
        if (cancelled) return;
        if (paymentMode === 'mock') {
          if (response.data.status === 'pending') {
            setTestPaymentId(paymentId);
            setPaymentNotice('');
            return;
          }
          setTestPaymentId(null);
          setPaymentNotice(response.data.status === 'succeeded'
            ? 'Тестовая оплата завершена. Абонемент добавлен в ваш профиль.'
            : 'Тестовая оплата отменена. Абонемент не оформлен.');
          if (response.data.status === 'succeeded') await fetchData();
          setSearchParams({}, { replace: true });
          return;
        }
        if (response.data.status === 'succeeded') {
          setPaymentNotice('Оплата прошла успешно. Абонемент добавлен в ваш профиль.');
          setTestPaymentId(null);
          await fetchData();
          setSearchParams({}, { replace: true });
          return;
        }
        if (response.data.status === 'failed') {
          setPaymentNotice('Оплата не прошла. Попробуйте оформить покупку ещё раз.');
          setTestPaymentId(null);
          setSearchParams({}, { replace: true });
          return;
        }
        attempts += 1;
        if (attempts < 20) {
          window.setTimeout(() => void checkPayment(), 2000);
        } else {
          setPaymentNotice('Платёж ещё обрабатывается. Обновите страницу через несколько секунд.');
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setPaymentNotice(getPaymentError(error, 'Не удалось проверить статус оплаты.'));
        }
      }
    };

    void checkPayment();
    return () => { cancelled = true; };
  }, [searchParams, setSearchParams]);

  const startCheckout = async (membershipTypeId: number) => {
    setCheckoutTypeId(membershipTypeId);
    setPaymentNotice('');
    try {
      const response = await api.post<{ mode: 'mock' | 'stripe'; payment_id: string; url?: string }>('/payments/checkout', {
        membership_type_id: membershipTypeId,
      });
      if (response.data.mode === 'mock') {
        setSearchParams({ payment_id: response.data.payment_id, payment_mode: 'mock' });
      } else if (response.data.url) {
        window.location.assign(response.data.url);
      } else {
        throw new Error('Stripe не вернул ссылку на оплату.');
      }
    } catch (error: unknown) {
      setPaymentNotice(getPaymentError(error, 'Не удалось начать оплату.'));
    } finally {
      setCheckoutTypeId(null);
    }
  };

  const finishTestPayment = async (outcome: 'complete' | 'cancel') => {
    if (!testPaymentId) return;
    setTestPaymentLoading(true);
    setTestPaymentError('');
    try {
      await api.post(`/payments/${encodeURIComponent(testPaymentId)}/test/${outcome}`);
      setTestPaymentId(null);
      setTestCardNumber('');
      setTestExpiryDate('');
      setTestCvc('');
      setTestZipCode('');
      setSearchParams({}, { replace: true });
      if (outcome === 'complete') {
        setPaymentNotice('Тестовая оплата завершена. Абонемент добавлен в ваш профиль.');
        await fetchData();
      } else {
        setPaymentNotice('Тестовая оплата отменена. Абонемент не оформлен.');
      }
    } catch (error: unknown) {
      setTestPaymentError(getPaymentError(error, 'Не удалось завершить тестовую оплату.'));
    } finally {
      setTestPaymentLoading(false);
    }
  };

  const submitTestPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTestPaymentError('');

    const cardNumber = testCardNumber.replace(/\s/g, '');
    if (!cardNumber || !testExpiryDate || !testCvc || !testZipCode.trim()) {
      setTestPaymentError('Заполните все поля.');
      return;
    }

    const expiryMatch = /^(\d{2})\/(\d{2})$/.exec(testExpiryDate);
    if (!expiryMatch) {
      setTestPaymentError('Введите дату в формате ММ/ГГ.');
      return;
    }
    const expiryMonth = Number(expiryMatch[1]);
    const expiryYear = 2000 + Number(expiryMatch[2]);
    const now = new Date();
    if (
      expiryMonth < 1 ||
      expiryMonth > 12 ||
      expiryYear < now.getFullYear() ||
      (expiryYear === now.getFullYear() && expiryMonth < now.getMonth() + 1)
    ) {
      setTestPaymentError('Срок действия карты истёк или указан неверно.');
      return;
    }

    if (!/^\d{3}$/.test(testCvc)) {
      setTestPaymentError('CVC должен состоять из 3 цифр.');
      return;
    }

    if (cardNumber === '4000000000000002') {
      setTestPaymentError('Карта отклонена банком.');
      return;
    }
    if (cardNumber !== '4242424242424242') {
      setTestPaymentError('Для теста используйте одну из указанных ниже карт.');
      return;
    }

    setTestPaymentLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    await finishTestPayment('complete');
  };

  const fetchData = async () => {
    try {
      const [typesRes, stylesRes] = await Promise.all([
        api.get<MembershipType[]>('/membership-types'),
        api.get<DanceStyle[]>('/dance-styles'),
      ]);
      setMembershipTypes(typesRes.data);
      setDanceStyles(stylesRes.data);
      if (user?.role === 'client') {
        const membershipsRes = await api.get<Membership[]>('/memberships/my');
        setMyMemberships(membershipsRes.data);
      } else {
        setMyMemberships([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitExtensionRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!extensionTarget) return;
    setExtensionSubmitting(true);
    setExtensionError('');
    try {
      const isVisits = extensionTarget.membership_visit_count != null;
      await api.post(`/memberships/${encodeURIComponent(extensionTarget.id)}/extension`, {
        requested_quantity: Number(extensionQuantity),
        requested_unit: isVisits ? 'visits' : 'days',
        reason: extensionReason,
      });
      setExtensionTarget(null);
      setExtensionQuantity('');
      setExtensionReason('');
      setPaymentNotice('Запрос на продление отправлен администратору.');
      await fetchData();
    } catch (requestError: unknown) {
      setExtensionError(getPaymentError(requestError, 'Не удалось отправить запрос.'));
    } finally {
      setExtensionSubmitting(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setFormOpen(true);
  };

  const openEdit = (type: MembershipType) => {
    setEditingId(type.id);
    setForm({
      name: type.name,
      description: type.description || '',
      price: String(type.price),
      visit_count: type.visit_count == null ? '' : String(type.visit_count),
      duration_days: String(type.duration_days),
    });
    setError('');
    setFormOpen(true);
  };

  const saveType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      visit_count: form.visit_count === '' ? null : Number(form.visit_count),
      duration_days: Number(form.duration_days),
    };
    try {
      if (editingId) await api.put(`/membership-types/${editingId}`, payload);
      else await api.post('/membership-types', payload);
      setFormOpen(false);
      await fetchData();
    } catch (saveError: any) {
      setError(saveError.response?.data?.error || 'Не удалось сохранить тип абонемента');
    }
  };

  const setTypeActive = async (type: MembershipType, isActive: boolean) => {
    try {
      if (isActive) await api.patch(`/membership-types/${type.id}/active`, { is_active: true });
      else await api.delete(`/membership-types/${type.id}`);
      await fetchData();
    } catch (updateError: any) {
      window.alert(updateError.response?.data?.error || 'Не удалось изменить тип абонемента');
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

  const visibleMyMemberships = myMemberships.filter((membership) => {
    const searchText = `${membership.membership_type?.name || membership.membership_type_name || ''}`.toLocaleLowerCase('ru');
    const startDate = membership.start_date.slice(0, 10);
    const endDate = membership.end_date.slice(0, 10);
    const remainingVisits = membership.remaining_visits;
    const status = membership.display_status || membership.status;
    return (!myMembershipSearch || searchText.includes(myMembershipSearch.toLocaleLowerCase('ru'))) &&
      (!myMembershipStatus || status === myMembershipStatus) &&
      (!myMembershipDateFrom || endDate >= myMembershipDateFrom) &&
      (!myMembershipDateTo || startDate <= myMembershipDateTo) &&
      (!visitsFrom || (remainingVisits !== null && remainingVisits >= Number(visitsFrom))) &&
      (!visitsTo || (remainingVisits !== null && remainingVisits <= Number(visitsTo)));
  });
  const visibleMembershipTypes = membershipTypes.filter((type) => {
    const searchText = `${type.name} ${type.description || ''}`.toLocaleLowerCase('ru');
    return (user?.role === 'admin' || type.is_active) &&
      (!typeSearch || searchText.includes(typeSearch.toLocaleLowerCase('ru'))) &&
      (!typeStyle || String(type.dance_style_id || '') === typeStyle) &&
      (!priceFrom || type.price >= Number(priceFrom)) && (!priceTo || type.price <= Number(priceTo)) &&
      (!durationFrom || type.duration_days >= Number(durationFrom)) && (!durationTo || type.duration_days <= Number(durationTo)) &&
      (!visitPolicy || (visitPolicy === 'unlimited' ? type.visit_count == null : type.visit_count != null)) &&
      (user?.role !== 'admin' || typeStatus === 'all' || (typeStatus === 'active' ? type.is_active : !type.is_active));
  });

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Абонементы</h1>
        {user?.role === 'admin' && <button onClick={openCreate} className="btn btn-primary flex items-center gap-2"><Plus size={18} />Добавить тип</button>}
      </div>

      {paymentNotice && (
        <p role="status" className="card mb-6 border-primary text-center">
          {paymentNotice}
        </p>
      )}

      {testPaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <section className="card max-h-[90vh] w-full max-w-lg overflow-y-auto" aria-labelledby="test-payment-title" aria-modal="true" role="dialog">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="test-payment-title" className="text-2xl font-bold">Оплата абонемента</h2>
                <p className="mt-1 text-sm text-textSecondary">Тестовая оплата — деньги не списываются</p>
              </div>
              <button type="button" onClick={() => void finishTestPayment('cancel')} disabled={testPaymentLoading} className="rounded-lg px-3 py-1 text-textSecondary hover:bg-surface2 disabled:opacity-60" aria-label="Закрыть">
                <X size={20} />
              </button>
            </div>

            <div className="mb-5 rounded-lg bg-surface2 p-4">
              <h3 className="mb-2 font-semibold">Тестовые карты</h3>
              <p className="text-sm">Успешная оплата: <strong>4242 4242 4242 4242</strong></p>
              <p className="mt-1 text-sm">Отказ банка: <strong>4000 0000 0000 0002</strong></p>
              <p className="mt-2 text-xs text-textSecondary">Введите дату в будущем, например 12/34, любой трёхзначный CVC и индекс.</p>
            </div>

            <form onSubmit={(event) => void submitTestPayment(event)} className="space-y-4">
              <label className="block text-sm">
                Номер карты
                <input
                  required
                  autoComplete="cc-number"
                  inputMode="numeric"
                  maxLength={19}
                  placeholder="4242 4242 4242 4242"
                  className="input mt-1"
                  value={testCardNumber}
                  onChange={(event) => setTestCardNumber(event.target.value.replace(/[^\d ]/g, '').slice(0, 19))}
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm">
                  Срок действия (ММ/ГГ)
                  <input
                    required
                    autoComplete="cc-exp"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="12/34"
                    className="input mt-1"
                    value={testExpiryDate}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
                      setTestExpiryDate(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                    }}
                  />
                </label>
                <label className="block text-sm">
                  CVC
                  <input
                    required
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="123"
                    className="input mt-1"
                    value={testCvc}
                    onChange={(event) => setTestCvc(event.target.value.replace(/\D/g, '').slice(0, 3))}
                  />
                </label>
              </div>
              <label className="block text-sm">
                Почтовый индекс
                <input
                  required
                  autoComplete="postal-code"
                  maxLength={12}
                  placeholder="220000"
                  className="input mt-1"
                  value={testZipCode}
                  onChange={(event) => setTestZipCode(event.target.value)}
                />
              </label>
              {testPaymentError && <p role="alert" className="text-sm text-error">{testPaymentError}</p>}
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button type="button" onClick={() => void finishTestPayment('cancel')} disabled={testPaymentLoading} className="btn btn-secondary disabled:opacity-60">
                  Отмена
                </button>
                <button type="submit" disabled={testPaymentLoading} className="btn btn-primary disabled:opacity-60">
                  {testPaymentLoading ? 'Обработка...' : 'Оплатить'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {extensionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <section className="card w-full max-w-lg" aria-labelledby="extension-form-title" aria-modal="true" role="dialog">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="extension-form-title" className="text-xl font-bold">Запросить продление</h2>
                <p className="mt-1 text-sm text-textSecondary">
                  {extensionTarget.membership_type_name || extensionTarget.membership_type?.name}
                </p>
              </div>
              <button type="button" onClick={() => setExtensionTarget(null)} className="rounded-lg p-2 hover:bg-surface2" aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(event) => void submitExtensionRequest(event)} className="space-y-4">
              <label className="block text-sm">
                {extensionTarget.membership_visit_count != null ? 'Сколько занятий добавить' : 'На сколько дней продлить'}
                <input
                  required
                  type="number"
                  min={1}
                  step={1}
                  className="input mt-1"
                  value={extensionQuantity}
                  onChange={(event) => setExtensionQuantity(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                Причина продления
                <textarea
                  required
                  minLength={3}
                  maxLength={1000}
                  rows={4}
                  className="input mt-1"
                  value={extensionReason}
                  onChange={(event) => setExtensionReason(event.target.value)}
                  placeholder="Укажите причину запроса"
                />
              </label>
              {extensionError && <p role="alert" className="text-sm text-error">{extensionError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setExtensionTarget(null)} className="btn btn-secondary" disabled={extensionSubmitting}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={extensionSubmitting}>
                  {extensionSubmitting ? 'Отправка...' : 'Отправить запрос'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {formOpen && user?.role === 'admin' && <form onSubmit={saveType} className="card mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between sm:col-span-2"><h2 className="text-xl font-bold">{editingId ? 'Изменить тип' : 'Новый тип абонемента'}</h2><button type="button" aria-label="Закрыть" onClick={() => setFormOpen(false)} className="rounded-lg p-2 hover:bg-surface2"><X size={18} /></button></div>
        <label className="text-sm">Название<input required maxLength={100} className="input mt-1" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="text-sm">Цена, BYN<input required type="number" min={0} step="0.01" className="input mt-1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
        <label className="text-sm">Длительность, дней<input required type="number" min={1} className="input mt-1" value={form.duration_days} onChange={(event) => setForm({ ...form, duration_days: event.target.value })} /></label>
        <label className="text-sm">Посещений<input type="number" min={1} placeholder="Без ограничений" className="input mt-1" value={form.visit_count} onChange={(event) => setForm({ ...form, visit_count: event.target.value })} /></label>
        <label className="text-sm sm:col-span-2">Описание<textarea rows={3} className="input mt-1" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        {error && <p role="alert" className="text-error sm:col-span-2">{error}</p>}
        <button type="submit" className="btn btn-primary sm:col-span-2">{editingId ? 'Сохранить изменения' : 'Создать тип'}</button>
      </form>}

      {user?.role === 'client' && myMemberships.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Мои абонементы</h2>
          <div className="mb-4 grid grid-cols-1 gap-3 border-y border-surface2 py-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">Поиск по названию<input className="input mt-1" value={myMembershipSearch} onChange={(event) => setMyMembershipSearch(event.target.value)} /></label>
            <label className="text-sm">Статус<select className="input mt-1" value={myMembershipStatus} onChange={(event) => setMyMembershipStatus(event.target.value)}><option value="">Все статусы</option><option value="active">Активен</option><option value="expired">Истек</option><option value="paused">Приостановлен</option><option value="pending_extension">Ожидает продления</option><option value="cancelled">Отменен</option></select></label>
            <label className="text-sm">Действует по дате от<input type="date" className="input mt-1" value={myMembershipDateFrom} onChange={(event) => setMyMembershipDateFrom(event.target.value)} /></label>
            <label className="text-sm">Действует по дате до<input type="date" className="input mt-1" value={myMembershipDateTo} onChange={(event) => setMyMembershipDateTo(event.target.value)} /></label>
            <label className="text-sm">Остаток посещений от<input type="number" min={0} className="input mt-1" value={visitsFrom} onChange={(event) => setVisitsFrom(event.target.value)} /></label>
            <label className="text-sm">Остаток посещений до<input type="number" min={0} className="input mt-1" value={visitsTo} onChange={(event) => setVisitsTo(event.target.value)} /></label>
            <p className="text-sm text-textSecondary sm:col-span-2 lg:col-span-3">Найдено абонементов: {visibleMyMemberships.length}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleMyMemberships.length === 0 ? <p className="text-textSecondary">Абонементы по выбранным критериям не найдены</p> : visibleMyMemberships.map((membership) => (
              <div key={membership.id} className="card border-primary">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">
                    {membership.membership_type?.name || membership.membership_type_name || `Абонемент №${membership.membership_type_id}`}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    (membership.display_status || membership.status) === 'active' ? 'bg-success/20 text-success' :
                    (membership.display_status || membership.status) === 'expired' ? 'bg-error/20 text-error' :
                    'bg-warning/20 text-warning'
                  }`}>
                    {(membership.display_status || membership.status) === 'active' ? 'Активен' :
                     (membership.display_status || membership.status) === 'pending_extension' ? 'Ожидает решения' :
                     (membership.display_status || membership.status) === 'expired' ? 'Истек' : 'Отменен'}
                  </span>
                </div>

                <div className="space-y-2 text-textSecondary">
                  <div className="flex items-center space-x-2">
                    <Clock size={16} />
                    <span>Действует до: {formatDate(membership.end_date)}</span>
                  </div>
                  {membership.remaining_visits !== null && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle size={16} />
                      <span>Осталось посещений: {membership.remaining_visits}</span>
                    </div>
                  )}
                </div>
                {user?.role === 'client' &&
                  (membership.display_status || membership.status) === 'expired' &&
                  membership.extension_request_status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => {
                        setExtensionTarget(membership);
                        setExtensionQuantity('');
                        setExtensionReason('');
                        setExtensionError('');
                      }}
                      className="btn btn-primary mt-4 w-full"
                    >
                      Продлить абонемент
                    </button>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Доступные абонементы</h2>
        <div className="mb-4 grid grid-cols-1 gap-3 border-y border-surface2 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Поиск по названию или описанию<input className="input mt-1" value={typeSearch} onChange={(event) => setTypeSearch(event.target.value)} /></label>
          <label className="text-sm">Направление<select className="input mt-1" value={typeStyle} onChange={(event) => setTypeStyle(event.target.value)}><option value="">Все направления</option>{danceStyles.map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm">Цена от<input type="number" min={0} className="input mt-1" value={priceFrom} onChange={(event) => setPriceFrom(event.target.value)} /></label><label className="text-sm">Цена до<input type="number" min={0} className="input mt-1" value={priceTo} onChange={(event) => setPriceTo(event.target.value)} /></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm">Дней от<input type="number" min={1} className="input mt-1" value={durationFrom} onChange={(event) => setDurationFrom(event.target.value)} /></label><label className="text-sm">Дней до<input type="number" min={1} className="input mt-1" value={durationTo} onChange={(event) => setDurationTo(event.target.value)} /></label></div>
          <label className="text-sm">Посещения<select className="input mt-1" value={visitPolicy} onChange={(event) => setVisitPolicy(event.target.value)}><option value="">Любой вариант</option><option value="limited">С лимитом</option><option value="unlimited">Безлимитный</option></select></label>
          {user?.role === 'admin' && <label className="text-sm">Статус<select className="input mt-1" value={typeStatus} onChange={(event) => setTypeStatus(event.target.value)}><option value="active">Активные</option><option value="archived">В архиве</option><option value="all">Все</option></select></label>}
          <p className="pb-2 text-sm text-textSecondary sm:self-end">Найдено типов: {visibleMembershipTypes.length}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleMembershipTypes.length === 0 ? <p className="text-textSecondary">Типы абонементов по выбранным критериям не найдены</p> : visibleMembershipTypes.map((type) => (
            <div key={type.id} className="card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <CreditCard size={24} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="break-words text-xl font-bold">{type.name}</h3>
                  <p className="text-2xl font-bold text-primary">{type.price} BYN</p>
                </div>
                </div>
                {user?.role === 'admin' && <div className="flex shrink-0 gap-1"><button onClick={() => openEdit(type)} title="Изменить" aria-label={`Изменить тип ${type.name}`} className="rounded-lg p-2 hover:bg-surface2"><Pencil size={16} /></button>{type.is_active ? <button onClick={() => setTypeActive(type, false)} title="Архивировать" aria-label={`Архивировать ${type.name}`} className="rounded-lg p-2 text-error hover:bg-surface2"><Trash2 size={16} /></button> : <button onClick={() => setTypeActive(type, true)} className="text-sm text-primary hover:underline">Активировать</button>}</div>}
              </div>

              {user?.role === 'admin' && !type.is_active && <p className="mb-3 text-xs text-warning">В архиве</p>}

              {type.description && (
                <p className="text-textSecondary mb-4">{type.description}</p>
              )}

              <div className="space-y-2 text-textSecondary text-sm mb-4">
                <div className="flex items-center space-x-2">
                  <Clock size={16} />
                  <span>Длительность: {type.duration_days} дней</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} />
                  <span>{type.visit_count == null ? 'Без ограничений по посещениям' : `Посещений: ${type.visit_count}`}</span>
                </div>
              </div>

              {user?.role === 'client' && type.is_active && (
                <button
                  onClick={() => void startCheckout(type.id)}
                  disabled={checkoutTypeId !== null}
                  className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutTypeId === type.id ? 'Подготовка оплаты...' : `Оплатить (${type.price} BYN)`}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MembershipsPage;
