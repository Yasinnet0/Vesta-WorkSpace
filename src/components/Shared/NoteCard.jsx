import React from 'react';
import { Trash2, Copy, Check, ChevronDown, ChevronUp, Clock, Folder } from 'lucide-react';

const NoteCard = ({ note, onDelete, onClick, isSelected }) => {
  const [copied, setCopied] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const formattedDate = React.useMemo(() => {
    try {
      const d = note.created ? new Date(note.created) : new Date();
      return isNaN(d.getTime()) 
        ? new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  }, [note.created]);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={onClick}
      className={`group relative flex flex-col justify-between border transition-all duration-350 cursor-pointer overflow-hidden backdrop-blur-md select-none pt-5 pb-5 pl-6 pr-5 rounded-2xl min-h-[140px] h-full ${
        isSelected 
          ? 'bg-gradient-to-br from-[var(--color-card-hover-from)] to-[var(--color-card-hover-to)] border-accent-blue/50 shadow-[0_15px_30px_rgba(0,0,0,0.55),inset_0_0_12px_color-mix(in srgb,var(--color-accent-blue)_8%,transparent)] scale-[1.01]' 
          : 'bg-gradient-to-br from-[var(--color-card-from)] to-[var(--color-card-to)] border-[var(--color-border)] hover:border-accent-blue/35 hover:translate-y-[-2px] hover:shadow-[0_15px_30px_rgba(0,0,0,0.55),0_0_20px_color-mix(in srgb,var(--color-accent-blue)_4%,transparent)]'
      }`}
    >
      {/* Top row: Status, Category, and Date tags */}
      <div className="flex items-center justify-between gap-2 text-[8.5px] font-mono tracking-widest font-bold uppercase select-none border-b border-white/[0.02] w-full pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <span className="text-slate-400 font-bold tracking-wider">IDEA</span>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 text-accent-blue-bright bg-accent-blue/5 border-accent-blue/10">
            <Folder size={9} className="shrink-0" />
            <span>{note.category || 'General'}</span>
          </span>
          <span className="text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 text-slate-450 bg-white/[0.005] border-white/5">
            <Clock size={9} className="shrink-0" />
            <span>{formattedDate}</span>
          </span>
        </div>
      </div>

      {/* Middle row: Content text */}
      <div className="min-w-0 flex-1 mt-4 mb-3.5">
        <p className={`leading-normal uppercase tracking-wider transition-colors text-[12.5px] font-extrabold ${
          isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
        } ${!isExpanded ? 'line-clamp-4' : ''}`}>
          {note.content || ''}
        </p>
        {String(note.content || '').length > 200 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="flex items-center gap-1 text-accent-blue text-[9px] font-bold mt-2 hover:text-white transition-all uppercase tracking-widest cursor-pointer"
          >
            {isExpanded ? (
                <>Collapse <ChevronUp size={11} /></>
            ) : (
                <>Expand <ChevronDown size={11} /></>
            )}
          </button>
        )}
      </div>

      {/* Bottom row: Meta & Action buttons */}
      <div className="flex items-center justify-between mt-auto border-t border-white/[0.02] text-[9px] font-mono tracking-widest select-none text-slate-550 px-1 pt-3">
        <div className="flex items-center gap-1 text-slate-500">
          <span className="text-[8px] font-mono tracking-widest text-slate-600 font-bold uppercase">[RAW SPARK]</span>
        </div>

        <div className="flex items-center gap-1">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-all focus:outline-none cursor-pointer"
            title="Copy Content"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-all focus:outline-none cursor-pointer"
            title="Delete Idea"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
