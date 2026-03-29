"use client";

import { useState } from 'react';
import Modal from '@/components/Modal';
import { addAdmin } from '@/lib/firestore';

export default function AddAdminModal({ isOpen, onClose, onAdminAdded }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email address.");
      return;
    }
    
    setLoading(true);
    try {
      await addAdmin(email.toLowerCase().trim(), {
        role: 'admin',
        isOnline: false,
        addedAt: new Date().toISOString()
      });
      setEmail('');
      onAdminAdded();
      onClose();
    } catch (err) {
      console.error("Error adding admin:", err);
      alert("Failed to add admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Admin">
      <form onSubmit={handleSubmit} className="admin-form">
        <p className="help-text">Enter the email address of the new admin. They will be able to log in using Google Sign-In.</p>
        
        <div className="form-group">
           <label>Email Address</label>
           <input 
             type="email" 
             value={email} 
             onChange={(e) => setEmail(e.target.value)} 
             placeholder="e.g. f20240000@pilani.bits-pilani.ac.in"
             required
           />
        </div>

        <div className="form-actions">
           <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
           <button type="submit" className="btn-primary primary-gradient" disabled={loading}>
             {loading ? 'Adding...' : 'Add Admin'}
           </button>
        </div>
      </form>

      <style jsx>{`
        .admin-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .help-text { color: var(--on-surface-variant); font-size: 0.875rem; line-height: 1.5; margin: 0; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        label { font-size: 0.875rem; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        input { padding: 0.75rem 1rem; background-color: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 1rem; font-family: 'Inter', sans-serif; }
        input:focus { outline: none; border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
        .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
        button { padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
        .btn-secondary { background: transparent; border: 1px solid var(--outline); color: var(--outline); }
        .btn-secondary:hover { background: var(--surface-container-highest); color: var(--on-surface); }
        .btn-primary { border: none; }
        .primary-gradient { background: #abc7fb; color: #040616 !important; }
        .btn-primary:active { transform: translateY(1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </Modal>
  );
}
