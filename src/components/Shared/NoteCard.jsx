import React from 'react';
import { Trash2, Copy, Check, ChevronDown, ChevronUp, Clock, Link2, Folder } from 'lucide-react';

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

  const showLinkIcon = React.useMemo(() => Math.random() > 0.8, []);

  const getCategoryColor = () => {
    return 'text-accent-blue-bright bg-accent-blue/10 border-accent-blue/20';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(note.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
 
  return (
    <div 
      onClick={onClick}
      className={`group relative flex flex-col justify-between border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md select-none p-5 rounded-2xl min-h-[145px] h-full ${
        isSelected 
          ? 'bg-gradient-to-br from-[#161d36]/60 to-[#0c0e17]/80 border-accent-blue/40 shadow-[0_15px_30px_rgba(0,0,0,0.65),inset_0_0_12px_rgba(96,165,250,0.06)] scale-[1.01]' 
          : 'bg-gradient-to-br from-[#14172a]/25 to-[#0b0c14]/40 border-white/[0.03] hover:border-accent-blue/25 hover:bg-gradient-to-br hover:from-[#181d36]/35 hover:to-[#0f111f]/50 hover:translate-y-[-2px] hover:shadow-[0_15px_30px_rgba(0,0,0,0.55),0_0_20px_rgba(96,165,250,0.02)]'
      }`}
    >
      <div className="group-hover-shine" />
      <div className="flex items-center justify-between mb-3">
        <div className={`text-[8.5px] font-mono tracking-widest font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 transition-all duration-200 ${getCategoryColor(note.category)}`}>
          <Folder size={9} className="shrink-0" />
          <span>{note.category || 'Thought'}</span>
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
            {formattedDate}
        </div>
        
        {showLinkIcon && (
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
