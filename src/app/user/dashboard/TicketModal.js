"use client";

import { useState } from 'react';
import Modal from '@/components/Modal';
import { createTicket } from '@/lib/firestore';

const TICKET_TYPES = [
  { id: 'Electricity', label: 'Electricity', icon: 'bolt' },
  { id: 'Tent', label: 'Tent / Polling', icon: 'T', isText: true },
  { id: 'Inventory', label: 'Inventory', icon: 'inventory_2' },
  { id: 'Other', label: 'Other', icon: 'help' },
];

export default function TicketModal({ isOpen, onClose, events, clubData, onTicketCreated }) {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [ticketType, setTicketType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setSelectedEventId('');
    setTicketType('');
    setDescription('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const event = events.find(ev => ev.id === selectedEventId);
    if (!event) { setError('Please select a valid event.'); return; }
    if (!ticketType) { setError('Please select a ticket type.'); return; }
    if (!description.trim()) { setError('Description cannot be empty.'); return; }

    setLoading(true);
    try {
      await createTicket({
        eventId: event.id,
        eventName: event.eventName,
        clubId: clubData?.id || event.clubId,
        clubName: clubData?.name || event.clubName,
        location: event.location || '',
        ticketType,
        description: description.trim(),
      });

      resetForm();
      onTicketCreated();
      onClose();
    } catch (err) {
      console.error("Error creating ticket:", err);
      setError('Failed to raise ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Raise a Support Ticket">
      <form onSubmit={handleSubmit} className="ticket-form">

        {/* Event Selector */}
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
                {ev.eventName}{ev.location ? ` · ${ev.location}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Ticket Type Selector */}
        <div className="form-group">
          <label>Ticket Type</label>
          <div className="type-grid">
            {TICKET_TYPES.map(t => (
              <button
                type="button"
                key={t.id}
                className={`type-card ${ticketType === t.id ? 'selected' : ''}`}
                onClick={() => setTicketType(t.id)}
              >
                {t.isText ? (
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{t.icon}</span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>{t.icon}</span>
                )}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description <span style={{ color: 'var(--error)' }}>*</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={4}
            required
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>Cancel</button>
          <button type="submit" className="btn-primary primary-gradient" disabled={loading}>
            {loading ? 'Submitting...' : 'Raise Ticket'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .ticket-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        label { font-size: 0.75rem; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.08em; font-family: 'Space Grotesk', sans-serif; font-weight: 700; }
        select, textarea { padding: 0.75rem 1rem; background-color: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 0.9rem; font-family: 'Inter', sans-serif; resize: vertical; transition: border-color 0.2s; }
        select:focus, textarea:focus { outline: none; border-color: var(--primary); }

        .type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
        .type-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 0.5rem;
          border-radius: 0.75rem;
          background: var(--surface-container);
          border: 1.5px solid var(--outline-variant);
          color: var(--on-surface-variant);
          font-size: 0.75rem;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .type-card:hover { border-color: var(--on-surface-variant); color: var(--on-surface); }
        .type-card.selected {
          border-color: var(--primary);
          background: rgba(171, 199, 255, 0.1);
          color: var(--primary);
        }

        .form-error { color: var(--error); font-size: 0.8rem; font-family: 'Inter', sans-serif; }
        .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 0.5rem; }
        .btn-secondary { padding: 0.625rem 1.25rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; background: transparent; border: 1px solid var(--outline-variant); color: var(--on-surface); transition: background 0.2s; }
        .btn-secondary:hover { background: var(--surface-container-highest); }
        .btn-primary { padding: 0.625rem 1.5rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; border: none; color: white; }
        .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </Modal>
  );
}
