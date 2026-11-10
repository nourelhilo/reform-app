import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ArrowUpRight, BarChart3, History, LayoutDashboard, LogOut, Play, User } from 'lucide-react';

const tabs = [
  ['Dashboard', '/dashboard', LayoutDashboard], ['Workout', '/workout/setup', Play],
  ['History', '/history', History], ['Progress', '/progress', BarChart3],
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigation = (mobile = false) => (
    <nav className={mobile ? 'site-tabs site-tabs--mobile' : 'site-tabs'} aria-label="Main navigation">
      {tabs.map(([label, path, Icon]) => (
        <NavLink key={path} to={path} className={({ isActive }) =>
          (isActive || (label === 'Workout' && pathname.startsWith('/workout/'))) ? 'active' : ''}>
          <Icon size={16} aria-hidden="true" />{label}
        </NavLink>
      ))}
    </nav>
  );
  return <>
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand" aria-label="Reform home">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 23 14 8h5l-7 15H7Zm9 0 7-15h4l-7 15h-4Z" fill="currentColor"/></svg>
          Reform
        </Link>
        {user && navigation()}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? <>
            <Link className="studio-button subtle compact" aria-label="Profile" to="/profile"><User size={17} /></Link>
            <button className="studio-button subtle compact" onClick={logout} aria-label="Sign out"><LogOut size={17} /></button>
          </> : <>
            <Link className="site-sign-in" to="/login">Sign In</Link>
            <Link className="studio-button compact" to="/register">Get Started <ArrowUpRight size={15} /></Link>
          </>}
        </div>
      </div>
    </header>
    {user && navigation(true)}
  </>;
}
