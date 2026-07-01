'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊', roles: ['VIEWER', 'OPERATOR', 'MANAGER', 'SUPERADMIN'] },
    { href: '/devices', label: 'Devices', icon: '📡', roles: ['VIEWER', 'OPERATOR', 'MANAGER', 'SUPERADMIN'] },
    { href: '/admin', label: 'Admin Panel', icon: '⚙️', roles: ['MANAGER', 'SUPERADMIN'] },
  ];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">RMS</div>
          <div>
            <div className="sidebar-logo-text">WKM RMS</div>
            <div className="sidebar-logo-sub">Teltonika Manager</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-title">Navigation</div>
          {navItems
            .filter((item) => !user || item.roles.includes(user.role))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
        </div>
      </nav>

      {/* Footer / User */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'Loading...'}</div>
            <div className="sidebar-user-role">{user?.role || '—'}</div>
          </div>
          <button
            className="sidebar-logout"
            onClick={handleLogout}
            title="Logout"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
