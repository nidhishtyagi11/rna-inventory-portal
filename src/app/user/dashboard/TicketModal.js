"use client";

import { useState } from 'react';
import Modal from '@/components/Modal';
import { createTicket } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function TicketModal({ isOpen, onClose, events, onTicketCreated }) {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const event = events.find(ev => ev.id === selectedEventId);
    if (!event) {
      alert("Please select a valid event.");
      setLoading(false);
      return;
    }

    try {
      await createTicket({
        eventId: event.id,
        eventName: event.eventName,
        clubId: event.clubId,
        clubName: event.clubName,
        location: event.location,
        userId: user?.uid,
        userName: user?.displayName,
        description
      });

      setSelectedEventId('');
      setDescription('');
      onTicketCreated();
      onClose();
    } catch (err) {
      console.error("Error creating ticket:", err);
      alert("Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise Support Ticket">
      <form onSubmit={handleSubmit} className="ticket-form">
        
        <div className="form-group">
           <label>Reference Event</label>
           <select 
             value={selectedEventId} 
             onChange={(e) => setSelectedEventId(e.target.value)}
             required
           >
             <option value="" disabled>-- Select Your Event --</option>
             {events.map(ev => (
               <option key={ev.id} value={ev.id}>
                 {ev.eventName} (Loc: {ev.location})
               </option>
             ))}
           </select>
        </div>

        <div className="form-group">
           <label>Issue Description</label>
           <textarea 
             value={description} 
             onChange={(e) => setDescription(e.target.value)} 
             placeholder="Describe the problem (e.g., missing items, damaged gear...)"
             required
             rows={4}
           />
        </div>

        <div className="form-actions">
           <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
           <button type="submit" className="btn-primary primary-gradient" disabled={loading}>
             {loading ? 'Submitting...' : 'Submit Ticket'}
           </button>
        </div>
      </form>

      <style jsx>{`
        .ticket-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        label { font-size: 0.875rem; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.05em; }
        select, textarea { padding: 0.75rem 1rem; background-color: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 1rem; font-family: 'Inter', sans-serif; resize: vertical;}
        select:focus, textarea:focus { outline: none; border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
        .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
        button { padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
        .btn-secondary { background: transparent; border: 1px solid var(--outline); color: var(--outline); }
        .btn-secondary:hover { background: var(--surface-container-highest); color: var(--on-surface); }
        .btn-primary { border: none; }
        .btn-primary:active { transform: translateY(1px); }
      `}</style>
    </Modal>
  );
}
