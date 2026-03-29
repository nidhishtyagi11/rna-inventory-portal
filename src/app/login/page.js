"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { user, role, loginWithGoogle, loginWithUsernamePassword, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  const handleClubLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      await loginWithUsernamePassword(username, password);
    } catch (err) {
      setAuthError('Invalid credentials or unauthorized access.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-container">
      <div className="brand-header">
        <img src="/tent.png" alt="RecNAcc Tent Icon" className="hero-brand-img" />
        <h1 className="headline">RecNAcc</h1>
        <p className="subtitle">Operations & Inventory Management System</p>
      </div>
      
      <div className="login-card glass-panel">
        <div className="auth-sections">
          {/* RecNAcc Admin Section */}
          <div className="action-area">
            <h2 className="section-title">RecNAcc Admin</h2>
            <button className="primary-gradient login-btn" onClick={loginWithGoogle}>
              <span className="material-symbols-outlined">login</span>
              Sign in with Google
            </button>
          </div>

          {/* Divider */}
          <div className="divider">
            <span>OR</span>
          </div>

          {/* Club/Dept Admin Section */}
          <div className="action-area club-area">
            <h2 className="section-title">Club/Dept Admin</h2>
            <form onSubmit={handleClubLogin} className="club-form">
              <input 
                type="text" 
                placeholder="Department Username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
              />
              <input 
                type="password" 
                placeholder="Passcode" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              {authError && <p className="error-text">{authError}</p>}
              <button type="submit" className="secondary-gradient login-btn auth-btn" disabled={isLoggingIn}>
                <span className="material-symbols-outlined">login</span>
                {isLoggingIn ? 'Decrypting...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        <div className="footer-links">
          <span className="live-status">
            APOGEE 2026
            <span className="live-dot pulse"></span>
          </span>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #040616;
          background-image: radial-gradient(circle at 50% 50%, #121620 0%, #040616 100%);
          padding: 2rem;
        }
        .brand-header {
          text-align: center;
          margin-bottom: 1rem;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 1.75rem 1.5rem;
          border-radius: 1.25rem;
          text-align: center;
          border: 1px solid var(--outline-variant);
          background: rgba(18, 22, 32, 0.6);
          backdrop-filter: blur(12px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .hero-brand-img {
          width: 8rem;
          height: auto;
          margin-bottom: 0.5rem;
          display: block;
          margin-left: auto;
          margin-right: auto;
          filter: drop-shadow(0 0 15px rgba(255,255,255,0.1));
        }
        .headline {
          font-size: 3.5rem;
          margin-bottom: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .subtitle {
          color: var(--on-surface-variant);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          letter-spacing: 0.05em;
          margin-bottom: 0;
        }
        
        .auth-sections {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        
        .action-area {
          background-color: var(--surface-container-low);
          padding: 1.25rem;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.03);
          text-align: left;
        }
        .club-area {
          background-color: rgba(67, 143, 255, 0.03);
          border-color: rgba(67, 143, 255, 0.1);
        }
        
        .section-title {
          font-size: 1.125rem;
          color: var(--on-surface);
          margin-bottom: 0.25rem;
          font-family: 'Space Grotesk', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .instruction {
          margin-bottom: 1.5rem;
          font-size: 0.8125rem;
          color: var(--on-surface-variant);
          line-height: 1.5;
        }
        
        .club-form {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .club-form input {
          width: 100%;
          padding: 0.75rem 0.875rem;
          background: var(--surface-container-highest);
          border: 1px solid var(--outline-variant);
          border-radius: 0.5rem;
          color: var(--on-surface);
          font-size: 0.8125rem;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .club-form input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 1px var(--primary);
        }
        .error-text {
          color: var(--error);
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
        
        .login-btn {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: transform 0.2s, opacity 0.2s, box-shadow 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .primary-gradient {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: #040616;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .auth-btn {
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .secondary-gradient {
          background: var(--surface-container-high);
          color: var(--on-surface);
          border: 1px solid var(--outline-variant);
        }
        .login-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .login-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .divider {
          position: relative;
          text-align: center;
          margin: 0.5rem 0;
        }
        .divider::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 100%;
          height: 1px;
          background: var(--surface-container-high);
          z-index: 1;
        }
        .divider span {
          position: relative;
          background: var(--surface-container);
          padding: 0 1rem;
          color: var(--outline);
          font-size: 0.75rem;
          font-weight: 600;
          z-index: 2;
          font-family: 'Space Grotesk', sans-serif;
          border-radius: 1rem;
        }
        
        .footer-links {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--outline);
          font-family: 'Space Grotesk', sans-serif;
          text-transform: uppercase;
        }
        .live-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .live-dot {
          width: 6px;
          height: 6px;
          background-color: var(--error, #f28b82);
          border-radius: 50%;
          display: inline-block;
        }
        .pulse {
          animation: pulse-animation 2s infinite;
        }
        @keyframes pulse-animation {
          0% { box-shadow: 0 0 0 0 rgba(242, 139, 130, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(242, 139, 130, 0); }
          100% { box-shadow: 0 0 0 0 rgba(242, 139, 130, 0); }
        }
      `}</style>
    </div>
  );
}
