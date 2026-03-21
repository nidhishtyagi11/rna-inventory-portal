"use client";

import { useState } from 'react';
import Modal from '@/components/Modal';
import { updateStock, addTransaction } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function AddStockModal({ isOpen, onClose, item, onStockAdded }) {
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  if (!item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity");
      setLoading(false);
      return;
    }

    try {
      // 1. Update stock in inventoryStock collection
      await updateStock(item.id, {
        totalStock: (item.totalStock || 0) + qty
      });

      // 2. Add transaction
      await addTransaction({
        type: 'Incoming',
        itemName: item.itemName,
        itemId: item.id,
        quantity: qty,
        userId: user?.uid,
        userName: user?.displayName,
        day: 'Pre-Event'
      });

      setQuantity('');
      onStockAdded();
      onClose();
    } catch (err) {
      console.error("Error adding stock:", err);
      alert("Failed to add stock.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Stock: ${item.itemName}`}>
      <form onSubmit={handleSubmit} className="stock-form">
        <div className="form-group">
           <label>Current Stock</label>
           <div className="read-only-val">{item.totalStock || 0} units</div>
        </div>

        <div className="form-group">
           <label>Add Quantity</label>
           <input 
             type="number" 
             value={quantity} 
             onChange={(e) => setQuantity(e.target.value)} 
             placeholder="e.g. 50"
             required
             min="1"
           />
        </div>

        <div className="form-actions">
           <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
           <button type="submit" className="btn-primary primary-gradient" disabled={loading}>
             {loading ? 'Adding...' : 'Add Stock'}
           </button>
        </div>
      </form>

      <style jsx>{`
        .stock-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        label {
          font-size: 0.875rem;
          color: var(--on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .read-only-val {
          padding: 0.75rem 1rem;
          background-color: var(--surface-container-low);
          border-radius: 0.5rem;
          color: var(--outline);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.1rem;
        }
        input {
          padding: 0.75rem 1rem;
          background-color: var(--surface-container-highest);
          border: 1px solid var(--outline-variant);
          border-radius: 0.5rem;
          color: var(--on-surface);
          font-size: 1rem;
          font-family: 'Inter', sans-serif;
        }
        input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: inset 0 0 0 1px var(--primary);
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }
        button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary {
          background: transparent;
          border: 1px solid var(--outline);
          color: var(--outline);
        }
        .btn-secondary:hover {
          background: var(--surface-container-highest);
          color: var(--on-surface);
        }
        .btn-primary {
          border: none;
        }
        .btn-primary:active {
          transform: translateY(1px);
        }
      `}</style>
    </Modal>
  );
}
