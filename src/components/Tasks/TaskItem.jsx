import React from 'react';
import { Trash2, Calendar, Check, FileText, Folder } from 'lucide-react';
import { motion } from 'framer-motion';

const TaskItem = ({ task, onToggle, onDelete, onUpdatePriority, isSelected, onClick, compact = false }) => {
  const currentPriority = task.priority || 'medium';

  const priorityThemes = {
    high: {
      text: 'HIGH',
      badge: 'text-rose-400 border-rose-500/10 bg-rose-500/5',
      dot: 'bg-rose-500'
    },
    medium: {
      text: 'MEDIUM',
      badge: 'text-blue-400 border-blue-500/10 bg-blue-500/5',
      dot: 'bg-blue-500'
    },
    low: {
      text: 'LOW',
      badge: 'text-slate-400 border-white/5 bg-white/[0.01]',
      dot: 'bg-slate-500'
    }
  };

  const priorityTheme = priorityThemes[currentPriority] || priorityThemes.medium;

  const getCategoryColor = () => {
    return 'text-accent-blue-bright bg-accent-blue/5 border-accent-blue/10';
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
      const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      if (diffDays < 0) {
        return { text: `${Math.abs(diffDays)}d Overdue`, className: 'text-rose-400 bg-rose-500/5 border-rose-500/10' };
      }
      if (diffDays === 0) {
        return { text: 'Today', className: 'text-amber-400 bg-amber-500/5 border-amber-500/10' };
      }
      if (diffDays === 1) {
        return { text: 'Tomorrow', className: 'text-blue-400 bg-blue-500/5 border-blue-500/10' };
      }
      return { text: formatted, className: 'text-slate-450 bg-white/[0.005] border-white/5' };
    } catch {
      return null;
    }
  };

  const dueDate = getDueDateConfig(task.dueDate);
  const categoryColorClass = getCategoryColor();

  return (
    <div 
      onClick={onClick}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`group relative flex flex-col justify-between border transition-all duration-350 cursor-pointer overflow-hidden backdrop-blur-md select-none ${
        compact 
          ? 'pt-3.5 pb-3.5 pl-4.5 pr-4 rounded-xl min-h-[112px]' 
          : 'pt-5 pb-5 pl-6 pr-5 rounded-2xl min-h-[140px]'
      } ${
        task.completed 
          ? 'bg-slate-950/25 border-[var(--color-border)] opacity-50 hover:opacity-75' 
          : isSelected 
            ? 'bg-gradient-to-br from-[var(--color-card-hover-from)] to-[var(--color-card-hover-to)] border-accent-blue/50 shadow-[0_15px_30px_rgba(0,0,0,0.55),inset_0_0_12px_color-mix(in srgb,var(--color-accent-blue)_8%,transparent)] scale-[1.01]' 
            : 'bg-gradient-to-br from-[var(--color-card-from)] to-[var(--color-card-to)] border-[var(--color-border)] hover:border-accent-blue/35 hover:translate-y-[-2px] hover:shadow-[0_15px_30px_rgba(0,0,0,0.55),0_0_20px_color-mix(in srgb,var(--color-accent-blue)_4%,transparent)]'
      }`}
    >
      {/* Top row: Checkbox, status light, category / date tags */}
      <div className={`flex items-center justify-between gap-2 text-[8.5px] font-mono tracking-widest font-bold uppercase select-none border-b border-white/[0.02] w-full ${compact ? 'pb-2' : 'pb-2.5'}`}>
        <div className="flex items-center gap-2">
          {/* Checkbox button with tactile spring animation */}
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 500, damping: 10 }}
            className={`relative shrink-0 rounded-md flex items-center justify-center cursor-pointer focus:outline-none group/check active:scale-90 transition-transform ${
              compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'
            }`}
          >
            {/* Simple checkbox background */}
            <div className={`absolute inset-0 rounded-md border transition-all duration-200 ${
              task.completed 
                ? 'bg-emerald-500 border-transparent'
                : 'border-slate-500 group-hover:border-accent-blue bg-[#0d0f18]/85'
            }`} />

            {task.completed && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 12 }}
                className="z-10 text-white"
              >
                <Check size={compact ? 8 : 10} strokeWidth={4} />
              </motion.div>
            )}
          </motion.button>

          {/* Simple status light for priority */}
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityTheme.dot}`} />
          {!compact && (
            <span className="text-slate-400 font-bold tracking-wider">{priorityTheme.text}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 ${categoryColorClass}`}>
            <Folder size={9} className="shrink-0" />
            <span>{task.list || 'Main'}</span>
          </span>
          {dueDate && (
            <span className={`text-[8.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 ${dueDate.className}`}>
              <Calendar size={9} className="shrink-0" />
              <span>{dueDate.text}</span>
            </span>
          )}
        </div>
      </div>

      {/* Middle row: Title */}
      <div className={`min-w-0 flex-1 ${compact ? 'mt-2.5 mb-2' : 'mt-4 mb-3.5'}`}>
        <h4 className={`leading-normal uppercase tracking-wider line-clamp-3 transition-colors ${
          compact ? 'text-[11px] font-bold' : 'text-[12.5px] font-extrabold'
        } ${
          task.completed ? 'line-through text-slate-500 font-semibold' : 'text-slate-200 group-hover:text-white'
        }`}>
          {task.text}
        </h4>
      </div>

      {/* Bottom row: Description preview & Hover delete */}
      <div className={`flex items-center justify-between mt-auto border-t border-white/[0.02] text-[9px] font-mono tracking-widest select-none text-slate-500 px-1 ${
        compact ? 'pt-2' : 'pt-3'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
          {task.notes && (
            <>
              <FileText size={10} className="text-slate-600 shrink-0" />
              <span className="truncate">{task.notes}</span>
            </>
          )}
        </div>

        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all focus:outline-none cursor-pointer"
          title="Delete Objective"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

export default TaskItem;
