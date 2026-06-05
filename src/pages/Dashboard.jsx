import React, { useEffect, useState } from 'react';
import { getStats, getBookmarks, getTasks } from '../api';
import StatCard from '../components/Dashboard/StatCard';
import BookmarkCard from '../components/Bookmarks/BookmarkCard';
import TaskItem from '../components/Tasks/TaskItem';
import { Bookmark, CheckSquare, StickyNote, Lightbulb, ArrowRight, Activity, Cpu, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 240,
      damping: 22
    }
  }
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    bookmarksCount: 0,
    tasksCount: 0,
    notesCount: 0,
    ideasCount: 0
  });
  const [recentBookmarks, setRecentBookmarks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);

  useEffect(() => {
    getStats().then(res => setStats(res.data));
    getBookmarks().then(res => setRecentBookmarks(res.data.slice(0, 4)));
    getTasks().then(res => setUpcomingTasks(res.data.filter(t => !t.completed).slice(0, 4)));
  }, []);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-20"
    >
      {/* Premium Aerospace Dashboard Header */}
      <motion.header 
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.04]"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[8.5px] font-mono font-bold uppercase tracking-[0.25em] text-accent-blue px-2.5 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center gap-1.5">
              <Sparkles size={10} className="text-accent-blue-bright animate-pulse" />
              Neural Engine Active
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Workspace Overview
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Analyzing and synchronizing your digital intelligence flow.
          </p>
        </div>
        
        {/* Dynamic Telemetry Status Cards */}
        <div className="flex gap-4">
          <div className="minimal-card px-5 py-3 flex items-center gap-4 bg-transparent border-white/[0.04] backdrop-blur-md relative overflow-hidden group select-none min-w-[150px]">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-450 border border-emerald-500/15 shadow-[0_0_12px_rgba(16,185,129,0.05)] group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
              <Activity size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[8.5px] text-slate-500 font-mono font-bold uppercase tracking-wider">Efficiency</p>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.85)] animate-pulse" />
              </div>
              <p className="text-foreground text-sm font-black font-mono mt-0.5">94.2%</p>
            </div>
          </div>
          
          <div className="minimal-card px-5 py-3 flex items-center gap-4 bg-transparent border-white/[0.04] backdrop-blur-md relative overflow-hidden group select-none min-w-[150px]">
            <div className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue-bright border border-accent-blue/15 shadow-[0_0_12px_rgba(96,165,250,0.05)] group-hover:bg-accent-blue group-hover:text-white transition-all duration-300">
              <Cpu size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[8.5px] text-slate-500 font-mono font-bold uppercase tracking-wider">Nodes</p>
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shadow-[0_0_6px_rgba(96,165,250,0.85)] animate-pulse" />
              </div>
              <p className="text-foreground text-sm font-black font-mono mt-0.5">1,248</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Grid of Stats Cards */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard title="Bookmarks" value={stats.bookmarksCount} icon={Bookmark} />
        <StatCard title="Active Tasks" value={stats.tasksCount} icon={CheckSquare} />
        <StatCard title="Notes" value={stats.notesCount} icon={StickyNote} />
        <StatCard title="Ideas" value={stats.ideasCount} icon={Lightbulb} />
      </motion.div>

      {/* Main content split panel */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-10"
      >
        {/* Left pane: Recent Activity (Bookmarks) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue-bright shadow-[0_0_6px_var(--color-accent-blue-bright)]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">Recent Activity</h3>
            </div>
            <Link to="/bookmarks" className="text-[9px] font-mono font-black text-accent-blue uppercase tracking-widest hover:text-white transition-colors border-b border-transparent hover:border-white/20 pb-0.5">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentBookmarks.length > 0 ? (
              recentBookmarks.map((bm, idx) => (
                <motion.div
                  key={bm.id || `bm-${idx}`}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <BookmarkCard bookmark={bm} onDelete={() => {}} />
                </motion.div>
              ))
            ) : (
              <div className="col-span-2 minimal-card border border-dashed border-white/[0.03] flex flex-col items-center justify-center p-12 text-center bg-transparent">
                <Bookmark className="text-slate-700 mb-3" size={24} />
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">No recent bookmarks logged</p>
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Priority Backlog (Tasks) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">Priority Backlog</h3>
            </div>
          </div>
          <div className="minimal-card border border-white/[0.04] bg-[#0b0c16]/30 divide-y divide-white/[0.02] overflow-hidden rounded-2xl">
            {upcomingTasks.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {upcomingTasks.map((task, idx) => (
                  <div 
                    key={task.id || `task-${idx}`} 
                    className="hover:bg-white/[0.015] transition-colors p-2"
                  >
                    <TaskItem 
                      task={task} 
                      compact={true}
                      onToggle={() => {}} 
                      onDelete={() => {}} 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-transparent border-b border-white/[0.02]">
                <CheckSquare className="text-slate-700 mb-3" size={24} />
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">All objectives cleared</p>
              </div>
            )}
            
            <Link 
              to="/tasks" 
              className="flex items-center justify-center gap-2 py-4 bg-white/[0.005] hover:bg-white/[0.02] text-slate-500 hover:text-white transition-all text-[9.5px] font-mono font-black uppercase tracking-widest"
            >
              Full Backlog <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
