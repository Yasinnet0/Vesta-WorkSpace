import React from 'react';

const StatCard = ({ title, value, icon: Icon }) => {
  return (
    <div className="minimal-card p-5 flex flex-col gap-4 relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue border border-accent-blue/10 transition-all duration-300 group-hover:bg-accent-blue group-hover:text-white">
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      
      <div className="space-y-0.5">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-semibold text-foreground tracking-tight">{value}</h3>
      </div>

      {/* Subtle background icon for premium feel */}
      <Icon className="absolute -bottom-2 -right-2 text-white/[0.02] w-16 h-16 transition-transform duration-500 group-hover:scale-110 group-hover:text-white/[0.04]" strokeWidth={1} />
    </div>
  );
};

export default StatCard;
