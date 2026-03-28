"use client";

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { updateStock, addTransaction } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function ShipmentModal({ isOpen, onClose, inventoryItems, onShipmentAdded }) {
  const [items, setItems] = useState([]);
  const [arrivalTime, setArrivalTime] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const vendorName = "Swami Decorators";

  useEffect(() => {
    if (isOpen) {
      setArrivalTime(new Date().toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit'
      }));
      
      if (inventoryItems) {
        const initialItems = inventoryItems.map(inv => {
          const total = inv.totalStock || 0;
          const issued = inv.issuedStock || 0;
          const returned = inv.returnedStock || 0;
          const available = total - issued + returned;
          
          return {
            itemId: inv.id,
            itemName: inv.itemName,
            totalStock: total,
            availableStock: available,
            quantity: ''
          };
        });
        setItems(initialItems);
      }
    }
  }, [isOpen, inventoryItems]);

  const handleItemChange = (itemId, value) => {
    setItems(items.map(item => 
      item.itemId === itemId ? { ...item, quantity: value } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Process all items in the shipment
      for (const item of items) {
        if (!item.quantity) continue;
        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty <= 0) continue;

        // 1. Update stock
        await updateStock(item.itemId, {
          totalStock: item.totalStock + qty
        });

        // 2. Add transaction
        await addTransaction({
          type: 'Incoming',
          itemName: item.itemName,
          itemId: item.itemId,
          quantity: qty,
          userId: user?.uid,
          userName: user?.displayName,
          day: 'Shipment',
          notes: `Vendor: ${vendorName}, Arrival: ${arrivalTime}`
        });
      }

      onShipmentAdded();
      onClose();
    } catch (err) {
      console.error("Error adding shipment:", err);
      alert("Failed to log shipment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log New Shipment" maxWidth="900px">
      <form onSubmit={handleSubmit} className="shipment-form">
        <div className="form-row">
            <div className="form-group flex-1">
               <label>Vendor</label>
               <input 
                 type="text" 
                 value={vendorName} 
                 readOnly
                 className="readonly-input"
               />
            </div>
            <div className="form-group flex-1">
               <label>Arrival Timestamp</label>
               <input 
                 type="text" 
                 value={arrivalTime} 
                 readOnly
                 className="readonly-input"
               />
            </div>
        </div>

        <div className="items-grid-container">
          <div className="items-table">
            <div className="grid-header">
               <span>ITEM</span>
               <span style={{textAlign: 'center'}}>AVAIL. STOCK</span>
               <span style={{textAlign: 'right', paddingRight: '0.2rem'}}>QTY ADDED</span>
            </div>
            <div className="grid-body">
              {items.slice(0, Math.ceil(items.length / 2)).map((item) => (
                <div key={item.itemId} className="grid-row">
                  <span className="item-name">{item.itemName}</span>
                  <span className="item-stock" title="Available Stock">{item.availableStock}</span>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => handleItemChange(item.itemId, e.target.value)} 
                    placeholder="0"
                    min="0"
                    className="qty-input"
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div className="items-table">
            <div className="grid-header">
               <span>ITEM</span>
               <span style={{textAlign: 'center'}}>AVAIL. STOCK</span>
               <span style={{textAlign: 'right', paddingRight: '0.2rem'}}>QTY ADDED</span>
            </div>
            <div className="grid-body">
              {items.slice(Math.ceil(items.length / 2)).map((item) => (
                <div key={item.itemId} className="grid-row">
                  <span className="item-name">{item.itemName}</span>
                  <span className="item-stock" title="Available Stock">{item.availableStock}</span>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => handleItemChange(item.itemId, e.target.value)} 
                    placeholder="0"
                    min="0"
                    className="qty-input"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="form-actions">
           <button type="button" className="btn-secondary fade-btn" onClick={onClose} disabled={loading}>Cancel</button>
           <button type="submit" className="btn-primary primary-gradient" disabled={loading}>
             {loading ? 'Logging...' : 'Log Shipment'}
           </button>
        </div>
      </form>

      <style jsx>{`
        .shipment-form { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; min-width: 700px; max-width: 900px; }
        .form-row { display: flex; gap: 1rem; }
        .flex-1 { flex: 1; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        label { font-size: 0.8125rem; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        input { padding: 0.75rem 1rem; background-color: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 0.875rem; font-family: 'Inter', sans-serif; transition: all 0.2s; }
        input:focus:not(.readonly-input) { outline: none; border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
        .readonly-input { background-color: var(--surface-container); color: var(--outline); cursor: not-allowed; border-color: transparent; }
        
        .items-grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .items-table { background: var(--surface-container-low); border-radius: 0.5rem; border: 1px solid var(--surface-container-highest); display: flex; flex-direction: column; overflow: hidden; }
        .grid-header { display: grid; grid-template-columns: 2fr 1fr 90px; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--surface-container); border-bottom: 1px solid var(--surface-container-highest); font-size: 0.7rem; color: var(--outline); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .grid-body { display: flex; flex-direction: column; max-height: 400px; overflow-y: auto; }
        
        /* Custom scrollbar for grid body */
        .grid-body::-webkit-scrollbar { width: 6px; }
        .grid-body::-webkit-scrollbar-track { background: var(--surface-container-low); }
        .grid-body::-webkit-scrollbar-thumb { background: var(--outline-variant); border-radius: 4px; }
        .grid-body::-webkit-scrollbar-thumb:hover { background: var(--outline); }
        
        .grid-row { display: grid; grid-template-columns: 2fr 1fr 90px; gap: 0.5rem; padding: 0.5rem 1rem; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .grid-row:last-child { border-bottom: none; }
        .item-name { font-size: 0.875rem; font-weight: 500; color: var(--on-surface); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
        .item-stock { font-size: 0.875rem; color: var(--outline); text-align: center; font-family: 'Space Grotesk', sans-serif; }
        .qty-input { padding: 0.5rem 0.75rem; text-align: right; border-color: rgba(255,255,255,0.08); background: var(--surface-container-highest); }
        .qty-input:focus { background: var(--surface); }

        .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
        button { padding: 0.625rem 1.25rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; }
        .fade-btn { background: transparent; border: 1px solid var(--outline-variant); color: var(--on-surface); }
        .fade-btn:hover { background: var(--surface-container-high); border-color: var(--outline); }
        .btn-primary { border: none; }
        .primary-gradient { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #040616; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        
        /* Hide spin buttons for number inputs */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </Modal>
  );
}
