import { useState, useEffect } from 'react';
import { QrCode, Download } from 'lucide-react';
import api from '../services/api';

const QRCodePage = () => {
  const [qrCode, setQrCode] = useState<string>('');
  const [clientCode, setClientCode] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQRCode();
  }, []);

  const fetchQRCode = async () => {
    try {
      const response = await api.get<{ qr_code: string; client_code: string; full_name: string }>('/users/qr-code');
      setQrCode(response.data.qr_code);
      setClientCode(response.data.client_code);
      setFullName(response.data.full_name);
    } catch (error) {
      console.error('Error fetching QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = 'my-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Ваш QR-код</h1>

      <div className="card">
        {fullName && <h2 className="mb-4 text-center text-xl font-semibold">{fullName}</h2>}
        {clientCode && (
          <div className="mb-6 rounded-lg bg-surface2 p-4 text-center">
            <p className="text-sm text-textSecondary">Ваш уникальный номер клиента</p>
            <p className="mt-1 text-2xl font-bold tracking-wider text-primary">{clientCode}</p>
          </div>
        )}
        <div className="text-center mb-6">
          <div className="w-64 h-64 mx-auto bg-white rounded-lg p-4 flex items-center justify-center">
            {qrCode ? (
              <img src={qrCode} alt="QR Code" className="w-full h-full object-contain" />
            ) : (
              <QrCode size={64} className="text-gray-400" />
            )}
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-textSecondary mb-2">
            Показывайте этот QR-код на входе для отметки посещения
          </p>
          <p className="text-sm text-textSecondary">
            Код уникален и привязан к вашему аккаунту
          </p>
        </div>

        <button onClick={downloadQRCode} className="btn btn-primary w-full flex items-center justify-center space-x-2">
          <Download size={18} />
          <span>Скачать QR-код</span>
        </button>
      </div>
    </div>
  );
};

export default QRCodePage;
