import { useCallback, useEffect, useState } from 'react';
import { Camera, Check, ScanLine, UserRound, X } from 'lucide-react';
import type { Html5Qrcode as Html5QrcodeInstance } from 'html5-qrcode';
import api from '../services/api';
import { ScheduleListItem } from '../types';

interface TrainerProfile {
  id: string;
}

interface AttendanceRosterItem {
  booking_id: string;
  booking_status: 'booked' | 'attended' | 'no_show';
  checked_in_at: string | null;
  client_id: string;
  client_name: string;
  client_phone: string | null;
  client_code: string;
  remaining_visits: number | null;
  membership_name: string;
  is_present: boolean | null;
  marked_at: string | null;
}

const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const toDateValue = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const getNextClassDate = (schedule: ScheduleListItem) => {
  const date = new Date();
  const currentDay = date.getDay() || 7;
  let offset = (schedule.day_of_week - currentDay + 7) % 7;
  const currentTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (offset === 0 && schedule.start_time.slice(0, 5) <= currentTime) offset = 7;
  date.setDate(date.getDate() + offset);
  return toDateValue(date);
};

const getClassDateOptions = (dayOfWeek: number) => {
  const currentDate = new Date();
  return Array.from({ length: 85 }, (_, index) => {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() + index - 28);
    return date;
  }).filter((date) => (date.getDay() || 7) === dayOfWeek).map((date) => ({
    value: toDateValue(date),
    label: date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }));
};

