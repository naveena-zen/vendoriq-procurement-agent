import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import NewProject from './pages/NewProject';
import Report from './pages/Report';
import {
  LayoutGrid, FileText, Building2, ShieldAlert, Handshake, FileBarChart, Settings,
  ChevronLeft, ChevronRight, Search, Bell, Sun, Moon, LogOut, User, Plus, Menu, X
} from 'lucide-react';
import { fetchProjects } from './api/client';

// ─── Theme Context ─────────────────────────────────────────────────────────────
export const ThemeContext = createContext({ dark: true, toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ─── Sidebar Nav Items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/' },
  { id: 'rfps', label: 'Active RFPs', icon: FileText, path: '/', isRFPs: true },
  { id: 'vendors', label: 'Vendors', icon: Building2, path: '/vendors' },
  { id: 'risks', label: 'Risk Center', icon: ShieldAlert, path: '/risks' },
  { id: 'negotiations', label: 'Negotiations', icon: Handshake, path: '/negotiations' },
  { id: 'reports', label: 'Reports', icon: FileBarChart, path: '/reports' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

// ─── Placeholder Page (for unbuilt nav items) ─────────────────────────────────
function PlaceholderPage({ icon: Icon, title, description }) {
  return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto shadow-glow-blue">
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h2 className="font-display text-xl font-semibold text-text-primary">{title}</h2>
        <p className="text-text-muted text-sm leading-relaxed">{description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-card border border-surface-border rounded-xl text-text-muted text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          Coming Soon — Data aggregation view planned for next release
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Component ─────────────────────────────────────────────────────────
function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, projects }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [rfpsOpen, setRfpsOpen] = useState(true);

  const user = localStorage.getItem('procureiq_user') || 'User';
  const initials = user.split(/[\s@]/)[0]?.slice(0, 2).toUpperCase() || 'PQ';

  const handleLogout = () => {
    localStorage.removeItem('procureiq_token');
    localStorage.removeItem('procureiq_user');
    navigate('/login');
  };

  const isActive = (item) => {
    if (item.isRFPs) return false;
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-surface-divider ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-blue shrink-0">
          <span className="font-display font-bold text-white text-sm">P</span>
        </div>
        {!collapsed && (
          <div>
            <span className="font-display font-bold text-text-primary text-base">ProcureIQ</span>
            <span className="block text-[10px] text-text-faint font-medium -mt-0.5">Command Center</span>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          if (item.isRFPs) {
            return (
              <div key={item.id}>
                <button
                  onClick={() => !collapsed && setRfpsOpen(!rfpsOpen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group
                    ${collapsed ? 'justify-center' : ''}
                    text-text-muted hover:text-text-primary hover:bg-surface-cardHover`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0 text-text-faint group-hover:text-accent-blue transition-colors" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${rfpsOpen ? 'rotate-90' : ''}`} />
                    </>
                  )}
                </button>
                {!collapsed && rfpsOpen && projects?.length > 0 && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l border-surface-divider pl-3">
                    {projects.slice(0, 5).map((p) => (
                      <Link
                        key={p.id}
                        to={`/project/${p.id}/report`}
                        className="block text-[11px] text-text-faint hover:text-accent-blue py-1 truncate transition-colors"
                      >
                        {p.name}
                      </Link>
                    ))}
                    <Link to="/project/new" className="block text-[11px] text-accent-blue py-1 font-medium hover:text-accent-violet transition-colors">
                      + New Project
                    </Link>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group relative
                ${collapsed ? 'justify-center' : ''}
                ${active
                  ? 'bg-accent-blue/10 text-accent-blue border-l-[3px] border-accent-blue pl-[9px]'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-cardHover'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-accent-blue' : 'text-text-faint group-hover:text-accent-blue'}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: collapse toggle + user info */}
      <div className="border-t border-surface-divider p-2 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-text-faint hover:text-text-primary hover:bg-surface-cardHover text-xs transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>

        <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white font-mono text-[10px] font-bold shrink-0 relative">
            {initials}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-success border border-surface-sidebar" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-text-primary truncate">{user}</p>
              <p className="text-[10px] text-text-faint">Logged in</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="text-text-faint hover:text-danger transition-colors p-1 rounded" title="Log out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-surface-sidebar border-r border-surface-divider sidebar-transition z-30
          ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[260px] h-full bg-surface-sidebar border-r border-surface-divider flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-text-faint hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

// ─── Top Bar Component ─────────────────────────────────────────────────────────
function TopBar({ sidebarCollapsed, mobileOpen, setMobileOpen, dark, toggleTheme }) {
  const navigate = useNavigate();
  const [userOpen, setUserOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('procureiq_token');
    localStorage.removeItem('procureiq_user');
    navigate('/login');
  };

  const user = localStorage.getItem('procureiq_user') || 'User';
  const initials = user.split(/[\s@]/)[0]?.slice(0, 2).toUpperCase() || 'PQ';

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-surface-topbar border-b border-surface-divider z-20 flex items-center px-4 gap-4 transition-all duration-200
        ${sidebarCollapsed ? 'left-[72px]' : 'left-[260px]'} md:left-auto`}
      style={{ left: undefined }}
    >
      <div
        className={`fixed top-0 right-0 h-16 bg-surface-topbar border-b border-surface-divider z-20 flex items-center px-4 gap-4 transition-all duration-200`}
        style={{ left: sidebarCollapsed ? '72px' : '260px' }}
      >
        {/* Mobile hamburger */}
        <button
          className="md:hidden text-text-faint hover:text-text-primary"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg px-3 py-2 w-64 lg:w-96">
          <Search className="w-4 h-4 text-text-faint shrink-0" />
          <input
            type="text"
            placeholder="Search projects, vendors, risks…"
            className="bg-transparent text-xs text-text-primary placeholder:text-text-faint outline-none flex-1"
          />
        </div>

        <div className="flex-1" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-faint hover:text-text-primary hover:bg-surface-card transition-all"
          title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg text-text-faint hover:text-text-primary hover:bg-surface-card transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
        </button>

        {/* User Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white font-mono text-[10px] font-bold shadow-glow-blue hover:shadow-glow-violet transition-all"
          >
            {initials}
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-surface-card border border-surface-border rounded-xl shadow-card py-1 z-50">
              <div className="px-3 py-2 border-b border-surface-divider">
                <p className="text-xs font-semibold text-text-primary truncate">{user}</p>
                <p className="text-[10px] text-text-faint">Procurement Admin</p>
              </div>
              <Link to="/settings" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-cardHover transition-colors">
                <Settings className="w-3.5 h-3.5" /> Settings
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-surface-cardHover w-full transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── App Shell (wraps all authenticated pages) ────────────────────────────────
function AppShell({ children, projects }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggleTheme } = useTheme();

  return (
    <div className={dark ? 'dark' : ''}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        projects={projects}
      />
      <TopBar
        sidebarCollapsed={collapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        dark={dark}
        toggleTheme={toggleTheme}
      />
      <main
        className="min-h-screen bg-surface-bg pt-16 transition-all duration-200"
        style={{ marginLeft: collapsed ? '72px' : '260px' }}
      >
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('procureiq_token'));
  const [dark, setDark] = useState(true);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem('procureiq_token'));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects().then(setProjects).catch(() => {});
    }
  }, [isAuthenticated]);

  const toggleTheme = () => setDark(!dark);

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      <div className={dark ? 'dark' : ''}>
        <Router>
          <Routes>
            {/* Login — no sidebar/shell */}
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/" replace /> : <Login setAuth={setIsAuthenticated} />}
            />

            {/* Authenticated shell routes */}
            <Route
              path="/"
              element={
                isAuthenticated
                  ? <AppShell projects={projects}><Home projects={projects} reloadProjects={() => fetchProjects().then(setProjects).catch(() => {})} /></AppShell>
                  : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/project/new"
              element={isAuthenticated ? <AppShell projects={projects}><NewProject /></AppShell> : <Navigate to="/login" replace />}
            />
            <Route
              path="/project/:id/report"
              element={isAuthenticated ? <AppShell projects={projects}><Report /></AppShell> : <Navigate to="/login" replace />}
            />

            {/* Stub routes for sidebar nav items */}
            <Route
              path="/vendors"
              element={isAuthenticated
                ? <AppShell projects={projects}><PlaceholderPage icon={Building2} title="Vendor Intelligence Hub" description="Aggregated vendor profiles, scoring history, and cross-project benchmarks across all your active RFP evaluations." /></AppShell>
                : <Navigate to="/login" replace />}
            />
            <Route
              path="/risks"
              element={isAuthenticated
                ? <AppShell projects={projects}><PlaceholderPage icon={ShieldAlert} title="Risk Command Center" description="All high-severity and medium-severity contract risks flagged by the AI across every active procurement project, sorted by urgency." /></AppShell>
                : <Navigate to="/login" replace />}
            />
            <Route
              path="/negotiations"
              element={isAuthenticated
                ? <AppShell projects={projects}><PlaceholderPage icon={Handshake} title="Negotiation Hub" description="All AI-drafted negotiation emails and strategy tips across active projects, with send-tracking and outcome logging." /></AppShell>
                : <Navigate to="/login" replace />}
            />
            <Route
              path="/reports"
              element={isAuthenticated
                ? <AppShell projects={projects}><PlaceholderPage icon={FileBarChart} title="Reports & Export History" description="Generated executive summaries, Excel exports, and Ariba/Coupa integration packages across all projects." /></AppShell>
                : <Navigate to="/login" replace />}
            />
            <Route
              path="/settings"
              element={isAuthenticated
                ? <AppShell projects={projects}><PlaceholderPage icon={Settings} title="Settings & Account" description="Manage passcode, API key configuration, notification preferences, and user account details." /></AppShell>
                : <Navigate to="/login" replace />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </div>
    </ThemeContext.Provider>
  );
}
