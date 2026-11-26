import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, CheckCheck, MessageSquare, Pencil, Search, Send, Trash2, User as UserIcon, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { normalizeMediaUrl, showMediaPlaceholder } from '../lib/media';
import ChatbotAdminPanel from '../components/ChatbotAdminPanel';
import { useActionDialog } from '../components/ActionDialog';

type UserRole = 'admin' | 'trainer' | 'client';

interface ChatContact {
  id: string;
  full_name: string;
  role: UserRole;
  photo_url?: string;
  trainer_id?: string | null;
}

interface Conversation extends ChatContact {
  last_message?: string;
  last_message_time: string;
  unread_count: number;
}

interface ChatbotFaq {
  id: number;
  question: string;
  answer: string;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  trainer: 'Тренер',
  client: 'Клиент',
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as {
      response?: { status?: number; data?: { error?: string } };
    }).response;
    if (response?.data?.error) return response.data.error;
    if (response?.status === 429) return 'Слишком много запросов к серверу. Подождите немного и попробуйте снова.';
  }
  return fallback;
};

const ChatPage = () => {
  const { user } = useAuth();
  const { confirm, dialog } = useActionDialog();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatContact | null>(null);
  const [selectedBot, setSelectedBot] = useState(user?.role === 'client');
  const [faqSearch, setFaqSearch] = useState('');
  const [faqs, setFaqs] = useState<ChatbotFaq[]>([]);
  const [botExchanges, setBotExchanges] = useState<ChatbotFaq[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [faqError, setFaqError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [sidebarError, setSidebarError] = useState('');
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const botMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedBot || user?.role !== 'client') return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoadingFaqs(true);
      try {
        const response = await api.get<ChatbotFaq[]>('/chatbot/faqs', {
          params: { search: faqSearch.trim() },
        });
        if (!cancelled) {
          setFaqs(response.data);
          setFaqError('');
        }
      } catch (error) {
        if (!cancelled) setFaqError(getErrorMessage(error, 'Не удалось загрузить подсказки чат-бота'));
      } finally {
        if (!cancelled) setLoadingFaqs(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [selectedBot, faqSearch, user?.role]);

  const fetchConversations = async () => {
    try {
      const response = await api.get<Conversation[]>('/messages/conversations');
      setConversations(response.data);
      setSidebarError('');
    } catch (error) {
      setSidebarError(getErrorMessage(error, 'Не удалось загрузить диалоги'));
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    void fetchConversations();
    const interval = window.setInterval(() => void fetchConversations(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoadingContacts(true);
      try {
        const response = await api.get<ChatContact[]>('/messages/contacts', {
          params: { search: search.trim(), role: roleFilter || undefined },
        });
        if (!cancelled) {
          setContacts(response.data);
          setSidebarError('');
        }
      } catch (error) {
        if (!cancelled) {
          setSidebarError(getErrorMessage(error, 'Не удалось загрузить пользователей'));
        }
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search, roleFilter]);

  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    let cancelled = false;
    const loadMessages = async (showLoading: boolean) => {
      if (showLoading) setLoadingMessages(true);
      try {
        const response = await api.get<Message[]>(`/messages/dialog/${selectedUser.id}`, {
          params: { limit: 100 },
        });
        let loadedMessages = response.data;
        const hasUnreadMessages = loadedMessages.some(
          (message) => message.receiver_id === user?.id && !message.is_read
        );
        if (hasUnreadMessages) {
          await api.patch(`/messages/dialog/${selectedUser.id}/read`);
          loadedMessages = loadedMessages.map((message) =>
            message.receiver_id === user?.id ? { ...message, is_read: true } : message
          );
        }
        if (!cancelled) {
          setMessages(loadedMessages);
          setChatError('');
          if (hasUnreadMessages) void fetchConversations();
        }
      } catch (error) {
        if (!cancelled) setChatError(getErrorMessage(error, 'Не удалось загрузить сообщения'));
      } finally {
        if (!cancelled && showLoading) setLoadingMessages(false);
      }
    };

    void loadMessages(true);
    const interval = window.setInterval(() => void loadMessages(false), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedUser?.id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedUser?.id]);

  const selectUser = (contact: ChatContact) => {
    setSelectedBot(false);
    setSelectedUser(contact);
    setChatError('');
    setEditingId(null);
    setEditingContent('');
  };

  const selectBot = () => {
    setSelectedBot(true);
    setSelectedUser(null);
    setFaqSearch('');
    setFaqError('');
    setChatError('');
  };

  const selectFaq = (faq: ChatbotFaq) => {
    setBotExchanges((current) => [...current, faq]);
    setFaqSearch('');
  };

  const resetContactFilters = () => {
    setSearch('');
    setRoleFilter('');
  };

  useEffect(() => {
    botMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [botExchanges.length, selectedBot]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;

    setSending(true);
    setChatError('');
    try {
      const response = await api.post<Message>('/messages', {
        receiver_id: selectedUser.id,
        content: newMessage.trim(),
      });
      setMessages((current) => [...current, response.data]);
      setNewMessage('');
      void fetchConversations();
    } catch (error) {
      setChatError(getErrorMessage(error, 'Не удалось отправить сообщение'));
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async (messageId: number) => {
    if (!editingContent.trim()) return;
    setChatError('');
    try {
      const response = await api.put<Message>(`/messages/${messageId}`, {
        content: editingContent.trim(),
      });
      setMessages((current) => current.map((message) => message.id === messageId ? response.data : message));
      setEditingId(null);
      setEditingContent('');
      void fetchConversations();
    } catch (error) {
      setChatError(getErrorMessage(error, 'Не удалось изменить сообщение'));
    }
  };

  const deleteMessage = async (message: Message) => {
    if (!await confirm('Удалить это сообщение?')) return;
    setChatError('');
    try {
      await api.delete(`/messages/${message.id}`);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      void fetchConversations();
    } catch (error) {
      setChatError(getErrorMessage(error, 'Не удалось удалить сообщение'));
    }
  };

  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const conversationIds = new Set(conversations.map((conversation) => conversation.id));
  const availableContacts = contacts.filter((contact) => !conversationIds.has(contact.id));
  const canViewUserProfiles = user?.role === 'admin' || user?.role === 'trainer';
  const getProfilePath = (contact: ChatContact) => {
    if (contact.role === 'trainer' && contact.trainer_id) {
      return `/trainers/${encodeURIComponent(contact.trainer_id)}`;
    }
    return canViewUserProfiles ? `/users/${encodeURIComponent(contact.id)}` : undefined;
  };

  const renderContact = (contact: ChatContact, conversation?: Conversation) => {
    const selected = selectedUser?.id === contact.id;
    const avatar = contact.photo_url ? (
      <img src={normalizeMediaUrl(contact.photo_url)} alt="" onError={showMediaPlaceholder} className="h-10 w-10 rounded-full object-cover" />
    ) : (
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
        selected ? 'bg-white/20' : 'bg-primary/20'
      }`}>
        <UserIcon size={20} className={selected ? 'text-white' : 'text-primary'} />
      </div>
    );

    return (
      <button
        key={contact.id}
        type="button"
        onClick={() => selectUser(contact)}
        className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
          selected ? 'bg-primary text-white' : 'hover:bg-surface2'
        }`}
      >
        {avatar}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{contact.full_name}</span>
          <span className={`block truncate text-left text-sm ${selected ? 'text-white/70' : 'text-textSecondary'}`}>
            {conversation?.last_message || roleLabels[contact.role]}
          </span>
        </span>
        {conversation && conversation.unread_count > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-white">
            {conversation.unread_count}
          </span>
        )}
      </button>
    );
  };

  const renderContactHeader = (contact: ChatContact) => {
    const profilePath = getProfilePath(contact);
    const avatar = contact.photo_url ? (
      <img src={normalizeMediaUrl(contact.photo_url)} alt="" onError={showMediaPlaceholder} className="h-10 w-10 rounded-full object-cover" />
    ) : (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
        <UserIcon size={20} className="text-primary" />
      </div>
    );

    return (
      <header className="mb-4 flex items-center gap-3 border-b border-surface2 pb-4">
        {profilePath ? (
          <Link
            to={profilePath}
            aria-label={`Открыть профиль: ${contact.full_name}`}
            title={contact.role === 'trainer' ? 'Открыть страницу тренера' : 'Открыть профиль пользователя'}
            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {avatar}
          </Link>
        ) : avatar}
        <div>
          <h2 className="font-bold">
            {profilePath ? (
              <Link to={profilePath} className="hover:text-primary hover:underline">
                {contact.full_name}
              </Link>
            ) : contact.full_name}
          </h2>
          <p className="text-sm text-textSecondary">{roleLabels[contact.role]}</p>
        </div>
      </header>
    );
  };

  return (
    <div>
      {dialog}
      <h1 className="mb-6 text-3xl font-bold">Чат</h1>
      {user?.role === 'admin' && <ChatbotAdminPanel />}

      <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-4 lg:h-[calc(100vh-13rem)] lg:min-h-[34rem] lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.75fr)]">
        <aside className="card flex min-h-[22rem] flex-col overflow-hidden p-4 lg:min-h-0">
          <h2 className="mb-3 text-lg font-bold">Диалоги и пользователи</h2>

          <label className="relative mb-3 block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-10"
              placeholder="Поиск по ФИО..."
              aria-label="Поиск пользователей по ФИО"
            />
          </label>
          <label className="mb-4 block text-sm text-textSecondary">
            Фильтр по роли
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="input mt-1"
            >
              <option value="">Все роли</option>
              <option value="admin">Администраторы</option>
              <option value="trainer">Тренеры</option>
              {user?.role !== 'client' && <option value="client">Клиенты</option>}
            </select>
          </label>
          <button type="button" onClick={resetContactFilters} className="mb-4 text-left text-sm text-primary hover:underline">
            Сбросить фильтры
          </button>

          {sidebarError && <p role="alert" className="mb-3 text-sm text-error">{sidebarError}</p>}

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            {user?.role === 'client' && (
              <section>
                <button
                  type="button"
                  onClick={selectBot}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                    selectedBot ? 'bg-primary text-white' : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    selectedBot ? 'bg-white/20' : 'bg-primary/15'
                  }`}>
                    <Bot size={21} className={selectedBot ? 'text-white' : 'text-primary'} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Помощник студии</span>
                    <span className={`block text-sm ${selectedBot ? 'text-white/75' : 'text-textSecondary'}`}>
                      Готовые ответы на частые вопросы
                    </span>
                  </span>
                </button>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold text-textSecondary">Последние диалоги</h3>
              {loadingConversations && conversations.length === 0 ? (
                <p className="px-2 py-3 text-sm text-textSecondary">Загрузка диалогов...</p>
              ) : conversations.length === 0 ? (
                <p className="px-2 py-3 text-sm text-textSecondary">Диалогов пока нет. Найдите пользователя ниже.</p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => renderContact(conversation, conversation))}
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-textSecondary">
                {search.trim() ? 'Результаты поиска' : 'Начать новый диалог'}
              </h3>
              {loadingContacts ? (
                <p className="px-2 py-3 text-sm text-textSecondary">Поиск пользователей...</p>
              ) : availableContacts.length === 0 ? (
                <p className="px-2 py-3 text-sm text-textSecondary">Пользователи не найдены</p>
              ) : (
                <div className="space-y-1">
                  {availableContacts.map((contact) => renderContact(contact))}
                </div>
              )}
            </section>
          </div>
        </aside>

        <section className="card flex min-h-[28rem] flex-col overflow-hidden p-4 lg:min-h-0">
          {selectedBot && user?.role === 'client' ? (
            <>
              <header className="mb-4 flex items-center gap-3 border-b border-surface2 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                  <Bot size={22} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-bold">Помощник студии</h2>
                  <p className="text-sm text-textSecondary">Выберите вопрос или начните вводить свой</p>
                </div>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto pb-4" aria-live="polite">
                {botExchanges.map((exchange, index) => (
                  <div key={`${exchange.id}-${index}`} className="space-y-3">
                    <div className="flex justify-end">
                      <p className="max-w-[85%] rounded-xl bg-primary p-3 text-white">{exchange.question}</p>
                    </div>
                    <div className="flex justify-start">
                      <p className="max-w-[90%] whitespace-pre-wrap rounded-xl bg-surface2 p-3">{exchange.answer}</p>
                    </div>
                  </div>
                ))}

                <section className="rounded-xl bg-surface2/60 p-4">
                  <h3 className="mb-3 text-sm font-semibold">
                    {faqSearch.trim() ? 'Похожие вопросы' : botExchanges.length ? 'Может быть полезно' : 'Популярные вопросы'}
                  </h3>
                  {loadingFaqs ? (
                    <p className="text-sm text-textSecondary">Ищем подходящие ответы...</p>
                  ) : faqs.length ? (
                    <div className="flex flex-wrap gap-2">
                      {faqs.map((faq) => (
                        <button
                          key={faq.id}
                          type="button"
                          onClick={() => selectFaq(faq)}
                          className="rounded-full border border-primary/30 bg-surface px-3 py-2 text-left text-sm text-primary transition-colors hover:border-primary hover:bg-primary/5"
                        >
                          {faq.question}
                        </button>
                      ))}
                    </div>
                  ) : faqSearch.trim() ? (
                    <p className="text-sm text-textSecondary">
                      Похожих ответов не нашлось. Попробуйте другие слова или напишите администратору в обычном чате.
                    </p>
                  ) : (
                    <p className="text-sm text-textSecondary">Пока нет доступных вопросов.</p>
                  )}
                  {faqError && <p role="alert" className="mt-3 text-sm text-error">{faqError}</p>}
                </section>
                <div ref={botMessagesEndRef} />
              </div>

              <label className="relative block border-t border-surface2 pt-3">
                <Search size={18} className="absolute left-3 top-6 text-textSecondary" />
                <input
                  type="search"
                  value={faqSearch}
                  onChange={(event) => setFaqSearch(event.target.value)}
                  maxLength={100}
                  className="input pl-10"
                  placeholder="Например: как записаться на тренировку?"
                  aria-label="Поиск вопросов чат-бота"
                />
                <span className="mt-2 block text-xs text-textSecondary">
                  Начните вводить вопрос — покажем похожие варианты из базы ответов.
                </span>
              </label>
              <button type="button" onClick={() => setFaqSearch('')} className="mt-2 text-sm text-primary hover:underline">
                Сбросить поиск вопросов
              </button>
            </>
          ) : selectedUser ? (
            <>
              {renderContactHeader(selectedUser)}

              <div className="flex-1 space-y-4 overflow-y-auto pb-4" aria-live="polite">
                {loadingMessages ? (
                  <p className="py-6 text-center text-textSecondary">Загрузка сообщений...</p>
                ) : messages.length === 0 && !chatError ? (
                  <div className="flex h-full min-h-40 flex-col items-center justify-center text-center text-textSecondary">
                    <MessageSquare size={32} className="mb-2 opacity-50" />
                    <p>Сообщений пока нет</p>
                    <p className="text-sm">Напишите первым — диалог начнётся здесь</p>
                  </div>
                ) : messages.map((message) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const isEditing = editingId === message.id;
                  return (
                    <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <article className={`max-w-[90%] rounded-xl p-3 sm:max-w-[75%] ${
                        isOwnMessage ? 'bg-primary text-white' : 'bg-surface2'
                      }`}>
                        {isEditing ? (
                          <div className="min-w-56 space-y-2">
                            <textarea
                              autoFocus
                              maxLength={5000}
                              value={editingContent}
                              onChange={(event) => setEditingContent(event.target.value)}
                              className="input min-h-24 resize-y bg-background text-text"
                              aria-label="Изменить сообщение"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => { setEditingId(null); setEditingContent(''); }}
                                className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                                aria-label="Отменить редактирование"
                              >
                                <X size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void saveEdit(message.id)}
                                disabled={!editingContent.trim()}
                                className="btn btn-secondary px-3 py-1 text-sm"
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <div className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                              isOwnMessage ? 'text-white/70' : 'text-textSecondary'
                            }`}>
                              {message.edited && <span>изменено ·</span>}
                              <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                              {isOwnMessage && (
                                <>
                                  <CheckCheck
                                    size={15}
                                    className={message.is_read ? 'text-sky-200' : 'opacity-70'}
                                    aria-label={message.is_read ? 'Прочитано' : 'Отправлено'}
                                  />
                                  <span>{message.is_read ? 'Прочитано' : 'Отправлено'}</span>
                                </>
                              )}
                            </div>
                            {isOwnMessage && (
                              <div className="mt-1 flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => { setEditingId(message.id); setEditingContent(message.content); }}
                                  className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                                  aria-label="Редактировать сообщение"
                                  title="Редактировать"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteMessage(message)}
                                  className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                                  aria-label="Удалить сообщение"
                                  title="Удалить"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </article>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {chatError && <p role="alert" className="mb-2 text-sm text-error">{chatError}</p>}
              <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-surface2 pt-3">
                <textarea
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  maxLength={5000}
                  rows={2}
                  className="input min-h-11 resize-y"
                  placeholder="Введите сообщение..."
                  aria-label="Текст сообщения"
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="btn btn-primary flex h-11 shrink-0 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Отправить сообщение"
                  title="Отправить (Ctrl+Enter)"
                >
                  <Send size={18} />
                  <span className="hidden sm:inline">{sending ? 'Отправка...' : 'Отправить'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-textSecondary">
              <MessageSquare size={40} className="mb-3 opacity-50" />
              <p>Выберите диалог или найдите пользователя, чтобы начать общение</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ChatPage;
