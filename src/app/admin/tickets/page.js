"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { getTickets, updateTicketStatus } from '@/lib/firestore';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Open');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await getTickets();
      data.sort((a, b) => b.timestamp - a.timestamp);
      setTickets(data);
    } catch (err) {
      console.error("Error fetching tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCloseTicket = async (ticketId) => {
    if (confirm("Are you sure you want to mark this ticket as closed?")) {
      try {
        await updateTicketStatus(ticketId, 'Closed');
        fetchTickets();
      } catch (err) {
        console.error(err);
        alert("Failed to close ticket.");
      }
    }
  };

  const filteredTickets = filterStatus === 'All' 
    ? tickets 
    : tickets.filter(t => t.status === filterStatus);

  const columns = [
    { header: 'ID', accessorKey: 'id', cell: (row) => <span style={{fontFamily: 'monospace', fontSize: '0.75rem'}}>{row.id.slice(0, 8)}</span> },
    { 
      header: 'Status', 
      cell: (row) => <Badge variant={row.status === 'Open' ? 'error' : 'default'}>{row.status}</Badge> 
    },
    { header: 'Club Name', accessorKey: 'clubName' },
    { header: 'Event', accessorKey: 'eventName' },
    { 
       header: 'Description', 
       cell: (row) => <div style={{maxWidth: '300px', whiteSpace: 'normal', fontSize: '0.875rem'}}>{row.description}</div> 
    },
    { 
      header: 'Time Logged', 
      cell: (row) => row.timestamp?.toDate ? row.timestamp.toDate().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'N/A' 
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => row.status === 'Open' ? (
        <button onClick={() => handleCloseTicket(row.id)} className="close-btn">
          Resolve
        </button>
      ) : (
        <span style={{color: 'var(--outline)', fontSize: '0.75rem'}}>Resolved</span>
      )
    }
  ];

  return (
    <Layout adminOnly={true}>
      <div className="page-header">
        <div>
          <h1 className="headline">View Tickets</h1>
          <p className="subtitle">Streamlined Issue Resolution Metrics</p>
        </div>
        
        <div className="filter-group">
          <label>Filter Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Tickets</option>
            <option value="Open">Open (Action Reg'd)</option>
            <option value="Closed">Closed (Resolved)</option>
          </select>
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric">
          <span className="metric-val">{tickets.filter(t => t.status === 'Open').length}</span>
          <span className="metric-label">Open Tickets</span>
        </div>
        <div className="metric">
          <span className="metric-val">{tickets.filter(t => t.status === 'Closed').length}</span>
          <span className="metric-label">Resolved</span>
        </div>
      </div>

      {loading ? (
        <p>Loading tickets...</p>
      ) : (
         <DataTable columns={columns} data={filteredTickets} />
      )}

      <style jsx>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .subtitle { color: var(--on-surface-variant); font-size: 0.875rem; margin-top: 0.25rem; }
        .filter-group { display: flex; align-items: center; gap: 1rem; }
        .filter-group label { font-size: 0.75rem; color: var(--outline); text-transform: uppercase; letter-spacing: 0.05em; }
        select { padding: 0.5rem 1rem; background-color: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 0.875rem; font-family: 'Inter', sans-serif; outline: none; }
        .metrics-row { display: flex; gap: 2rem; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid var(--surface-container); }
        .metric { display: flex; flex-direction: column; }
        .metric-val { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 700; line-height: 1; }
        .metric-label { font-size: 0.75rem; color: var(--outline); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.5rem; }
        .close-btn { background: var(--surface-container); color: var(--primary); border: 1px solid var(--surface-container-highest); padding: 0.4rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .close-btn:hover { background: var(--surface-container-high); }
      `}</style>
    </Layout>
  );
}
