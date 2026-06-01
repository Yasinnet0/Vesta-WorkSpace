import React, { useEffect, useState } from 'react';
import { getStats, getBookmarks, getTasks } from '../api';
import StatCard from '../components/Dashboard/StatCard';
import BookmarkCard from '../components/Bookmarks/BookmarkCard';
import TaskItem from '../components/Tasks/TaskItem';
import { Bookmark, CheckSquare, StickyNote, Lightbulb, ArrowRight, Activity, Cpu, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

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
    getBookmarks().then(res => setRecentBookmarks(res.data.slice(0, 3)));
    getTasks().then(res => setUpcomingTasks(res.data.filter(t => !t.completed).slice(0, 4)));
  }, []);

  return (
    <div className="space-y-12 pb-20 premium-page-entrance">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xxs font-bold uppercase tracking-[0.2em] text-accent-blue px-2 py-0.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center gap-1.5">
              <Sparkles size={10} />
              Neural Engine Active
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Workspace Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Analyzing and synchronizing your digital workflow.</p>
        </div>
        
        <div className="flex gap-3">
            <div className="minimal-card px-4 py-2 flex items-center gap-3 bg-transparent">
                <Activity size={16} className="text-slate-600" />
                <div>
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Efficiency</p>
                    <p className="text-foreground text-xs font-medium">94.2%</p>
                </div>
            </div>
            <div className="minimal-card px-4 py-2 flex items-center gap-3 bg-transparent">
                <Cpu size={16} className="text-slate-600" />
                <div>
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Active Nodes</p>
                    <p className="text-foreground text-xs font-medium">1,248</p>
                </div>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Bookmarks" value={stats.bookmarksCount} icon={Bookmark} />
        <StatCard title="Active Tasks" value={stats.tasksCount} icon={CheckSquare} />
        <StatCard title="Notes" value={stats.notesCount} icon={StickyNote} />
        <StatCard title="Ideas" value={stats.ideasCount} icon={Lightbulb} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">Recent Activity</h3>
            <Link to="/bookmarks" className="text-xxs font-bold text-accent-blue uppercase tracking-widest hover:text-white transition-colors">
                View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentBookmarks.map((bm, idx) => (
                <BookmarkCard key={bm.id || `bm-${idx}`} bookmark={bm} onDelete={() => {}} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">Priority Backlog</h3>
          </div>
          <div className="minimal-card divide-y divide-border overflow-hidden">
            {upcomingTasks.map((task, idx) => (
                <TaskItem key={task.id || `task-${idx}`} task={task} onToggle={() => {}} onDelete={() => {}} />
            ))}
            <Link to="/tasks" className="flex items-center justify-center gap-2 py-3 bg-white/[0.01] text-slate-500 hover:text-foreground transition-all text-xxs font-bold uppercase tracking-widest">
                Full Backlog <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