const TrainerAttendancePage = () => {
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [scheduleId, setScheduleId] = useState('');
  const [classDate, setClassDate] = useState('');
  const [roster, setRoster] = useState<AttendanceRosterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<ScheduleListItem[]>('/schedule'),
      api.get<TrainerProfile>('/trainers/me/profile'),
    ]).then(([scheduleResponse, trainerResponse]) => {
      if (!active) return;
      const assignedSchedules = scheduleResponse.data.filter(
        (schedule) => schedule.trainer_id === trainerResponse.data.id
      );
      setSchedules(assignedSchedules);
      setScheduleId(assignedSchedules[0]?.id || '');
      if (assignedSchedules[0]) setClassDate(getNextClassDate(assignedSchedules[0]));
    }).catch((loadError: unknown) => {
      const message = typeof loadError === 'object' && loadError !== null && 'response' in loadError
        ? (loadError as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(message || 'Не удалось загрузить занятия тренера.');
    }).finally(() => {
      if (active) setInitialLoading(false);
    });
    return () => { active = false; };
  }, []);

  const fetchRoster = useCallback(async () => {
    if (!scheduleId || !classDate) {
      setRoster([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.get<AttendanceRosterItem[]>(
        `/bookings/schedule/${encodeURIComponent(scheduleId)}/attendance`,
        { params: { class_date: classDate } }
      );
      setRoster(response.data);
    } catch (loadError: unknown) {
      const message = typeof loadError === 'object' && loadError !== null && 'response' in loadError
        ? (loadError as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setRoster([]);
      setError(message || 'Не удалось загрузить список записанных клиентов.');
    } finally {
      setLoading(false);
    }
  }, [scheduleId, classDate]);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  const markAttendance = useCallback(async (clientIdentifier: string, isPresent: boolean) => {
    if (!scheduleId || !classDate) return;
    setError('');
    setNotice('');
    try {
      const response = await api.post<{
        client_name: string;
        booking_status: string;
        remaining_visits: number | null;
      }>(`/bookings/schedule/${encodeURIComponent(scheduleId)}/attendance`, {
        class_date: classDate,
        identifier: clientIdentifier,
        is_present: isPresent,
      });
      setNotice(isPresent
        ? `Посещение отмечено: ${response.data.client_name}.${response.data.remaining_visits === null ? '' : ` Осталось занятий: ${response.data.remaining_visits}.`}`
        : `Отмечена неявка: ${response.data.client_name}. Занятие не списано.`);
      setIdentifier('');
      await fetchRoster();
    } catch (markError: unknown) {
      const message = typeof markError === 'object' && markError !== null && 'response' in markError
        ? (markError as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(message || 'Не удалось отметить посещение.');
    }
  }, [scheduleId, classDate, fetchRoster]);

  useEffect(() => {
    if (!scannerOpen) return;
    let stopped = false;
    let scanHandled = false;
    let scanner: Html5QrcodeInstance | null = null;
    setScannerStarting(true);
    const startCamera = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (stopped) return;
        scanner = new Html5Qrcode('attendance-qr-reader');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (stopped || scanHandled) return;
            scanHandled = true;
            setScannerOpen(false);
            await markAttendance(decodedText.trim(), true);
          },
          () => undefined
        );
        if (stopped && scanner.isScanning) {
          await scanner.stop();
          scanner.clear();
        }
      } catch (cameraError: unknown) {
        if (!stopped) {
          const details = cameraError instanceof Error ? ` ${cameraError.message}` : '';
          setError(`Не удалось запустить камеру. Разрешите доступ к камере и откройте сайт по HTTPS или через localhost.${details}`);
          setScannerOpen(false);
        }
      } finally {
        if (!stopped) setScannerStarting(false);
      }
    };

    void startCamera();
    return () => {
      stopped = true;
      const activeScanner = scanner;
      if (activeScanner) {
        void (async () => {
          try {
            if (activeScanner.isScanning) await activeScanner.stop();
            activeScanner.clear();
          } catch (stopError) {
            console.error('Не удалось корректно остановить сканер QR-кодов:', stopError);
          }
        })();
      }
    };
  }, [scannerOpen, markAttendance]);

  const selectedSchedule = schedules.find((schedule) => schedule.id === scheduleId);
  const classDateOptions = selectedSchedule ? getClassDateOptions(selectedSchedule.day_of_week) : [];

  if (initialLoading) return <div className="py-8 text-center">Загрузка...</div>;

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <UserRound size={28} className="text-primary" />
        <h1 className="text-3xl font-bold">Посещаемость занятия</h1>
      </div>

      <section className="card mb-6">
        <p className="mb-4 text-sm font-semibold text-primary">Шаг 1. Выберите занятие и дату</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Занятие
          <select
            className="input mt-1"
            value={scheduleId}
            onChange={(event) => {
              const nextScheduleId = event.target.value;
              const nextSchedule = schedules.find((schedule) => schedule.id === nextScheduleId);
              setScheduleId(nextScheduleId);
              setClassDate(nextSchedule ? getNextClassDate(nextSchedule) : '');
            }}
          >
            {schedules.length === 0 && <option value="">У вас пока нет назначенных занятий</option>}
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {weekdays[schedule.day_of_week % 7]} · {schedule.dance_style_name} · {schedule.start_time.slice(0, 5)} · {schedule.hall_name}
              </option>
            ))}
          </select>
        </label>
        {selectedSchedule && <label className="text-sm">
          Дата этого занятия
          <select className="input mt-1" value={classDate} onChange={(event) => setClassDate(event.target.value)}>
            {classDateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>}
        </div>
        {selectedSchedule && (
          <p className="mt-4 text-sm text-textSecondary">
            Список записанных на {classDateOptions.find((option) => option.value === classDate)?.label} · {selectedSchedule.start_time.slice(0, 5)}–{selectedSchedule.end_time.slice(0, 5)}
          </p>
        )}
      </section>

      {error && <p role="alert" className="card mb-4 border-error text-error">{error}</p>}
      {notice && <p role="status" className="card mb-4 border-primary">{notice}</p>}

      {scheduleId && (
        <section className="card mb-6">
          <p className="mb-3 text-sm font-semibold text-primary">Шаг 2. Отметьте клиента</p>
          <h2 className="mb-3 text-lg font-semibold">По номеру или QR-коду</h2>
          <div className="flex flex-wrap gap-3">
            <input
              className="input min-w-56 flex-1"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (identifier.trim()) void markAttendance(identifier.trim(), true);
                }
              }}
              placeholder="Например, CL-000001"
              aria-label="Номер клиента"
            />
            <button type="button" className="btn btn-primary flex items-center gap-2" disabled={!identifier.trim()} onClick={() => void markAttendance(identifier.trim(), true)}>
              <Check size={18} />Отметить посещение
            </button>
            <button type="button" className="btn btn-secondary flex items-center gap-2" onClick={() => { setError(''); setScannerOpen(true); }}>
              <Camera size={18} />Сканировать QR
            </button>
          </div>
        </section>
      )}

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section className="card w-full max-w-lg" role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="qr-scanner-title" className="text-xl font-bold">Сканирование QR-кода</h2>
              <button type="button" aria-label="Закрыть сканер" onClick={() => setScannerOpen(false)} className="rounded-lg p-2 hover:bg-surface2"><X size={20} /></button>
            </div>
            <div id="attendance-qr-reader" className="min-h-64 overflow-hidden rounded-lg bg-black" />
            <p className="mt-3 text-sm text-textSecondary">
              {scannerStarting ? 'Подключаем камеру…' : 'Наведите камеру на QR-код клиента. После распознавания посещение будет отмечено автоматически.'}
            </p>
            {scannerStarting && <ScanLine size={36} className="mx-auto mt-4 animate-pulse text-primary" />}
          </section>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">Записанные клиенты ({roster.length})</h2>
        {loading ? <p className="text-textSecondary">Загрузка списка...</p> : roster.length === 0 ? (
          <div className="card text-center text-textSecondary">На выбранное занятие и дату никто не записан.</div>
        ) : (
          <div className="space-y-3">
            {roster.map((client) => (
              <article key={client.booking_id} className="card flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{client.client_name}</h3>
                  <p className="text-sm text-textSecondary">Номер клиента: {client.client_code}</p>
                  <p className="text-sm text-textSecondary">
                    {client.membership_name} · {client.remaining_visits === null ? 'безлимит' : `осталось занятий: ${client.remaining_visits}`}
                  </p>
                  {client.booking_status !== 'booked' && (
                    <p className={`mt-1 text-sm ${client.booking_status === 'attended' ? 'text-success' : 'text-warning'}`}>
                      {client.booking_status === 'attended' ? 'Посещение отмечено' : 'Неявка отмечена'}
                    </p>
                  )}
                </div>
                {client.booking_status === 'booked' && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void markAttendance(client.client_code, true)} className="btn btn-primary">Был</button>
                    <button type="button" onClick={() => void markAttendance(client.client_code, false)} className="btn btn-secondary">Не был</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TrainerAttendancePage;
