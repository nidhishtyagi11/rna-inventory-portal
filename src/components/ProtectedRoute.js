"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, role, loading, clubData } = useAuth();
  const router = useRouter();

  // Determine if someone is effectively logged in
  const isLoggedIn = !!user || !!clubData;
  const effectiveRole = role || (clubData ? 'club' : null);

  useEffect(() => {
    if (!loading) {
      if (!isLoggedIn) {
        router.push('/login');
      } else if (adminOnly && effectiveRole !== 'admin') {
        // Club users trying to access admin — redirect to their dashboard
        router.push('/user/dashboard');
      } else if (!adminOnly && effectiveRole === 'admin') {
        // Admin trying to access user routes — redirect to admin dashboard
        router.push('/admin/dashboard');
      }
    }
  }, [isLoggedIn, effectiveRole, loading, adminOnly, router]);

  if (loading || !isLoggedIn || (adminOnly && effectiveRole !== 'admin')) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return children;
}

