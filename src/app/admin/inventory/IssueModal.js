"use client";

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { updateStock, addTransaction, getClubs } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function IssueModal({ isOpen, onClose, item, onStockIssued }) {
  const [quantity, setQuantity] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      getClubs().then(data => setClubs(data));
    }
  }, [isOpen]);

  if (!item) return null;

  const available = (item.totalStock || 0) - (item.issuedStock || 0) + (item.returnedStock || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity");
      setLoading(false);
      return;
    }

    if (qty > available) {
      alert(`Cannot issue ${qty}. Only ${available} available.`);
      setLoading(false);
      return;
    }

    const club = clubs.find(c => c.id === selectedClubId);
    if (!club) {
      alert("Please select a valid club.");
      setLoading(false);
      return;
    }

    try {
      // 1. Update issued stock total
      await updateStock(item.id, {
        issuedStock: (item.issuedStock || 0) + qty
      });

      // 2. Add transaction linked to club
      await addTransaction({
        type: 'Issuance',
        itemName: item.itemName,
        itemId: item.id,
        quantity: qty,
        clubId: club.id,
        clubName: club.name,
        userId: user?.uid,
        userName: user?.displayName,
        day: 'Day 1' // Simplified. In a real app, calculate current fest day
      });

      setQuantity('');
      setSelectedClubId('');
      onStockIssued();
      onClose();
    } catch (err) {
      console.error("Error issuing stock:", err);
      alert("Failed to issue stock.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Issue Stock: ${item.itemName}`}>
      <form onSubmit={handleSubmit} className="stock-form">
        <div className="form-group">
           <label>Available Stock</label>
           <div className={`read-only-val ${available === 0 ? 'error' : ''}`}>
             {available} units
           </div>
        </div>

        <div className="form-group">
           <label>Select Club</label>
           <select 
             value={selectedClubId} 
             onChange={(e) => setSelectedClubId(e.target.value)}
             required
           >
             <option value="" disabled>-- Choose a Club --</option>
             {clubs.map(c => (
               <option key={c.id} value={c.id}>
                 {c.name}
               </option>
             ))}
           </select>
        </div>

        <div className="form-group">
           <label>Issue Quantity</label>
           <input 
             type="number" 
             value={quantity} 
             onChange={(e) => setQuantity(e.target.value)} 
             placeholder="e.g. 10"
             required
             min="1"
             max={available}
             disabled={available === 0}
           />
        </div>

        <div className="form-actions">
           <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
           <button type="submit" className="btn-primary primary-gradient" disabled={loading || available === 0}>
             {loading ? 'Issuing...' : 'Issue to Club'}
           </button>
        </div>
      </form>

      <style jsx>{`
        .stock-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        label { font-size: 0.875rem; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.05em; }
        .read-only-val { padding: 0.75rem 1rem; background-color: var(--surface-container-low); border-radius: 0.5rem; color: var(--outline); font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; }
        .read-only-val.error { color: var(--error); background-color: var(--error-container); }
        input, select { padding: 0.75rem 1rem; background-color: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 1rem; font-family: 'Inter', sans-serif; }
        input:focus, select:focus { outline: none; border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
        .help-text { font-size: 0.75rem; color: var(--outline); margin-top: -0.25rem; }
        .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
        button { padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
        .btn-secondary { background: transparent; border: 1px solid var(--outline); color: var(--outline); }
        .btn-secondary:hover { background: var(--surface-container-highest); color: var(--on-surface); }
        .btn-primary { border: none; }
        .btn-primary:active { transform: translateY(1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </Modal>
  );
}
