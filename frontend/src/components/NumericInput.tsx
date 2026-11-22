import { useState, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent, type ClipboardEvent } from 'react';

type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const negativeValueMessage = 'Отрицательные значения недопустимы.';

const NumericInput = ({ className, onChange, onKeyDown, onPaste, ...props }: NumericInputProps) => {
  const [negativeValue, setNegativeValue] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isNegative = event.currentTarget.value !== '' && event.currentTarget.valueAsNumber < 0;
    if (isNegative) {
      const minimum = Number(props.min);
      event.currentTarget.value = String(Number.isFinite(minimum) ? Math.max(minimum, 0) : 0);
    }
    setNegativeValue(isNegative);
    onChange?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === '-' || event.key === 'Subtract') {
      event.preventDefault();
      setNegativeValue(true);
    }
    onKeyDown?.(event);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (event.clipboardData.getData('text').trim().startsWith('-')) {
      event.preventDefault();
      setNegativeValue(true);
    }
    onPaste?.(event);
  };

  return (
    <>
      <input
        {...props}
        type="number"
        className={className}
        aria-invalid={negativeValue || props['aria-invalid'] || undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      {negativeValue && <span role="alert" className="mt-1 block text-xs text-error">{negativeValueMessage}</span>}
    </>
  );
};

export default NumericInput;
