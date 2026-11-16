import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Bot, ChevronDown, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import api from '../services/api';

interface ChatbotFaq {
  id: number;
  question: string;
  answer: string;
  keywords: string;
  is_active: boolean;
}

interface FaqForm {
  question: string;
  answer: string;
  keywords: string;
  is_active: boolean;
}

const emptyForm: FaqForm = { question: '', answer: '', keywords: '', is_active: true };

const ChatbotAdminPanel = () => {
  const [faqs, setFaqs] = useState<ChatbotFaq[]>([]);
  const [form, setForm] = useState<FaqForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchFaqs = useCallback(async () => {
    try {
      const response = await api.get<ChatbotFaq[]>('/chatbot/faqs');
      setFaqs(response.data);
      setError('');
    } catch (requestError: unknown) {
      const message = typeof requestError === 'object' && requestError !== null && 'response' in requestError
        ? (requestError as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(message || 'Не удалось загрузить вопросы чат-бота.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFaqs();
  }, [fetchFaqs]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveFaq = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId === null) {
        await api.post('/chatbot/faqs', form);
        setNotice('Вопрос добавлен.');
      } else {
        await api.put(`/chatbot/faqs/${editingId}`, form);
        setNotice('Изменения сохранены.');
      }
      resetForm();
      await fetchFaqs();
    } catch (saveError: unknown) {
      const message = typeof saveError === 'object' && saveError !== null && 'response' in saveError
        ? (saveError as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(message || 'Не удалось сохранить вопрос.');
    } finally {
      setSaving(false);
    }
  };

  const deleteFaq = async (faq: ChatbotFaq) => {
    if (!window.confirm(`Удалить вопрос «${faq.question}»?`)) return;
    setError('');
    setNotice('');
    try {
      await api.delete(`/chatbot/faqs/${faq.id}`);
      if (editingId === faq.id) resetForm();
      setNotice('Вопрос удалён.');
      await fetchFaqs();
    } catch (deleteError: unknown) {
      const message = typeof deleteError === 'object' && deleteError !== null && 'response' in deleteError
        ? (deleteError as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(message || 'Не удалось удалить вопрос.');
    }
  };

  return (
    <details className="card group mb-6">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <Bot className="shrink-0 text-primary" size={24} />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">База ответов чат-бота</span>
          <span className="block text-sm text-textSecondary">
            Добавляйте вопросы и ответы, которые клиенты смогут найти в чате.
          </span>
        </span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {faqs.length}
        </span>
        <ChevronDown size={18} className="shrink-0 text-textSecondary transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-6 grid gap-6 border-t border-surface2 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={saveFaq} className="space-y-4">
          <h2 className="text-lg font-semibold">{editingId === null ? 'Новый вопрос' : 'Редактирование вопроса'}</h2>
          <label className="block text-sm font-medium">
            Вопрос
            <input
              required
              minLength={3}
              maxLength={250}
              value={form.question}
              onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
              className="input mt-1"
              placeholder="Например: Как записаться на занятие?"
            />
          </label>
          <label className="block text-sm font-medium">
            Ответ
            <textarea
              required
              maxLength={5000}
              rows={4}
              value={form.answer}
              onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))}
              className="input mt-1 resize-y"
              placeholder="Напишите понятный ответ для клиента"
            />
          </label>
          <label className="block text-sm font-medium">
            Слова для поиска
            <input
              maxLength={500}
              value={form.keywords}
              onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
              className="input mt-1"
              placeholder="Например: запись, бронь, тренировка"
            />
            <span className="mt-1 block font-normal text-textSecondary">
              Необязательно. Помогают боту найти вопрос по близким формулировкам.
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            Показывать клиентам
          </label>

          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2 disabled:opacity-60">
              {editingId === null ? <Plus size={18} /> : <Save size={18} />}
              {saving ? 'Сохранение...' : editingId === null ? 'Добавить вопрос' : 'Сохранить'}
            </button>
            {editingId !== null && (
              <button type="button" onClick={resetForm} className="btn btn-secondary flex items-center gap-2">
                <X size={18} />
                Отмена
              </button>
            )}
          </div>
        </form>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Вопросы и ответы</h2>
          {loading ? (
            <p className="text-sm text-textSecondary">Загрузка...</p>
          ) : faqs.length === 0 ? (
            <p className="text-sm text-textSecondary">Пока нет заготовленных вопросов.</p>
          ) : (
            <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {faqs.map((faq) => (
                <article key={faq.id} className="rounded-xl border border-surface2 p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{faq.question}</h3>
                        {!faq.is_active && (
                          <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-textSecondary">Скрыт</span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-textSecondary">{faq.answer}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            question: faq.question,
                            answer: faq.answer,
                            keywords: faq.keywords,
                            is_active: faq.is_active,
                          });
                          setEditingId(faq.id);
                          setError('');
                          setNotice('');
                        }}
                        className="rounded-lg p-2 text-textSecondary hover:bg-surface2 hover:text-primary"
                        aria-label={`Редактировать: ${faq.question}`}
                        title="Редактировать"
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteFaq(faq)}
                        className="rounded-lg p-2 text-textSecondary hover:bg-red-50 hover:text-error"
                        aria-label={`Удалить: ${faq.question}`}
                        title="Удалить"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                  {faq.keywords && <p className="mt-2 text-xs text-textSecondary">Поиск: {faq.keywords}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </details>
  );
};

export default ChatbotAdminPanel;
