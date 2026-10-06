import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Play, History, LineChart, User as UserIcon, LogOut } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Workout', path: '/workout/setup', icon: Play },
    { label: 'History', path: '/history', icon: History },
    { label: 'Progress', path: '/progress', icon: LineChart },
  ];

  return (
    <header className="h-16 border-b border-white/[0.08] bg-[#0B0A0D]/95 backdrop-blur-xl sticky top-0 z-50 px-6 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-10">
        {/* Bold, prominent Reform Title */}
        <Link to="/" className="flex items-center group">
          <span className="text-2xl font-bold tracking-tight text-white hover:text-white/90 transition-colors">
            Reform
          </span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-white bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">{user.email?.split('@')[0]}</span>
            </Link>
            <button
              onClick={logout}
              className="p-2 text-text-muted hover:text-rose-400 rounded-lg hover:bg-white/[0.04] transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="text-xs font-medium text-text-muted hover:text-white px-3 py-2 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-medium bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-all shadow-sm font-semibold"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
