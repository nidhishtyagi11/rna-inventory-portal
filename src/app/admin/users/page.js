"use client";

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getAdmins, removeAdmin } from '@/lib/firestore';
import AddAdminModal from './AddAdminModal';
import UploadCSVModal from './UploadCSVModal';

export default function UserManagementPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdmins();
      
      // Ensure master admins from AuthContext always appear on screen even if they have no document
      const masterAdmins = [
        { email: 'f20240952@pilani.bits-pilani.ac.in', isOnline: false, role: 'admin', isMaster: true },
        { email: 'f20240307@pilani.bits-pilani.ac.in', isOnline: false, role: 'admin', isMaster: true }
      ];
      
      masterAdmins.forEach(ma => {
        if (!data.find(d => d.email.toLowerCase() === ma.email.toLowerCase())) {
          data.push(ma);
        }
      });

      setAdmins(data);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRemove = async (email, isMaster) => {
    if (isMaster) {
      alert("Cannot remove a master admin through this portal.");
      return;
    }
    if (confirm(`Are you sure you want to remove ${email} from admins?`)) {
      try {
        await removeAdmin(email);
        fetchUsers();
      } catch (err) {
        console.error("Failed to remove admin", err);
      }
    }
  };

  // Grouping logic based on BITS email prefix (first 4 digits)
  const columns = { '2025': [], '2024': [], '2023': [], '2022': [], 'Other': [] };
  
  admins.forEach(admin => {
    const email = admin.email || '';
    const match = email.match(/^[a-zA-Z]?(\d{4})/);
    let year = match ? match[1] : 'Other';
    if (!columns[year]) year = 'Other';
    columns[year].push(admin);
  });

  return (
    <Layout adminOnly={true}>
      <div className="page-header">
        <div>
          <h1 className="headline">User Management</h1>
          <p className="subtitle" style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
            <span className="live-dot pulse"></span>
            Showing {admins.length} Total Verified Admins
          </p>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <button className="secondary-btn upload-btn" onClick={() => setIsUploadModalOpen(true)}>
            <span className="material-symbols-outlined">upload_file</span>
            Upload CSV
          </button>
          <button className="primary-gradient action-btn" onClick={() => setIsAddModalOpen(true)}>
            <span className="material-symbols-outlined">person_add</span>
            Add Admin
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="kanban-board">
          {['2025', '2024', '2023', '2022', 'Other'].map(year => (
            <div key={year} className="kanban-column">
              <div className="column-header">
                <h2>{year}</h2>
                <span className="count-badge">{columns[year].length}</span>
              </div>
              <div className="column-body">
                {columns[year].length === 0 ? (
                  <p className="empty-state">No users</p>
                ) : (
                  columns[year].map(admin => (
                    <div key={admin.email} className="user-card">
                       <div className="card-header">
                         <div className="avatar">
                           <span className="material-symbols-outlined">account_circle</span>
                         </div>
                         <div className="user-info">
                           <span className="user-email" title={admin.email}>{admin.email}</span>
                         </div>
                         <button className="remove-btn" onClick={() => handleRemove(admin.email, admin.isMaster)} title="Remove Admin">
                           <span className="material-symbols-outlined">close</span>
                         </button>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AddAdminModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdminAdded={fetchUsers} 
      />
      
      <UploadCSVModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onUploadComplete={fetchUsers} 
      />

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .subtitle {
          color: var(--on-surface-variant);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .live-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background-color: var(--success, #64dc8c);
          border-radius: 50%;
        }
        .pulse {
          animation: pulse-animation 2s infinite;
        }
        @keyframes pulse-animation {
          0% { box-shadow: 0 0 0 0 rgba(100, 220, 140, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(100, 220, 140, 0); }
          100% { box-shadow: 0 0 0 0 rgba(100, 220, 140, 0); }
        }
        
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: 2rem;
          border: none;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .action-btn:hover { transform: translateY(-1px); }
        
        .upload-btn {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 1.25rem; border-radius: 2rem;
          background: transparent; border: 1px solid var(--outline); color: var(--on-surface);
          font-family: 'Inter', sans-serif; font-weight: 600; cursor: pointer;
          transition: background 0.2s;
        }
        .upload-btn:hover { background: rgba(255,255,255,0.05); }

        /* --- Kanban Board --- */
        .kanban-board {
          display: flex;
          gap: 1.5rem;
          overflow-x: auto;
          padding-bottom: 2rem;
        }
        .kanban-column {
          flex: 1;
          min-width: 280px;
          background: var(--surface-container-low);
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          height: fit-content;
          border: 1px solid var(--outline-variant);
        }
        .column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--outline-variant);
        }
        .column-header h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--on-surface);
          margin: 0;
        }
        .count-badge {
          background: var(--surface-container-highest);
          color: var(--on-surface-variant);
          padding: 0.1rem 0.6rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .column-body {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-height: 100px;
        }
        .empty-state {
          color: var(--outline);
          font-size: 0.875rem;
          text-align: center;
          margin-top: 1rem;
        }

        /* --- User Cards --- */
        .user-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          padding: 0.75rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }
        .user-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        
        .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--surface-container-highest);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--on-surface-variant);
          flex-shrink: 0;
        }
        .user-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
          overflow: hidden;
        }
        .user-email {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--on-surface);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remove-btn {
          background: transparent;
          border: none;
          color: var(--outline);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: background 0.2s, color 0.2s;
          flex-shrink: 0;
        }
        .remove-btn:hover {
          background: rgba(242, 139, 130, 0.1);
          color: var(--error, #f28b82);
        }
        .remove-btn .material-symbols-outlined { font-size: 1.1rem; }
      `}</style>
    </Layout>
  );
}
