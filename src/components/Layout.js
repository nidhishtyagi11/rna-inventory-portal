"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';

export default function Layout({ children, adminOnly = false }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <div className="app-layout">
        <button 
          className="mobile-header-btn" 
          onClick={() => setIsMobileOpen(true)}
          style={{display: isMobileOpen ? 'none' : ''}}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <Sidebar isMobileOpen={isMobileOpen} onClose={() => setIsMobileOpen(false)} />
        
        {isMobileOpen && (
          <div className="mobile-overlay" onClick={() => setIsMobileOpen(false)}></div>
        )}

        <main className="main-content">
          {children}
        </main>
      </div>

      <style jsx>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
          position: relative;
        }
        .main-content {
          flex: 1;
          margin-left: 260px; /* Width of sidebar */
          padding: 2rem 3rem;
          background-color: var(--background);
          min-height: 100vh;
        }
        .mobile-header-btn {
          display: none;
        }
        .mobile-overlay {
          display: none;
        }
        
        @media (max-width: 1024px) {
          .main-content {
            margin-left: 0;
            padding: 4.5rem 1.5rem 2rem 1.5rem;
          }
          .mobile-header-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 90;
            background: var(--surface-container-high);
            border: 1px solid var(--outline-variant);
            color: var(--on-surface);
            padding: 0.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: background 0.2s;
          }
          .mobile-header-btn:active {
            background: var(--surface-container-highest);
          }
          .mobile-overlay {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 95;
            backdrop-filter: blur(3px);
            animation: fadeIn 0.2s ease-out;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </ProtectedRoute>
  );
}
