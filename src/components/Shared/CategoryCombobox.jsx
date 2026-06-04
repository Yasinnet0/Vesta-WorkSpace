import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Tag, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CategoryCombobox = ({
  value = '',
  onChange,
  suggestions = [],
  placeholder = 'Select or type category...',
  accentColor = 'blue', // 'blue', 'amber', 'violet', 'emerald', 'rose', etc.
  variant = 'default' // 'default' or 'minimal'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const containerRef = useRef(null);

  // Sync searchQuery with outer value when value changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset query to last selected value if closed without selection
        setSearchQuery(value);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  // Filter suggestions based on searchQuery
  const filteredSuggestions = suggestions.filter(cat => 
    cat.toLowerCase().includes((searchQuery || '').toLowerCase()) &&
    cat.trim() !== ''
  );

  const handleSelectOption = (option) => {
    onChange(option);
    setSearchQuery(option);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (searchQuery && searchQuery.trim() !== '') {
        handleSelectOption(searchQuery.trim());
        e.preventDefault();
        e.stopPropagation();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      setSearchQuery(value);
      e.target.blur();
    }
  };

  // Determine active border / text styles based on accent color
  const accentStyles = {
    blue: {
      borderFocus: 'focus:border-blue-500/50',
      activeText: 'text-blue-400',
      hoverBg: 'hover:bg-blue-500/10',
      activeBg: 'bg-blue-500/10'
    },
    amber: {
      borderFocus: 'focus:border-amber-500/50',
      activeText: 'text-amber-400',
      hoverBg: 'hover:bg-amber-500/10',
      activeBg: 'bg-amber-500/10'
    },
    violet: {
      borderFocus: 'focus:border-violet-500/50',
      activeText: 'text-violet-400',
      hoverBg: 'hover:bg-violet-500/10',
      activeBg: 'bg-violet-500/10'
    },
    emerald: {
      borderFocus: 'focus:border-emerald-500/50',
      activeText: 'text-emerald-400',
      hoverBg: 'hover:bg-emerald-500/10',
      activeBg: 'bg-emerald-500/10'
    },
    rose: {
      borderFocus: 'focus:border-rose-500/50',
      activeText: 'text-rose-400',
      hoverBg: 'hover:bg-rose-500/10',
      activeBg: 'bg-rose-500/10'
    }
  }[accentColor] || {
    borderFocus: 'focus:border-blue-500/50',
    activeText: 'text-blue-400',
    hoverBg: 'hover:bg-blue-500/10',
    activeBg: 'bg-blue-500/10'
  };

  const isMinimal = variant === 'minimal';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Field Container */}
      <div className={
        isMinimal 
          ? 'relative flex items-center transition-all bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-lg px-2 py-0.5 gap-1.5 h-8 w-32 cursor-pointer'
          : 'relative flex items-center'
      }>
        {isMinimal && <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={
            isMinimal
              ? 'bg-transparent border-none outline-none text-[10px] text-slate-300 placeholder:text-slate-500 w-16 font-bold focus:ring-0 focus:outline-none py-0.5'
              : `w-full bg-white/[0.02] hover:bg-white/[0.03] border border-white/10 rounded-xl pl-4 pr-12 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none ${accentStyles.borderFocus} transition-all font-semibold`
          }
        />
        
        {isMinimal ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            title="Browse Categories"
            className="text-slate-500 hover:text-white hover:bg-white/5 p-1 rounded transition-all shrink-0 ml-auto active:scale-95"
          >
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`} />
          </button>
        ) : (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
            <div className="w-px h-4 bg-white/10 shrink-0" />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              title="Browse Categories"
              className="text-slate-500 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-all active:scale-95 shrink-0"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Floating Glassmorphic Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[60] left-0 right-0 mt-2 max-h-52 overflow-y-auto bg-[var(--color-card)]/95 border border-[var(--color-border)] backdrop-blur-xl rounded-xl shadow-2xl no-scrollbar divide-y divide-white/5"
          >
            {/* Suggestions List */}
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((cat, idx) => {
                const isSelected = value.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={`${cat}-${idx}`}
                    type="button"
                    onClick={() => handleSelectOption(cat)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white transition-all ${accentStyles.hoverBg} ${isSelected ? `${accentStyles.activeBg} ${accentStyles.activeText}` : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className={`w-3.5 h-3.5 ${isSelected ? accentStyles.activeText : 'text-slate-500'}`} />
                      <span>{cat}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })
            ) : (
              // Empty list state - search query can be added as a new option
              searchQuery.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => handleSelectOption(searchQuery.trim())}
                  className={`w-full text-left px-4 py-3 flex items-center gap-2.5 text-xs text-slate-400 hover:text-white transition-all ${accentStyles.hoverBg}`}
                >
                  <Plus className={`w-4 h-4 ${accentStyles.activeText} animate-pulse`} />
                  <span>Create Category: <span className="text-white font-bold">"{searchQuery.trim()}"</span></span>
                </button>
              )
            )}

            {/* Quick helper for General if list is empty */}
            {filteredSuggestions.length === 0 && searchQuery.trim() === '' && (
              <button
                type="button"
                onClick={() => handleSelectOption('General')}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-all ${accentStyles.hoverBg}`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>General</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryCombobox;
