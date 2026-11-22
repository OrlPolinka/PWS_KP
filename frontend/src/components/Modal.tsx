import { ReactNode, useId } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: 'max-w-lg' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl';
};

const Modal = ({ title, onClose, children, maxWidthClass = 'max-w-2xl' }: ModalProps) => {
  const titleId = useId();

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 p-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div
        className="flex min-h-full items-center justify-center"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`card max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto shadow-2xl`}
        >
          <header className="mb-5 flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-xl font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Закрыть" className="shrink-0 rounded-lg p-2 hover:bg-surface2">
              <X size={20} />
            </button>
          </header>
          {children}
        </section>
      </div>
    </div>
  );
};

export default Modal;
