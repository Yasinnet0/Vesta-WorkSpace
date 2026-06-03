import React from 'react';
import { Trash2, Calendar, Check, FileText, Folder } from 'lucide-react';
import { motion } from 'framer-motion';

const TaskItem = ({ task, onToggle, onDelete, onUpdatePriority, isSelected, onClick, compact = false }) => {
  const currentPriority = task.priority || 'medium';

  const priorityThemes = {
    high: {
      text: 'HIGH FOCUS',
      badge: 'text-rose-400 border-rose-500/20 bg-rose-500/5 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
      dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
      bar: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
    },
    medium: {
      text: 'MEDIUM FOCUS',
      badge: 'text-accent-blue-bright border-accent-blue/20 bg-accent-blue/5 shadow-[0_0_10px_rgba(96,165,250,0.1)]',
      dot: 'bg-accent-blue shadow-[0_0_8px_rgba(96,165,250,0.8)]',
      bar: 'bg-accent-blue shadow-[0_0_12px_rgba(96,165,250,0.6)]'
    },
    low: {
      text: 'LOW FOCUS',
      badge: 'text-slate-450 border-white/5 bg-white/[0.01]',
      dot: 'bg-slate-500',
      bar: 'bg-slate-600'
    }
  };

  const priorityTheme = priorityThemes[currentPriority] || priorityThemes.medium;

  const getCategoryColor = () => {
    return 'text-accent-blue-bright bg-accent-blue/10 border-accent-blue/20';
  };

  const getDueDateConfig = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (diffDays < 0) {
        return { text: `${Math.abs(diffDays)}d Overdue`, className: 'text-rose-400 bg-rose-500/5 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)] font-bold animate-pulse' };
      }
      if (diffDays === 0) {
        return { text: 'Today', className: 'text-amber-450 bg-amber-550/10 border-amber-500/20 font-black shadow-[0_0_8px_rgba(245,158,11,0.1)]' };
      }
      if (diffDays === 1) {
        return { text: 'Tomorrow', className: 'text-accent-blue-bright bg-accent-blue/5 border-accent-blue/15' };
      }
      return { text: formatted, className: 'text-slate-400 bg-white/[0.005] border-white/5' };
    } catch {
      return null;
    }
  };

  const dueDate = getDueDateConfig(task.dueDate);
  const categoryColorClass = getCategoryColor(task.list);

  return (
    <div 
      onClick={onClick}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`group relative flex flex-col justify-between border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md select-none ${
        compact 
          ? 'pt-3 pb-3 px-3.5 rounded-xl min-h-[112px]' 
          : 'p-5 rounded-2xl min-h-[145px]'
      } ${
        task.completed 
          ? 'bg-slate-950/15 border-white/[0.01] opacity-40 hover:opacity-65' 
          : isSelected 
            ? 'bg-gradient-to-br from-[#161d36]/60 to-[#0c0e17]/80 border-accent-blue/40 shadow-[0_15px_30px_rgba(0,0,0,0.65),inset_0_0_12px_rgba(96,165,250,0.06)] scale-[1.01]' 
            : 'bg-gradient-to-br from-[#14172a]/25 to-[#0b0c14]/40 border-white/[0.03] hover:border-accent-blue/25 hover:bg-gradient-to-br hover:from-[#181d36]/35 hover:to-[#0f111f]/50 hover:translate-y-[-2px] hover:shadow-[0_15px_30px_rgba(0,0,0,0.55),0_0_20px_rgba(96,165,250,0.02)]'
      }`}
    >
      {/* Glare Sweep Layer */}
      <div className="group-hover-shine" />

      {/* Top row: Checkbox, Priority Capsule & Sector / Date tags */}
      <div className={`flex items-center justify-between gap-2 text-[8.5px] font-mono tracking-widest font-bold uppercase select-none border-b border-white/[0.02] w-full ${compact ? 'pb-1.5' : 'pb-2'}`}>
        <div className="flex items-center gap-2">
          {/* Checkbox button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            className={`relative shrink-0 rounded-md flex items-center justify-center cursor-pointer focus:outline-none group/check active:scale-90 transition-transform ${
              compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'
            }`}
          >
            {/* Double-bordered checkbox background */}
            <div className={`absolute inset-0 rounded-md border transition-all duration-200 ${
              task.completed 
                ? 'bg-emerald-500 border-transparent shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                : 'border-slate-500 group-hover:border-accent-blue bg-[#0d0f18]/85 group-hover:bg-accent-blue/10 group-hover/check:ring-2 group-hover/check:ring-accent-blue/20'
            }`} />

            {task.completed && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                className="z-10 text-white"
              >
                <Check size={compact ? 8 : 10} strokeWidth={4} />
              </motion.div>
            )}
          </button>

          {!compact && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all duration-200 ${priorityTheme.badge}`}>
              <span className={`w-1 h-1 rounded-full shrink-0 ${priorityTheme.dot}`} />
              <span>{priorityTheme.text}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 ${categoryColorClass}`}>
            <Folder size={9} className="shrink-0" />
            <span>{task.list || 'Main'}</span>
          </span>
          {dueDate && (
            <span className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 ${dueDate.className}`}>
              <Calendar size={9} className="shrink-0" />
              <span>{dueDate.text}</span>
            </span>
          )}
        </div>
      </div>

      {/* Middle row: Text Content */}
      <div className={`min-w-0 flex-1 ${compact ? 'mt-2.5 mb-1.5' : 'mt-4 mb-3'}`}>
        <h4 className={`leading-normal uppercase tracking-wider line-clamp-3 transition-colors ${
          compact ? 'text-[11px] font-bold' : 'text-[12.5px] font-extrabold'
        } ${
          task.completed ? 'line-through text-slate-550 font-semibold' : 'text-slate-200 group-hover:text-white'
        }`}>
          {task.text}
        </h4>
      </div>

      {/* Bottom row: Description preview & Hover delete */}
      <div className={`flex items-center justify-between mt-auto border-t border-white/[0.02] text-[9px] font-mono tracking-widest select-none text-slate-550 px-1 ${
        compact ? 'pt-1.5' : 'pt-2.5'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
          {task.notes ? (
            <>
              <FileText size={10} className="text-slate-600 shrink-0" />
              <span className="text-slate-400 truncate">{task.notes}</span>
            </>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-400 truncate">+ Add Log notes</span>
          )}
        </div>

        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-550 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all focus:outline-none cursor-pointer"
          title="Delete Objective"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

export default TaskItem;
