"use client";

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const { role, logout, user } = useAuth();
  const pathname = usePathname();

  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'grid_view' },
    { name: 'Inventory', path: '/admin/inventory', icon: 'inventory_2' },
    { name: 'Transactions', path: '/admin/transactions', icon: 'sync_alt' },
    { name: 'Requirements', path: '/admin/requirements', icon: 'star' },
    { name: 'Tickets', path: '/admin/tickets', icon: 'confirmation_number' },
  ];

  const userLinks = [
    { name: 'Dashboard', path: '/user/dashboard', icon: 'dashboard' },
    { name: 'Inventory', path: '/user/inventory', icon: 'inventory_2' },
    { name: 'My Requests', path: '/user/requests', icon: 'assignment_turned_in' },
    { name: 'Support', path: '/user/support', icon: 'support_agent' },
  ];

  const links = role === 'admin' ? adminLinks : userLinks;

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand-row">
          <span className="brand-icon material-symbols-outlined">camping</span>
          <span className="brand">RECNACC</span>
        </div>
        <span className="brand-sub">INVENTORY MANAGEMENT SYSTEM</span>
      </div>

      {/* Nav */}
      <nav className="nav-menu">
        <span className="section-label">Navigation</span>
        {links.map((link) => {
          const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
          return (
            <Link key={link.name} href={link.path} className={`nav-item ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-outlined icon">{link.icon}</span>
              <span className="nav-label">{link.name}</span>
              {isActive && <span className="active-pip" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {role === 'admin' && (
          <Link href="/admin/upload" className={`nav-item ${pathname === '/admin/upload' ? 'active' : ''}`}>
            <span className="material-symbols-outlined icon">upload_file</span>
            <span className="nav-label">CSV Upload</span>
            {pathname === '/admin/upload' && <span className="active-pip" />}
          </Link>
        )}
        <button onClick={logout} className="nav-item logout-btn">
          <span className="material-symbols-outlined icon">logout</span>
          <span className="nav-label">Sign Out</span>
        </button>

        <div className="user-card">
          <div className="user-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="avatar" className="avatar-img" />
            ) : (
              <span className="material-symbols-outlined avatar-placeholder">account_circle</span>
            )}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.displayName || 'User'}</span>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>

        <div className="role-row" style={{ justifyContent: 'center', marginTop: '1rem', marginBottom: 0 }}>
          <span className="level-badge" style={{ fontSize: '0.55rem' }}>Made with &lt;3 by Nidhish</span>
        </div>
      </div>

      <style jsx global>{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background-color: var(--surface-container-lowest);
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          padding: 1.25rem 0.75rem;
          position: fixed;
          left: 0;
          top: 0;
          overflow-y: auto;
          z-index: 100;
        }

        /* --- Header --- */
        .sidebar-header {
          padding: 0.5rem 0.75rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 1rem;
        }
        .brand-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .brand-icon {
          font-size: 1.25rem;
          color: var(--primary);
        }
        .brand {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--on-surface);
        }
        .brand-sub {
          font-size: 0.65rem;
          color: var(--outline);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: block;
          margin-top: 0.25rem;
        }

        /* --- Nav --- */
        .nav-menu {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .section-label {
          display: block;
          font-size: 0.6rem;
          color: var(--outline);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          padding: 0 0.75rem;
          margin-bottom: 0.5rem;
          margin-top: 0.5rem;
        }
        .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0.75rem;
          border-radius: 0.5rem;
          color: var(--on-surface-variant);
          text-decoration: none;
          font-size: 0.8125rem;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
          background: transparent;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          font-family: 'Inter', sans-serif;
        }
        .nav-item:hover {
          color: var(--on-surface);
          background-color: rgba(255,255,255,0.05);
        }
        .nav-item.active {
          color: var(--primary);
          background-color: rgba(171, 199, 255, 0.08);
        }
        .icon {
          font-size: 1.125rem;
          flex-shrink: 0;
        }
        .nav-label {
          flex: 1;
        }
        .active-pip {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: var(--primary);
          flex-shrink: 0;
        }

        /* --- Footer --- */
        .sidebar-footer {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .role-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.75rem;
          margin-bottom: 0.5rem;
        }
        .role-name {
          font-size: 0.6rem;
          color: var(--outline);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .level-badge {
          font-size: 0.6rem;
          background: rgba(171, 199, 255, 0.1);
          color: var(--primary);
          padding: 0.1rem 0.4rem;
          border-radius: 0.25rem;
          border: 1px solid rgba(171, 199, 255, 0.2);
          letter-spacing: 0.05em;
        }
        .logout-btn {
          color: var(--error, #f28b82);
        }
        .logout-btn:hover {
          background-color: rgba(242, 139, 130, 0.1);
          color: #f28b82;
        }

        /* --- User card --- */
        .user-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          margin-top: 0.75rem;
          background: rgba(255,255,255,0.04);
          border-radius: 0.5rem;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .user-avatar {
          flex-shrink: 0;
        }
        .avatar-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }
        .avatar-placeholder {
          font-size: 2rem;
          color: var(--outline);
        }
        .user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .user-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--on-surface);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-email {
          font-size: 0.625rem;
          color: var(--on-surface-variant);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.1rem;
        }
      `}</style>
    </aside>
  );
}
