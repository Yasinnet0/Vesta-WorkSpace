import React from 'react';
import { Trash2, Copy, Check, ChevronDown, ChevronUp, Clock, Link2 } from 'lucide-react';

const NoteCard = ({ note, onDelete, onClick, isSelected }) => {
  const [copied, setCopied] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
 
  return (
    <div 
      onClick={onClick}
      className={`minimal-card group p-4 flex flex-col h-full relative bg-[var(--color-card)] border-[var(--color-border)] cursor-pointer transition-all duration-300 ${
        isSelected ? 'border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 rounded bg-white/[0.03] border border-border">
          {note.category || 'Thought'}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-1.5 text-slate-600 hover:text-foreground hover:bg-white/[0.05] rounded-md transition-all"
            title="Copy"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
 
      <div className="flex-1 min-h-0">
        <p className={`text-slate-400 text-xs whitespace-pre-wrap leading-relaxed transition-all duration-300 ${
          !isExpanded ? 'line-clamp-5' : ''
        }`}>
          {note.content || ''}
        </p>
        
        {String(note.content || '').length > 200 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-accent-blue text-[9px] font-bold mt-2 hover:text-white transition-all uppercase tracking-widest"
          >
            {isExpanded ? (
                <>Collapse <ChevronUp size={11} /></>
            ) : (
                <>Expand <ChevronDown size={11} /></>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-[9px] text-slate-600 font-bold uppercase tracking-widest">
            <Clock size={11} className="opacity-50" />
            {(() => {
              try {
                const d = new Date(note.created || Date.now());
                return isNaN(d.getTime()) 
                  ? new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
                  : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              } catch {
                return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }
            })()}
        </div>
        
        {Math.random() > 0.8 && (
            <div className="flex items-center gap-1.5">
                <Link2 size={11} className="text-accent-blue/40" />
                <div className="w-1 h-1 rounded-full bg-accent-blue/40" />
            </div>
        )}
      </div>
    </div>
  );
};

export default NoteCard;
