import { useId, useState } from 'react';

type DialogRequest = {
  message: string;
  mode: 'confirm' | 'alert';
  resolve: (accepted: boolean) => void;
};

export const useActionDialog = () => {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const titleId = useId();
  const messageId = useId();

  const confirm = (message: string): Promise<boolean> => new Promise((resolve) => {
    setRequest({ message, mode: 'confirm', resolve });
  });

  const alert = (message: string): Promise<void> => new Promise((resolve) => {
    setRequest({ message, mode: 'alert', resolve: () => resolve() });
  });

  const close = (accepted: boolean) => {
    if (!request) return;
    request.resolve(accepted);
    setRequest(null);
  };

  const dialog = request ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) close(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') close(false);
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="card w-full max-w-md shadow-2xl"
      >
        <h2 id={titleId} className="text-xl font-bold">
          {request.mode === 'confirm' ? 'Подтвердите действие' : 'Сообщение'}
        </h2>
        <p id={messageId} className="mt-3 whitespace-pre-wrap text-textSecondary">{request.message}</p>
        <div className="mt-6 flex justify-end gap-3">
          {request.mode === 'confirm' && (
            <button type="button" onClick={() => close(false)} className="btn btn-secondary">
              Отмена
            </button>
          )}
          <button type="button" autoFocus onClick={() => close(true)} className="btn btn-primary">
            {request.mode === 'confirm' ? 'Удалить' : 'Понятно'}
          </button>
        </div>
      </section>
    </div>
  ) : null;

  return { confirm, alert, dialog };
};
