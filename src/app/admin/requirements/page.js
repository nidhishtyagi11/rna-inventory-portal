"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { getEvents, updateEvent } from '@/lib/firestore';

export default function RequirementsPage() {
  const [allEventsList, setAllEventsList] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClubName, setSelectedClubName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [newRequirementText, setNewRequirementText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchData() {
    try {
      const allEvents = await getEvents();
      setAllEventsList(allEvents);
      const reqEvents = allEvents.filter(ev => 
        (ev.specialRequirements && ev.specialRequirements.trim() !== '' && ev.specialRequirements.trim().toLowerCase() !== 'no')
      );
      setEvents(reqEvents);
    } catch (err) {
      console.error("Error fetching events", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddRequirement = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    if (!selectedEventId || !newRequirementText.trim()) {
      alert("Please select an event and enter the requirement details.");
      setActionLoading(false);
      return;
    }
    
    try {
      await updateEvent(selectedEventId, { specialRequirements: newRequirementText.trim() });
      setIsModalOpen(false);
      setSelectedClubName('');
      setSelectedEventId('');
      setNewRequirementText('');
      await fetchData();
    } catch (err) {
      console.error("Failed to add special requirement", err);
      alert("Failed to add special requirement");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDone = async (eventId, isDone) => {
    try {
      await updateEvent(eventId, { specialRequirementDone: isDone });
      setEvents(events.map(ev => ev.id === eventId ? { ...ev, specialRequirementDone: isDone } : ev));
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const uniqueClubs = Array.from(new Set(allEventsList.map(ev => ev.clubName))).sort();
  const availableEventsForClub = allEventsList.filter(ev => ev.clubName === selectedClubName).sort((a,b) => a.eventName.localeCompare(b.eventName));

  const columns = [
    { header: 'Club Name', accessorKey: 'clubName' },
    { header: 'Event', accessorKey: 'eventName' },
    { header: 'Location', accessorKey: 'location' },
    { 
      header: 'Special Requirements', 
      cell: (row) => (
        <div className="notes-cell" style={{ textDecoration: row.specialRequirementDone ? 'line-through' : 'none', opacity: row.specialRequirementDone ? 0.6 : 1 }}>
           {row.specialRequirements}
        </div>
      )
    },
    { 
      header: 'Done',
      align: 'center',
      cell: (row) => (
        <input 
          type="checkbox" 
          checked={row.specialRequirementDone || false} 
          onChange={(e) => handleToggleDone(row.id, e.target.checked)} 
          style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)', cursor: 'pointer' }}
        />
      )
    }
  ];

  return (
    <Layout adminOnly={true}>
      <div className="page-header">
        <div>
          <h1 className="headline">Special Requirements</h1>
          <p className="subtitle">Events demanding special attention or unlisted setup materials</p>
        </div>
        <button className="primary-gradient action-btn" onClick={() => setIsModalOpen(true)}>
          <span className="material-symbols-outlined">add</span>
          New Requirement
        </button>
      </div>

      {loading ? (
        <p>Scanning intelligence...</p>
      ) : events.length === 0 ? (
        <div className="empty-state glass-panel">
          <span className="material-symbols-outlined icon">check_circle</span>
          <p>No special requirements documented for upcoming events.</p>
        </div>
      ) : (
         <DataTable columns={columns} data={events} />
      )}

      {/* --- Log Requirement Modal --- */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedClubName(''); setSelectedEventId(''); setNewRequirementText(''); }} title="Log Special Requirement">
        <form onSubmit={handleAddRequirement} className="req-form">
          <div className="form-group">
            <label>Select Club</label>
            <select value={selectedClubName} onChange={(e) => { setSelectedClubName(e.target.value); setSelectedEventId(''); }} required>
              <option value="" disabled>-- Select a Club --</option>
              {uniqueClubs.map(club => (
                <option key={club} value={club}>{club}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Select Event</label>
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} required disabled={!selectedClubName}>
              <option value="" disabled>-- Select an Event --</option>
              {availableEventsForClub.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.eventName}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Requirement Details</label>
            <textarea 
               value={newRequirementText} 
               onChange={(e) => setNewRequirementText(e.target.value)} 
               placeholder="Enter the specific materials or logistical requirements needed..." 
               required
               rows={4}
            />
          </div>
          
          <div className="form-actions">
             <button type="button" className="btn-secondary fade-btn" onClick={() => setIsModalOpen(false)} disabled={actionLoading}>Cancel</button>
             <button type="submit" className="btn-primary primary-gradient" disabled={actionLoading || !selectedEventId || !newRequirementText.trim()}>
               {actionLoading ? 'Saving...' : 'Confirm Requirement'}
             </button>
          </div>
        </form>
      </Modal>

      <style jsx>{`
        .page-header {
          margin-bottom: 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .subtitle {
          color: var(--on-surface-variant);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
        }
        .primary-gradient {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
        }

        .notes-cell {
          max-width: 400px;
          white-space: normal;
          color: var(--on-surface);
          font-size: 0.875rem;
          line-height: 1.4;
        }
        .empty-state {
           padding: 4rem;
           text-align: center;
           border-radius: 1rem;
           background-color: var(--surface-container-low);
           border: 1px solid var(--outline-variant);
        }
        .empty-state .icon {
           font-size: 3rem;
           color: var(--success, #a8d5ba);
           margin-bottom: 1rem;
           opacity: 0.7;
        }
        .empty-state p {
           color: var(--on-surface-variant);
        }

        /* Modal Form Styles */
        .req-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-size: 0.875rem; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.05em; }
        .form-group select, .form-group textarea { padding: 0.75rem 1rem; background-color: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 1rem; font-family: 'Inter', sans-serif; resize: vertical; }
        .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
        .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
        .btn-secondary { padding: 0.625rem 1.25rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; background: transparent; border: 1px solid var(--outline-variant); color: var(--on-surface); }
        .btn-primary { padding: 0.625rem 1.25rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; border: none; color: white; }
      `}</style>
    </Layout>
  );
}
