"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { getTickets } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import TicketModal from '../dashboard/TicketModal';
import { getEvents } from '@/lib/firestore';

export default function UserTickets() {
  const { clubData } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const fetchData = async () => {
    if (!clubData?.id) return;
    try {
      const [allTickets, allEvents] = await Promise.all([getTickets(), getEvents()]);
      const clubTickets = allTickets
        .filter(t => t.clubId === clubData.id)
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      const clubEvents = allEvents.filter(e => e.clubId === clubData.id);
      setTickets(clubTickets);
      setEvents(clubEvents);
    } catch (err) {
      console.error("Error fetching tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clubData]);

  const filtered = tickets.filter(t => statusFilter === 'All' || t.status === statusFilter);

  const formatDate = (ts) => {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const typeVariant = (type) => {
    const map = { Electricity: 'warning', Tent: 'info', Inventory: 'error', Other: 'default' };
    return map[type] || 'default';
  };

  const columns = [
    { header: 'Event', accessorKey: 'eventName' },
    {
      header: 'Type',
      cell: (row) => <Badge variant={typeVariant(row.ticketType)}>{row.ticketType || 'General'}</Badge>
    },
    {
      header: 'Status',
      cell: (row) => <Badge variant={row.status === 'Open' ? 'error' : 'success'}>{row.status}</Badge>
    },
    { header: 'Description', cell: (row) => (
      <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', maxWidth: '400px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.description}
      </span>
    )},
    { header: 'Raised At', cell: (row) => formatDate(row.timestamp) },
  ];

  return (
    <Layout adminOnly={false}>
      <div className="page-header">
        <div>
          <h1 className="headline">Support Tickets</h1>
          <p className="subtitle">{clubData?.name || 'Your Club'} · Ticket History</p>
        </div>
        <button className="primary-gradient action-btn" onClick={() => setIsTicketModalOpen(true)}>
          <span className="material-symbols-outlined">add</span>
          Raise Ticket
        </button>
      </div>

      <div className="controls-row">
        <div className="toggle-group">
          {['All', 'Open', 'Resolved'].map(s => (
            <button
              key={s}
              className={`toggle-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="count-badge">{filtered.length} tickets</span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--outline)' }}>Loading tickets...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No tickets found.</div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        events={events}
        clubData={clubData}
        onTicketCreated={fetchData}
      />

      <style jsx>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .subtitle { color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.875rem; margin-top: 0.25rem; }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 700;
          font-size: 0.875rem;
          font-family: 'Space Grotesk', sans-serif;
          cursor: pointer;
          color: var(--on-primary-container) !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: opacity 0.2s, transform 0.15s;
        }
        .action-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .controls-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .toggle-group { display: flex; background: var(--surface-container-highest); border-radius: 2rem; padding: 0.25rem; gap: 0.25rem; border: 1px solid var(--outline-variant); }
        .toggle-btn { border: none; background: transparent; color: var(--on-surface-variant); padding: 0.4rem 1rem; border-radius: 1.5rem; cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; transition: all 0.2s ease; white-space: nowrap; }
        .toggle-btn.active { background: var(--primary); color: var(--on-primary); }
        .toggle-btn:hover:not(.active) { color: var(--on-surface); background: rgba(255,255,255,0.05); }
        .count-badge { font-size: 0.75rem; color: var(--outline); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif; white-space: nowrap; }
        .empty-state { padding: 2rem; text-align: center; border: 1px dashed var(--outline-variant); border-radius: 0.5rem; color: var(--outline); font-family: 'Inter', sans-serif; background: var(--surface-container-low); }
      `}</style>
    </Layout>
  );
}
