import { useState, useEffect } from 'react';
import { Send, User as UserIcon } from 'lucide-react';
import api from '../services/api';
import { Message } from '../types';

interface Conversation {
  id: string;
  full_name: string;
  role: string;
  photo_url?: string;
}

const ChatPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchConversations = async () => {
    try {
      const response = await api.get<Conversation[]>('/messages/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const response = await api.get(`/messages/dialog/${userId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      await api.post('/messages', {
        receiver_id: selectedUser.id,
        content: newMessage,
      });
      setNewMessage('');
      fetchMessages(selectedUser.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <h1 className="text-3xl font-bold mb-6">Чат</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-3rem)]">
        <div className="card overflow-y-auto">
          <h2 className="text-lg font-bold mb-4">Диалоги</h2>
          <div className="space-y-2">
            {conversations.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUser?.id === user.id ? 'bg-primary text-white' : 'hover:bg-surface2'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {user.photo_url ? (
                    <img src={user.photo_url} alt={user.full_name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <UserIcon size={20} className="text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm opacity-70 capitalize">{user.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 card flex flex-col">
          {selectedUser ? (
            <>
              <div className="border-b border-surface2 pb-4 mb-4">
                <h2 className="text-lg font-bold">{selectedUser.full_name}</h2>
                <p className="text-textSecondary capitalize">{selectedUser.role}</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === selectedUser.id ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.sender_id === selectedUser.id ? 'bg-surface2' : 'bg-primary'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className={`text-xs mt-1 ${message.sender_id === selectedUser.id ? 'text-textSecondary' : 'text-white/70'}`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="input"
                  placeholder="Введите сообщение..."
                />
                <button onClick={sendMessage} className="btn btn-primary">
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-textSecondary">
              Выберите диалог для начала общения
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
