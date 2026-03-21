"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, role, loginWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && role) {
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/user/dashboard');
      }
    }
  }, [user, role, router]);

  if (loading) return null;

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <span className="material-symbols-outlined hero-brand-icon">camping</span>
        <h1 className="headline">RecNAcc</h1>
        <p className="subtitle">Operations & Inventory Management System</p>
        
        <div className="action-area">
          <p className="instruction">Authenticate to enter command centre</p>
          <button className="primary-gradient login-btn" onClick={loginWithGoogle}>
            <span className="material-symbols-outlined">login</span>
            Sign in with Google
          </button>
        </div>

        <div className="footer-links">
          <span>APOGEE 2026</span>
          <span>&copy; NIDHISH</span>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #040616;
          background-image: radial-gradient(circle at 50% 50%, #121620 0%, #040616 100%);
        }
        .login-card {
          width: 100%;
          max-width: 480px;
          padding: 3rem 2.5rem;
          border-radius: 1rem;
          text-align: center;
          border: 1px solid var(--outline-variant);
        }
        .hero-brand-icon {
          font-size: 5rem;
          color: var(--primary);
          margin-bottom: 0.5rem;
          display: block;
        }
        .headline {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
        }
        .subtitle {
          color: var(--on-surface-variant);
          margin-bottom: 3rem;
          font-family: 'Space Grotesk', sans-serif;
        }
        .action-area {
          background-color: var(--surface-container-low);
          padding: 2rem;
          border-radius: 0.75rem;
          margin-bottom: 2rem;
        }
        .instruction {
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          color: var(--on-surface-variant);
        }
        .login-btn {
          width: 100%;
          padding: 1rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: transform 0.2s, opacity 0.2s;
        }
        .login-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .footer-links {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--outline);
          font-family: 'Space Grotesk', sans-serif;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
