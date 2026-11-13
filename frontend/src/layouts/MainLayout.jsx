import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Layers,
  UserCheck,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  User,
} from 'lucide-react';

export default function MainLayout() {
  const { user, isSuperAdmin, logout, hasPermission } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Super Admin Navigation
  const superAdminNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Universities', path: '/universities', icon: Building2 },
    { name: 'Calendar / Holidays', path: '/universities/calendar', icon: Calendar },
    { name: 'Sections', path: '/sections', icon: Layers },
    { name: 'Success Coaches', path: '/coaches', icon: UserCheck },
    { name: 'Students', path: '/students', icon: GraduationCap },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
  ];

  // Success Coach Navigation
  const coachNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Sections', path: '/sections', icon: Layers },
    { name: 'Daily Attendance', path: '/attendance', icon: CalendarCheck },
    ...(hasPermission('addStudents') || hasPermission('editStudents')
      ? [{ name: 'Students', path: '/students', icon: GraduationCap }]
      : []),
    ...(hasPermission('exportReports')
      ? [{ name: 'Reports', path: '/reports', icon: FileSpreadsheet }]
      : []),
  ];

  const navigation = isSuperAdmin ? superAdminNav : coachNav;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-50 text-slate-900 font-sans">
      {/* 1. DESKTOP FIXED SIDEBAR (Occupies full viewport height, never moves during main content scroll) */}
      <aside className="hidden lg:flex w-64 h-full flex-col shrink-0 border-r border-brand-200 bg-white z-30 select-none">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-brand-200 px-6 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-amber-400 font-bold text-sm shadow-xs border border-brand-800">
            AP
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-bold tracking-tight text-brand-900 truncate">
              Attendance Portal
            </span>
            <span className="block text-[11px] text-slate-500 font-medium truncate">
              Academic Management
            </span>
          </div>
        </div>

        {/* Navigation Items (Independently scrollable if items exceed viewport) */}
        <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-700 text-white shadow-xs font-semibold border-l-4 border-amber-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-amber-300' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Fixed User Card at bottom of Sidebar */}
        <div className="border-t border-brand-200 p-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 shrink-0">
              {isSuperAdmin ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">
                {user?.name || 'User'}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {isSuperAdmin ? 'Zonal Manager (Admin)' : 'Success Coach'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE SLIDE-IN NAVIGATION DRAWER (Smooth animated backdrop & drawer) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in drawer container */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col bg-white border-r border-brand-200 shadow-2xl animate-slide-up sm:animate-none">
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between border-b border-brand-200 px-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-amber-400 font-bold text-xs">
                  AP
                </div>
                <span className="font-bold text-sm text-slate-900">
                  Attendance Portal
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Navigation List */}
            <nav className="flex-1 overflow-y-auto space-y-1.5 px-3 py-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-700 text-white font-semibold border-l-4 border-amber-400 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer with User Info */}
            <div className="border-t border-brand-200 p-4 shrink-0 bg-slate-50/50">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900">
                    {user?.name || 'User'}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN APPLICATION AREA (Beside the fixed sidebar, independently scrollable) */}
      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-brand-200 bg-white px-4 sm:px-6 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile menu hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden cursor-pointer transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-brand-700 text-white font-bold text-xs">
                AP
              </div>
              <span className="hidden sm:inline font-bold text-sm text-slate-900">
                Attendance Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`hidden sm:inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isSuperAdmin
                  ? 'bg-brand-100 text-brand-800 border border-brand-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isSuperAdmin ? 'Zonal Manager' : 'Success Coach'}
            </span>
            <div className="hidden md:block text-xs text-slate-600 font-medium">
              {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-white p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content Area: Independently scrollable, cleanly constrained */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
