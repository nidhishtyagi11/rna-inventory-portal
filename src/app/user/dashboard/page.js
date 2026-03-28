"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import KPICard from '@/components/KPICard';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { getEvents, getTransactions, getTickets } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import TicketModal from './TicketModal';

export default function UserDashboard() {
  const { clubData } = useAuth();
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const fetchData = async () => {
    if (!clubData?.id) return;
    setLoading(true);
    try {
      const [allEvents, allTx, allTickets] = await Promise.all([
        getEvents(),
        getTransactions(),
        getTickets(),
      ]);

      const clubEvents = allEvents.filter(e => e.clubId === clubData.id);
      const clubTx = allTx.filter(t => t.clubId === clubData.id && !t.isUndone);
      const clubTickets = allTickets.filter(t => t.clubId === clubData.id);

      setEvents(clubEvents);
      setTransactions(clubTx);
      setTickets(clubTickets);
    } catch (err) {
      console.error("Error fetching user dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clubData]);

  // --- Aggregate inventory breakdown ---
  // inventoryRequests are stored on the CLUB document (not on events)
  // transactions are keyed by clubId and itemName
  const aggregateInventory = () => {
    const requests = clubData?.inventoryRequests || {};
    const map = {};

    // Seed from club-level inventory requests
    for (const [itemName, qty] of Object.entries(requests)) {
      map[itemName] = {
        itemName,
        requested: parseInt(qty, 10) || 0,
        issued: 0,
        returned: 0,
      };
    }

    // Layer in transaction data
    transactions.forEach(tx => {
      const key = tx.itemName;
      if (!map[key]) {
        map[key] = { itemName: key, requested: 0, issued: 0, returned: 0 };
      }
      if (tx.type === 'Issuance') map[key].issued += (parseInt(tx.quantity, 10) || 0);
      else if (tx.type === 'Return') map[key].returned += (parseInt(tx.quantity, 10) || 0);
    });

    return Object.values(map).map(item => {
      const { issued, returned, requested } = item;
      if (requested > 0 && returned >= requested && returned >= issued) {
        item.status = 'Fully Returned'; item.variant = 'info';
      } else if (issued >= requested && issued > 0) {
        item.status = 'Fully Issued'; item.variant = 'success';
      } else if (issued > 0) {
        item.status = 'Partially Issued'; item.variant = 'warning';
      } else {
        item.status = 'Not Issued'; item.variant = 'error';
      }
      return item;
    });
  };

  const itemData = aggregateInventory();

  // --- KPI aggregations ---
  const totalRequested = itemData.reduce((s, i) => s + i.requested, 0);
  const totalIssued = itemData.reduce((s, i) => s + i.issued, 0);
  const totalReturned = itemData.reduce((s, i) => s + i.returned, 0);
  const activeTickets = tickets.filter(t => t.status === 'Open').length;

  const columns = [
    { header: 'Inventory Type', accessorKey: 'itemName' },
    { header: 'Requested', accessorKey: 'requested', align: 'right' },
    { header: 'Issued', accessorKey: 'issued', align: 'right' },
    { header: 'Returned', accessorKey: 'returned', align: 'right' },
    {
      header: 'Status',
      cell: (row) => <Badge variant={row.variant}>{row.status}</Badge>
    },
  ];

  const recentTx = [...transactions]
    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
    .slice(0, 5);

  return (
    <Layout adminOnly={false}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="headline">Welcome back, {clubData?.name || 'Club'}</h1>
          <p className="subtitle">APOGEE 2026</p>
        </div>
        <button className="primary-gradient action-btn" onClick={() => setIsTicketModalOpen(true)}>
          <span className="material-symbols-outlined">confirmation_number</span>
          Raise Ticket
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--outline)' }}>Loading your dashboard...</p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <KPICard title="Requested Inventory" value={totalRequested} icon="inventory_2" />
            <KPICard title="Issued Inventory" value={totalIssued} icon="output" />
            <KPICard title="Returned Inventory" value={totalReturned} icon="keyboard_return" />
            <KPICard title="Active Tickets" value={activeTickets} icon="confirmation_number" />
          </div>

          {/* Inventory Table */}
          <div className="section-block">
            <h2 className="section-title">Inventory Overview</h2>
            {itemData.length === 0 ? (
              <div className="empty-state">No inventory requests found for your club.</div>
            ) : (
              <DataTable columns={columns} data={itemData} />
            )}
          </div>

          <div className="bottom-grid">
            {/* Events & Active Tickets */}
            <div className="section-block" style={{ marginBottom: 0 }}>
              <h2 className="section-title">Events & Active Tickets</h2>
              <div className="glass-panel side-panel">
                {events.length === 0 ? (
                  <div className="empty-state" style={{ padding: '1.5rem', border: 'none' }}>No events found for your club.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {events.map(ev => {
                      const eventTickets = tickets.filter(t => t.eventId === ev.id || t.eventName === ev.eventName);
                      const openCount = eventTickets.filter(t => t.status === 'Open').length;
                      return (
                        <div key={ev.id} className="event-ticket-row">
                          <div className="event-info">
                            <span className="material-symbols-outlined" style={{fontSize: '1rem', color: 'var(--primary)'}}>event</span>
                            <div>
                              <div style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)'}}>{ev.eventName}</div>
                              {ev.location && <div style={{fontSize: '0.75rem', color: 'var(--outline)'}}>{ev.location}</div>}
                            </div>
                          </div>
                          <div className={`ticket-badge-pill ${openCount > 0 ? 'has-tickets' : 'no-tickets'}`}>
                            <span className="material-symbols-outlined" style={{fontSize: '0.875rem'}}>confirmation_number</span>
                            {openCount} ticket{openCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="section-block" style={{ marginBottom: 0 }}>
              <h2 className="section-title">Recent Transactions</h2>
              {recentTx.length === 0 ? (
                <div className="empty-state">No transactions recorded yet.</div>
              ) : (
                <div className="glass-panel side-panel">
                  <div className="timeline">
                    {recentTx.map(tx => (
                      <div key={tx.id} className="timeline-item">
                        <div className={`timeline-marker ${tx.type === 'Return' ? 'marker-return' : ''}`}></div>
                        <div className="timeline-content">
                          <p className="timeline-text">
                            <strong>{tx.quantity}x {tx.itemName}</strong>{' '}
                            {tx.type === 'Issuance' ? (
                              <span style={{ color: 'var(--error)' }}>issued</span>
                            ) : (
                              <span style={{ color: 'var(--tertiary)' }}>returned</span>
                            )}
                          </p>
                          <span className="timeline-time">
                            {tx.timestamp?.toDate
                              ? tx.timestamp.toDate().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : 'Just now'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        events={events}
        clubData={clubData}
        onTicketCreated={fetchData}
      />

      <style jsx>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
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
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
        .section-block { margin-bottom: 2.5rem; }
        .section-title { font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem; font-weight: 700; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--surface-container-high); }
        .empty-state { padding: 2rem; text-align: center; border: 1px dashed var(--outline-variant); border-radius: 0.5rem; color: var(--outline); font-family: 'Inter', sans-serif; background: var(--surface-container-low); }
        .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2.5rem; align-items: start; }
        .side-panel { padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--surface-container-high); background: rgba(255,255,255,0.02); }
        .event-ticket-row { display: flex; justify-content: space-between; align-items: center; padding: 0.625rem 0.75rem; background: var(--surface-container); border-radius: 0.5rem; gap: 0.5rem; }
        .event-info { display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1; }
        .ticket-badge-pill { display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.625rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 600; font-family: 'Space Grotesk', sans-serif; white-space: nowrap; flex-shrink: 0; }
        .ticket-badge-pill.has-tickets { background: rgba(255,180,171,0.12); color: var(--error); border: 1px solid rgba(255,180,171,0.3); }
        .ticket-badge-pill.no-tickets { background: var(--surface-container-high); color: var(--outline); border: 1px solid var(--outline-variant); }
        .timeline { position: relative; padding-left: 1.5rem; }
        .timeline::before { content: ''; position: absolute; left: 0.375rem; top: 0; bottom: 0; width: 2px; background-color: var(--surface-container); }
        .timeline-item { position: relative; margin-bottom: 1.25rem; }
        .timeline-item:last-child { margin-bottom: 0; }
        .timeline-marker { position: absolute; left: -1.375rem; top: 0.25rem; width: 0.5rem; height: 0.5rem; border-radius: 50%; background-color: var(--error); border: 2px solid var(--surface-container-low); }
        .marker-return { background-color: var(--tertiary); }
        .timeline-text { font-size: 0.875rem; color: var(--on-surface); margin-bottom: 0.2rem; line-height: 1.4; }
        .timeline-time { font-size: 0.75rem; color: var(--outline); }
        @media (max-width: 1024px) { 
          .kpi-grid { grid-template-columns: repeat(2, 1fr); } 
          .bottom-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) { .kpi-grid { grid-template-columns: 1fr; } .page-header { flex-direction: column; gap: 1rem; } }
      `}</style>
    </Layout>
  );
}
