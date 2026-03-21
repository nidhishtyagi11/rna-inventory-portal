"use client";

import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';

export default function Layout({ children, adminOnly = false }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>

      <style jsx>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
        }
        .main-content {
          flex: 1;
          margin-left: 260px; /* Width of sidebar */
          padding: 2rem 3rem;
          background-color: var(--background);
          min-height: 100vh;
        }
      `}</style>
    </ProtectedRoute>
  );
}
