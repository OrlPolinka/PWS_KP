import { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCheck, MessageSquare, Pencil, Search, Send, Trash2, User as UserIcon, X } from 'lucide-react';
import api from '../services/api';
import { Message } from '../types';
import { useAuth } from '../contexts/AuthContext';

type UserRole = 'admin' | 'trainer' | 'client';

interface ChatContact {
  id: string;
  full_name: string;
  role: UserRole;
  photo_url?: string;
}

interface Conversation extends ChatContact {
  last_message?: string;
  last_message_time: string;
  unread_count: number;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatContact | null>(null);
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
    setSelectedUser(contact);
    setChatError('');
    setEditingId(null);
    setEditingContent('');
  };

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
    if (!window.confirm('Удалить это сообщение?')) return;
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

  const renderContact = (contact: ChatContact, conversation?: Conversation) => (
    <button
      key={contact.id}
      type="button"
      onClick={() => selectUser(contact)}
      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
        selectedUser?.id === contact.id ? 'bg-primary text-white' : 'hover:bg-surface2'
      }`}
    >
      {contact.photo_url ? (
        <img src={contact.photo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          selectedUser?.id === contact.id ? 'bg-white/20' : 'bg-primary/20'
        }`}>
          <UserIcon size={20} className={selectedUser?.id === contact.id ? 'text-white' : 'text-primary'} />
        </div>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{contact.full_name}</span>
        <span className={`block truncate text-sm ${
          selectedUser?.id === contact.id ? 'text-white/70' : 'text-textSecondary'
        }`}>
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

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Чат</h1>

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
              <option value="client">Клиенты</option>
            </select>
          </label>

          {sidebarError && <p role="alert" className="mb-3 text-sm text-error">{sidebarError}</p>}

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
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
          {selectedUser ? (
            <>
              <header className="mb-4 flex items-center gap-3 border-b border-surface2 pb-4">
                {selectedUser.photo_url ? (
                  <img src={selectedUser.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <UserIcon size={20} className="text-primary" />
                  </div>
                )}
                <div>
                  <h2 className="font-bold">{selectedUser.full_name}</h2>
                  <p className="text-sm text-textSecondary">{roleLabels[selectedUser.role]}</p>
                </div>
              </header>

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
