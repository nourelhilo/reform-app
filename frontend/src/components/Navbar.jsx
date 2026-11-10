import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BarChart3, History, LayoutDashboard, LogOut, Play, User } from 'lucide-react';

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
          <img src="/reform-secondary.svg" alt="" width="68" height="52" />
          Reform
        </Link>
        {navigation()}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link className="studio-button subtle compact" aria-label="Profile" to="/profile"><User size={17} /></Link>
            <button className="studio-button subtle compact" onClick={logout} aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        )}
      </div>
    </header>
    {navigation(true)}
  </>;
}
