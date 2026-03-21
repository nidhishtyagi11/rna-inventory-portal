"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { getEventsByUser, getTransactions, getTickets } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import TicketModal from './TicketModal';

export default function UserDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // In a real system, we'd query by user ID. If data is mocked initially via CSV, we might need to map by email or club name.
  // For the sake of this prototype, we'll fetch all events and filter by email if possible, or just default to mock data if empty.
  
  const fetchUserData = async () => {
    setLoading(true);
    try {
      if (user?.email) {
        const userEvents = await getEventsByUser(user.email); 
        setEvents(userEvents);
        
        // Find transactions related to these events
        const eventIds = new Set(userEvents.map(e => e.id));
        const allTx = await getTransactions();
        setTransactions(allTx.filter(t => eventIds.has(t.eventId)));
        
        const allTickets = await getTickets();
        setTickets(allTickets.filter(t => eventIds.has(t.eventId)));
      }
    } catch (err) {
      console.error("Error fetching user dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  // Aggregate item breakdown across all events for the user
  const aggregateBreakdown = () => {
     const breakdownMap = {};
     
     events.forEach(ev => {
         const reqs = ev.inventoryRequests || {};
         for (const [item, qty] of Object.entries(reqs)) {
             if (!breakdownMap[item]) {
                 breakdownMap[item] = { itemName: item, requested: 0, issued: 0, returned: 0, inUse: 0, pending: 0 };
             }
             breakdownMap[item].requested += (parseInt(qty, 10) || 0);
         }
     });

     transactions.forEach(tx => {
         if (breakdownMap[tx.itemName]) {
             if (tx.type === 'Issuance') {
                 breakdownMap[tx.itemName].issued += (tx.quantity || 0);
             } else if (tx.type === 'Return') {
                 breakdownMap[tx.itemName].returned += (tx.quantity || 0);
             }
         }
     });

     return Object.values(breakdownMap).map(item => {
         item.pending = Math.max(0, item.requested - item.issued);
         item.inUse = Math.max(0, item.issued - item.returned);
         
         if (item.issued >= item.requested && item.issued === item.returned) {
             item.status = 'Returned'; item.variant = 'default';
         } else if (item.issued >= item.requested) {
             item.status = 'Fully Issued'; item.variant = 'success';
         } else if (item.issued > 0) {
             item.status = 'Partial'; item.variant = 'warning';
         } else {
             item.status = 'Pending'; item.variant = 'error';
         }
         return item;
     });
  };

  const itemData = aggregateBreakdown();

  const columns = [
    { header: 'Item', accessorKey: 'itemName' },
    { header: 'Requested', accessorKey: 'requested', align: 'right' },
    { header: 'Issued', accessorKey: 'issued', align: 'right' },
    { header: 'In Use', accessorKey: 'inUse', align: 'right' },
    { header: 'Returned', accessorKey: 'returned', align: 'right' },
    { 
      header: 'Status', 
      cell: (row) => <Badge variant={row.variant}>{row.status}</Badge> 
    }
  ];

  return (
    <Layout adminOnly={false}>
      <div className="page-header">
        <div>
          <h1 className="headline">Operational Unit</h1>
          <p className="subtitle">Welcome back, {user?.displayName || 'Coordinator'}. View your requested inventory.</p>
        </div>
        <button className="tactical-btn raise-btn error-border" onClick={() => setIsTicketModalOpen(true)}>
          <span className="material-symbols-outlined">support_agent</span>
          Raise a Ticket
        </button>
      </div>

      <div className="dashboard-grid">
         <div className="main-col">
            <div className="section-header">
              <h2 className="headline" style={{fontSize: '1.25rem'}}>Assigned Inventory</h2>
            </div>
            {itemData.length === 0 ? (
               <div className="empty-state glass-panel">
                 <p>No inventory requests found for your account.</p>
               </div>
            ) : (
               <DataTable columns={columns} data={itemData} />
            )}
         </div>
         
         <div className="side-col">
             <div className="glass-panel side-panel">
               <h3 className="headline" style={{fontSize: '1rem', marginBottom: '1rem'}}>Active Requests/Events</h3>
               <div className="events-list">
                 {events.length === 0 ? <p style={{color: 'var(--outline)', fontSize: '0.875rem'}}>No events linked to your ID.</p> : null}
                 {events.map(ev => (
                   <div key={ev.id} className="event-item">
                     <strong>{ev.eventName}</strong>
                     <span><span className="material-symbols-outlined icon-sm">location_on</span> {ev.location}</span>
                   </div>
                 ))}
               </div>
             </div>

             <div className="glass-panel side-panel" style={{marginTop: '1.5rem'}}>
               <h3 className="headline" style={{fontSize: '1rem', marginBottom: '1rem'}}>Your Tickets</h3>
               <div className="ticket-list">
                  {tickets.length === 0 ? <p style={{color: 'var(--outline)', fontSize: '0.875rem'}}>No support tickets raised.</p> : null}
                  {tickets.map(t => (
                    <div key={t.id} className="ticket-row">
                      <Badge variant={t.status === 'Open' ? 'error' : 'default'}>{t.status}</Badge>
                      <span className="ticket-desc">{t.description}</span>
                    </div>
                  ))}
               </div>
             </div>
         </div>
      </div>

      <TicketModal 
         isOpen={isTicketModalOpen} 
         onClose={() => setIsTicketModalOpen(false)} 
         events={events}
         onTicketCreated={fetchUserData}
      />

      <style jsx>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
        .subtitle { color: var(--on-surface-variant); font-size: 0.875rem; margin-top: 0.25rem; }
        .raise-btn { background: var(--error-container); color: var(--on-error-container); display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; font-size: 0.875rem; border: none; border-radius: 2rem; cursor: pointer;}
        .raise-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        .section-header { margin-bottom: 1rem; }
        .side-panel { padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--surface-container-high); }
        .events-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .event-item { display: flex; flex-direction: column; gap: 0.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--surface-container); }
        .event-item strong { color: var(--on-surface); font-size: 0.875rem; font-weight: 500; font-family: 'Inter', sans-serif;}
        .event-item span { display: flex; align-items: center; gap: 0.25rem; color: var(--outline); font-size: 0.75rem;}
        .icon-sm { font-size: 0.875rem; }
        .event-item:last-child { border-bottom: none; padding-bottom: 0; }
        .ticket-list { display: flex; flex-direction: column; gap: 1rem; }
        .ticket-row { display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--surface-container); }
        .ticket-row:last-child { border-bottom: none; padding-bottom: 0; }
        .ticket-desc { font-size: 0.875rem; color: var(--on-surface-variant); font-family: 'Inter', sans-serif; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;}
        .empty-state { padding: 3rem; text-align: center; color: var(--on-surface-variant); }
      `}</style>
    </Layout>
  );
}
