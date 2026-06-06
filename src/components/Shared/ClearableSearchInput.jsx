import { useRef } from 'react';
import { Search, X } from 'lucide-react';

const ClearableSearchInput = ({
  value,
  onChange,
  placeholder,
  wrapperClassName = '',
  inputClassName = '',
  iconClassName = '',
  clearButtonClassName = '',
  clearAriaLabel = 'Clear search',
  ...inputProps
}) => {
  const inputRef = useRef(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <Search
        className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 ${iconClassName}`.trim()}
        size={13}
      />
      <input
        {...inputProps}
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClassName} pr-10`.trim()}
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label={clearAriaLabel}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue-bright)]/40 ${clearButtonClassName}`.trim()}
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
};

export default ClearableSearchInput;
