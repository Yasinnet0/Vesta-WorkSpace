import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon }) => {
  return (
    <motion.div 
      className="minimal-card p-6 flex flex-col justify-between gap-5 relative overflow-hidden group select-none min-h-[140px]"
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Dynamic Radial glow track on hover */}
      <div 
        className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle 120px at 85% 15%, var(--color-accent-blue-bright), transparent 90%)',
          mixBlendMode: 'plus-lighter',
          opacity: 0.07
        }}
      />
      
      {/* Top section: Icon */}
      <div className="flex items-center justify-between z-10">
        <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/15 transition-all duration-500 group-hover:bg-accent-blue group-hover:text-white group-hover:border-accent-blue group-hover:shadow-[0_0_15px_rgba(96,165,250,0.3)]">
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
      
      {/* Value & Title section */}
      <div className="space-y-1 z-10">
        <p className="text-slate-500 text-[9px] font-mono font-bold uppercase tracking-[0.2em] transition-colors group-hover:text-slate-400">
          {title}
        </p>
        <div className="flex items-baseline gap-1.5">
          <h3 className="text-3xl font-extrabold text-foreground tracking-tight group-hover:text-white transition-colors">
            {value}
          </h3>
        </div>
      </div>

      {/* Decorative large background icon with motion delay */}
      <Icon 
        className="absolute -bottom-3 -right-3 text-white/[0.015] w-20 h-20 transition-all duration-700 ease-out group-hover:scale-110 group-hover:text-accent-blue/[0.03] group-hover:rotate-6 pointer-events-none" 
        strokeWidth={1} 
      />

      {/* Glowing Bottom Border Accent - expands from center on hover */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2.5px] bg-accent-blue transition-all duration-500 ease-out group-hover:w-full shadow-[0_0_10px_var(--color-accent-blue)]" />
    </motion.div>
  );
};

export default StatCard;
