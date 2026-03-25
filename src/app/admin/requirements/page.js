"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { getClubs, updateClub } from '@/lib/firestore';

export default function RequirementsPage() {
  const [allClubs, setAllClubs] = useState([]);
  const [clubs, setClubs] = useState([]); // clubs with special requirements
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [newRequirementText, setNewRequirementText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchData() {
    try {
      const allClubData = await getClubs();
      setAllClubs(allClubData);
      // Only show clubs that have a meaningful special requirement
      const withReq = allClubData.filter(c =>
        c.specialRequirements && c.specialRequirements.trim() !== '' && c.specialRequirements.trim().toLowerCase() !== 'no'
      );
      setClubs(withReq);
    } catch (err) {
      console.error('Error fetching clubs', err);
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
    if (!selectedClubId || !newRequirementText.trim()) {
      alert('Please select a club and enter the requirement details.');
      setActionLoading(false);
      return;
    }
    try {
      await updateClub(selectedClubId, { specialRequirements: newRequirementText.trim() });
      setIsModalOpen(false);
      setSelectedClubId('');
      setNewRequirementText('');
      await fetchData();
    } catch (err) {
      console.error('Failed to add special requirement', err);
      alert('Failed to add special requirement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDone = async (clubId, isDone) => {
    try {
      await updateClub(clubId, { specialRequirementDone: isDone });
      setClubs(clubs.map(c => c.id === clubId ? { ...c, specialRequirementDone: isDone } : c));
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const columns = [
    { header: 'Club Name', cell: (row) => row.name || row.clubName || '—' },
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
        <button
          onClick={() => handleToggleDone(row.id, !row.specialRequirementDone)}
          className={`custom-checkbox ${row.specialRequirementDone ? 'checked' : ''}`}
          title={row.specialRequirementDone ? "Mark as Pending" : "Mark as Done"}
        >
          <span className="material-symbols-outlined">
            {row.specialRequirementDone ? 'check_circle' : 'radio_button_unchecked'}
          </span>
        </button>
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
        <p>Loading requirements...</p>
      ) : clubs.length === 0 ? (
        <div className="empty-state glass-panel">
          <span className="material-symbols-outlined icon">check_circle</span>
          <p>No special requirements documented.</p>
        </div>
      ) : (
         <DataTable columns={columns} data={clubs} />
      )}

      {/* --- Log Requirement Modal --- */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedClubId(''); setNewRequirementText(''); }} title="Log Special Requirement">
        <form onSubmit={handleAddRequirement} className="req-form">
          <div className="form-group">
            <label>Select Club</label>
            <select value={selectedClubId} onChange={(e) => setSelectedClubId(e.target.value)} required>
              <option value="" disabled>-- Select a Club --</option>
              {allClubs.map(club => (
                <option key={club.id} value={club.id}>{club.name}</option>
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
             <button type="submit" className="btn-primary primary-gradient" disabled={actionLoading || !selectedClubId || !newRequirementText.trim()}>
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
        
        /* Custom Checkbox */
        .custom-checkbox {
          background: transparent;
          border: none;
          color: var(--outline);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        .custom-checkbox:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--on-surface);
        }
        .custom-checkbox.checked {
          color: var(--success, #64dc8c);
        }
        .custom-checkbox.checked:hover {
          background: rgba(100, 220, 140, 0.1);
          color: #8be4a8;
        }
        .custom-checkbox .material-symbols-outlined {
          font-size: 1.5rem;
        }
      `}</style>
    </Layout>
  );
}
