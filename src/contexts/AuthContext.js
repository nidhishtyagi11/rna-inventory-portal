"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, provider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'club' | null
  const [clubData, setClubData] = useState(null); // Populated when a club logs in
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Master admin override check to bypass database empty state
        if (currentUser.email === 'f20240952@pilani.bits-pilani.ac.in' || currentUser.email === 'f20240307@pilani.bits-pilani.ac.in') {
          setRole('admin');
        } else {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.email));
            if (adminDoc.exists()) {
               setRole('admin');
            } else {
               setRole('user');
            }
          } catch (error) {
             console.error("Error checking admin status:", error);
             setRole('user');
          }
        }
      } else {
        // Keep club session alive across firebase re-renders (club login is Firestore-only, not Firebase Auth)
        // We don't clear clubData here — only logout() does
        if (!clubData) {
          setRole(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  // Club/Dept Admin login — looks up credentials directly in Firestore clubs collection
  const loginWithUsernamePassword = async (username, password) => {
    if (!username || !password) throw new Error("Empty credentials");
    try {
      const clubsSnap = await getDocs(collection(db, 'clubs'));
      const match = clubsSnap.docs.find(d => {
        const data = d.data();
        return data.username === username && data.password === password;
      });
      if (!match) {
        throw new Error("Invalid username or password.");
      }
      const club = { id: match.id, ...match.data() };
      setClubData(club);
      setRole('club');
      setUser({ uid: match.id, displayName: club.name, isClub: true });
    } catch (error) {
      console.error("Club login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear club session
      setClubData(null);
      setRole(null);
      setUser(null);
      // Also sign out of Firebase Auth if there is a Google session
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, clubData, loading, loginWithGoogle, loginWithUsernamePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
