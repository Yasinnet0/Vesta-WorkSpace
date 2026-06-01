import React, { Component } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import TitleBar from './components/Layout/TitleBar';
import Dashboard from './pages/Dashboard';
import Bookmarks from './pages/Bookmarks';
import Tasks from './pages/Tasks';
import Notes from './pages/Notes';
import Ideas from './pages/Ideas';
import Settings from './pages/Settings';
import GraphView from './pages/GraphView';
import Charts from './pages/Charts';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("App Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050506] text-white p-10 text-center">
          <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">System Error</h1>
          <p className="text-slate-400 mb-8 max-w-md">The neural network encountered an unexpected fault. Please restart the application.</p>
          <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs">Reset System</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('vesta-theme') || 'carbon';
    document.body.className = `theme-${savedTheme}`;
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <div className="flex flex-col h-screen overflow-hidden">
          <TitleBar />
          <div className="flex flex-1 pt-10 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto main-content no-scrollbar">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/graph" element={<GraphView />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/ideas" element={<Ideas />} />
                <Route path="/charts" element={<Charts />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
