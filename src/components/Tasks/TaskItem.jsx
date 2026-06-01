import React from 'react';
import { Check, Trash2, Calendar } from 'lucide-react';

const TaskItem = ({ task, onToggle, onDelete, onUpdatePriority, isSelected, onClick }) => {
  const priorityColors = {
    high: 'text-rose-400',
    medium: 'text-[var(--color-accent-blue-bright)]',
    low: 'text-slate-500'
  };

  const cyclePriority = () => {
    const priorities = ['low', 'medium', 'high'];
    const currentIndex = priorities.indexOf(task.priority || 'medium');
    const nextIndex = (currentIndex + 1) % priorities.length;
    onUpdatePriority(task.id, priorities[nextIndex]);
  };

  return (
    <div 
      onClick={onClick}
      className={`group flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-all cursor-pointer ${
        task.completed ? 'opacity-40' : ''
      } ${isSelected ? 'bg-gradient-to-r from-[var(--color-accent-blue)]/[0.08] to-transparent border-l-4 border-l-[var(--color-accent-blue-bright)] border-y border-y-[var(--color-border)]/50 shadow-lg' : 'border-l-4 border-l-transparent'}`}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
          task.completed 
          ? 'bg-[var(--color-accent-blue)] border-[var(--color-accent-blue)] text-white shadow-[0_0_8px_var(--color-accent-blue)]' 
          : 'border-slate-600 hover:border-[var(--color-accent-blue-bright)]'
        }`}
      >
        {task.completed && <Check size={12} strokeWidth={4} />}
      </button>

      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
        <span className={`text-sm font-semibold truncate ${
          task.completed ? 'line-through text-slate-600' : 'text-slate-200'
        }`}>
          {task.text}
        </span>
        
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-[var(--color-background)] px-2 py-1 rounded-lg border border-[var(--color-border)]">
            {task.list || 'Main'}
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              cyclePriority();
            }}
            className={`w-2 h-2 rounded-full ${priorityColors[task.priority] || priorityColors.medium} bg-current cursor-pointer hover:scale-150 transition-transform shadow-[0_0_8px_currentColor]`} 
            title={`Priority: ${task.priority || 'medium'} (Click to cycle)`}
          />
          
          {task.dueDate && (() => {
            try {
              const d = new Date(task.dueDate);
              if (isNaN(d.getTime())) return null;
              return (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                  <Calendar size={12} />
                  {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              );
            } catch {
              return null;
            }
          })()}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default TaskItem;
