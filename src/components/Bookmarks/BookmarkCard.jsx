import React from 'react';
import { ExternalLink, Trash2, Pin, ArrowUpRight, Globe } from 'lucide-react';

const BookmarkCard = ({ bookmark, onDelete, onPin, onClick, isSelected }) => {
  const getCategoryColor = () => {
    return 'text-accent-blue-bright bg-accent-blue/10 border-accent-blue/20';
  };

  return (
    <div 
      onClick={onClick}
      className={`group relative flex flex-col justify-between border transition-all duration-350 cursor-pointer overflow-hidden backdrop-blur-md select-none p-5 rounded-2xl min-h-[145px] h-full ${
        isSelected 
          ? 'bg-gradient-to-br from-[var(--color-card-hover-from)] to-[var(--color-card-hover-to)] border-accent-blue/50 shadow-[0_15px_30px_rgba(0,0,0,0.55),inset_0_0_12px_color-mix(in srgb,var(--color-accent-blue)_8%,transparent)] scale-[1.01]' 
          : 'bg-gradient-to-br from-[var(--color-card-from)] to-[var(--color-card-to)] border-[var(--color-border)] hover:border-accent-blue/35 hover:translate-y-[-2px] hover:shadow-[0_15px_30px_rgba(0,0,0,0.55),0_0_20px_color-mix(in srgb,var(--color-accent-blue)_4%,transparent)]'
      }`}
    >
      <div className="group-hover-shine" />
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-border flex items-center justify-center p-1.5 group-hover:border-accent-blue/30 transition-all duration-300">
          <img 
            src={`https://www.google.com/s2/favicons?sz=64&domain=${bookmark.domain || (bookmark.url ? new URL(bookmark.url).hostname : '')}`} 
            alt="" 
            className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
            onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{display: 'none'}} className="items-center justify-center text-accent-blue/50"><Globe size={14} /></div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin(bookmark.id);
          }}
          className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
            bookmark.pinned 
              ? 'text-accent-blue hover:text-slate-400 bg-white/[0.03] border border-accent-blue/20 shadow-md shadow-accent-blue/5' 
              : 'text-slate-700 hover:text-accent-blue hover:bg-white/[0.03] opacity-0 group-hover:opacity-100'
          }`}
          title={bookmark.pinned ? "Unpin Bookmark" : "Pin Bookmark"}
        >
          <Pin size={12} fill={bookmark.pinned ? "currentColor" : "none"} className={`transition-transform duration-300 ${bookmark.pinned ? "rotate-45" : "group-hover:scale-110"}`} />
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <div className={`text-[8px] font-mono tracking-widest font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 w-fit transition-all duration-200 ${getCategoryColor(bookmark.category)}`}>
          <span>{bookmark.category || 'General'}</span>
        </div>
        <h3 className="font-medium text-sm text-foreground truncate group-hover:text-accent-blue transition-colors">
          {bookmark.title}
        </h3>
      </div>

      <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 flex-1 mb-4">
        {bookmark.description || "Synthesizing resource intelligence for later retrieval."}
      </p>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(bookmark.id); }}
          className="p-1.5 text-slate-700 hover:text-red-500 rounded-md transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
        
        <a 
          href={bookmark.url} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xxs font-bold text-slate-500 uppercase tracking-widest hover:text-foreground flex items-center gap-1 transition-all"
        >
          Open
          <ArrowUpRight size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};

export default BookmarkCard;
