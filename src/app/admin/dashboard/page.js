"use client";

import Layout from '@/components/Layout';
import KPICard from '@/components/KPICard';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEvents, getTransactions, getTickets, getInventoryStock, updateStock } from '@/lib/firestore';

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsData, txData, ticketsData, invData] = await Promise.all([
           getEvents(),
           getTransactions(),
           getTickets(),
           getInventoryStock()
        ]);
        setEvents(eventsData);
        // Sort newest transactions first
        txData.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(txData);
        setTickets(ticketsData.filter(t => t.status === 'Open'));
        setInventory(invData);
      } catch (err) {
        console.error("Error fetching admin dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute KPIs
  const clubStats = {};
  
  events.forEach(ev => {
    const club = ev.clubName || 'Unknown';
    if (!clubStats[club]) clubStats[club] = { requested: 0, issued: 0, returned: 0 };
    const req = Object.values(ev.inventoryRequests || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    clubStats[club].requested += req;
  });

  transactions.forEach(tx => {
    const club = tx.clubName || 'Unknown';
    if (!clubStats[club]) clubStats[club] = { requested: 0, issued: 0, returned: 0 };
    if (tx.type === 'Issuance') {
       clubStats[club].issued += (tx.quantity || 0);
    } else if (tx.type === 'Return') {
       clubStats[club].returned += (tx.quantity || 0);
    }
  });

  let fullyIssuedClubs = 0;
  let fullyReturnedClubs = 0;
  const totalClubsCount = Object.keys(clubStats).length;

  Object.values(clubStats).forEach(stats => {
    if (stats.requested > 0 && stats.issued >= stats.requested) {
       fullyIssuedClubs++;
    }
    if (stats.issued > 0 && stats.returned >= stats.issued) {
       fullyReturnedClubs++;
    }
  });

  const activeTicketsCount = tickets.length;

  // Flatten events for table
  const eventTableData = events.map(ev => {
    const totalRequestedItems = ev.inventoryRequests ? Object.values(ev.inventoryRequests).reduce((sum, val) => sum + (parseInt(val) || 0), 0) : 0;
    const totalIssuedToEvent = transactions.filter(t => t.eventId === ev.id && t.type === 'Issuance').reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    let issuingStatus = 'Not Issued';
    if (totalRequestedItems === 0) {
      issuingStatus = 'N/A';
    } else if (totalIssuedToEvent >= totalRequestedItems) {
      issuingStatus = 'Fully Issued';
    } else if (totalIssuedToEvent > 0) {
      issuingStatus = 'Partially Issued';
    }

    return {
      id: ev.id,
      clubName: ev.clubName || 'Unknown Club',
      eventName: ev.eventName,
      coordinatorName: ev.coordinatorName || 'Unknown',
      contact: ev.contact || 'No Contact',
      location: ev.location,
      issuingStatus
    };
  });

  const columns = [
    { header: 'Club Name', accessorKey: 'clubName' },
    { header: 'Event', accessorKey: 'eventName' },
    { 
      header: 'Coordinator', 
      cell: (row) => (
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <span>{row.coordinatorName}</span>
          <span style={{fontSize: '0.75rem', color: 'var(--outline)'}}>{row.contact}</span>
        </div>
      )
    },
    { 
      header: 'Location', 
      cell: (row) => (
        <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
          <span className="material-symbols-outlined" style={{fontSize: '1rem', color: 'var(--outline)'}}>location_on</span>
          {row.location}
        </span>
      )
    },
    { 
      header: 'Issuing Status', 
      cell: (row) => {
        let variant = 'default';
        if (row.issuingStatus === 'Fully Issued') variant = 'success';
        if (row.issuingStatus === 'Partially Issued') variant = 'warning';
        if (row.issuingStatus === 'Not Issued') variant = 'error';
        return <Badge variant={variant}>{row.issuingStatus}</Badge>;
      }
    },
  ];

  const handleRemoveLow = async (itemId) => {
    try {
      await updateStock(itemId, { isLow: false });
      setInventory(inventory.map(inv => inv.id === itemId ? { ...inv, isLow: false } : inv));
    } catch (err) {
      console.error("Failed to unmark low", err);
    }
  };

  const sortedInventory = inventory
    .filter(inv => inv.isLow)
    .map(inv => {
       const total = inv.totalStock || 0;
       const issued = inv.issuedStock || 0;
       const returned = inv.returnedStock || 0;
       const available = total - issued + returned;
       return { ...inv, available, percentage: total > 0 ? Math.round((available/total)*100) : 0 };
    })
    .sort((a, b) => a.available - b.available);

  return (
    <Layout adminOnly={true}>
      <div className="dashboard-header">
        <h1 className="headline">Command Centre</h1>
        <p className="subtitle">APOGEE 2026</p>
      </div>

      {loading ? (
        <p>Loading tactical overview...</p>
      ) : (
        <>
          <div className="kpi-grid">
            <KPICard title="Active Clubs" value={totalClubsCount} highlight={true} icon="groups" />
            <KPICard title="Active Tickets" value={activeTicketsCount} icon="confirmation_number" />
            <KPICard title="Full Issuance Rate" value={fullyIssuedClubs} subtitle="Clubs fully issued" />
            <KPICard title="Return Rate" value={fullyReturnedClubs} subtitle="Clubs fully returned" />
          </div>

          <div className="table-full-width">
            <div className="section-header">
              <h2 className="headline" style={{fontSize: '1.25rem'}}>Active Events</h2>
              <span className="badge-outline">SHOWING {events.length} EVENTS ACROSS {totalClubsCount} CLUBS</span>
            </div>
            
            {events.length === 0 ? (
                // Fallback UI to match design when no data is present
                <div style={{padding: '2rem', border: '1px solid var(--surface-container)', borderRadius: '0.5rem', color: 'var(--outline)'}}>
                  No events found. Waiting for CSV data ingestion.
                </div>
            ) : (
                <DataTable columns={columns} data={eventTableData} onRowClick={(row) => router.push(`/admin/events/${row.id}`)} />
            )}
          </div>

          <div className="three-column-footer">
            {/* Column 1: Operational Timeline */}
            <div className="glass-panel footer-col">
              <h3 className="headline col-title">Operational Timeline</h3>
              <div className="timeline">
                {transactions.length === 0 ? (
                    <div className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <p className="timeline-text">Awaiting operational activity.</p>
                        </div>
                    </div>
                ) : (
                    transactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <p className="timeline-text">
                            <strong>{tx.quantity}x {tx.itemName}</strong>{' '}
                            {tx.type === 'Issuance' ? (
                              <><span style={{color: 'var(--error)'}}>issued</span> to {tx.clubName || 'Unknown'}</>
                            ) : tx.type === 'Return' ? (
                              `returned by ${tx.clubName || 'Unknown'}`
                            ) : (
                              <span style={{color: 'var(--primary)'}}>incoming stock</span>
                            )}
                          </p>
                          <span className="timeline-time">
                            {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Column 2: Inventory Check */}
            <div className="glass-panel footer-col">
              <h3 className="headline col-title">Inventory Check</h3>
              <div className="inventory-list">
                {sortedInventory.length === 0 ? (
                   <p className="text-muted">No vital assets tracked.</p>
                ) : (
                   sortedInventory.slice(0, 6).map(inv => {
                     return (
                        <div key={inv.id} className="quick-inv-item">
                           <div className="inv-header">
                              <span className="inv-name">{inv.itemName}</span>
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <span className="inv-count">{inv.available} left</span>
                                <button
                                  className="hide-btn"
                                  title="Remove from low inventory list"
                                  onClick={() => handleRemoveLow(inv.id)}
                                >
                                  <span className="material-symbols-outlined" style={{fontSize: '1rem'}}>close</span>
                                </button>
                              </div>
                           </div>
                           <div className="progress-bar-bg">
                              <div className="progress-bar-fill" style={{width: `${inv.percentage}%`, backgroundColor: 'var(--error)'}}></div>
                           </div>
                        </div>
                     );
                   })
                )}
              </div>
            </div>

            {/* Column 3: Active Tickets */}
            <div className="glass-panel footer-col">
              <h3 className="headline col-title">Active Tickets</h3>
              {tickets.length === 0 ? (
                <p className="text-muted">No open incidents.</p>
              ) : (
                <div className="ticket-list">
                  {tickets.slice(0, 5).map(t => (
                    <div key={t.id} className="ticket-item">
                       <div className="ticket-header">
                         <span className="ticket-location">
                           <span className="material-symbols-outlined icon-tiny">location_on</span>
                           {t.location || 'Unknown Location'}
                         </span>
                       </div>
                       <p className="ticket-desc">{t.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .dashboard-header { margin-bottom: 2.5rem; }
        .subtitle { color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.875rem; margin-top: 0.25rem; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
        .table-full-width { margin-bottom: 2.5rem; border-bottom: 1px solid var(--surface-container); padding-bottom: 2rem; }
        
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .badge-outline { font-size: 0.75rem; color: var(--outline); font-weight: 600; padding: 0.25rem 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif;}
        
        .three-column-footer { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem; }
        .footer-col { padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--surface-container-high); display: flex; flex-direction: column; }
        .col-title { font-size: 1rem; margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--surface-container); }
        .text-muted { color: var(--outline); font-size: 0.875rem; }

        /* Timeline Styles */
        .timeline { position: relative; padding-left: 1.5rem; }
        .timeline::before { content: ''; position: absolute; left: 0.375rem; top: 0; bottom: 0; width: 2px; background-color: var(--surface-container); }
        .timeline-item { position: relative; margin-bottom: 1.5rem; }
        .timeline-item:last-child { margin-bottom: 0; }
        .timeline-marker { position: absolute; left: -1.375rem; top: 0.25rem; width: 0.5rem; height: 0.5rem; border-radius: 50%; background-color: var(--tertiary); border: 2px solid var(--surface-container-low); }
        .timeline-text { font-size: 0.875rem; color: var(--on-surface); margin-bottom: 0.25rem; line-height: 1.3;}
        .timeline-time { font-size: 0.75rem; color: var(--outline); }

        /* Inventory Styles */
        .inventory-list { display: flex; flex-direction: column; gap: 1rem; }
        .quick-inv-item { display: flex; flex-direction: column; gap: 0.5rem; }
        .inv-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; }
        .inv-name { color: var(--on-surface); font-family: 'Inter', sans-serif;}
        .inv-count { color: var(--outline); font-family: 'Space Grotesk', sans-serif; font-size: 0.75rem; }
        .hide-btn { background: transparent; border: none; color: var(--outline-variant); cursor: pointer; display: flex; align-items: center; padding: 0.1rem; border-radius: 0.25rem; transition: color 0.15s; }
        .hide-btn:hover { color: var(--error); background: rgba(242,139,130,0.1); }
        .progress-bar-bg { width: 100%; height: 4px; background: var(--surface-container); border-radius: 2px; overflow: hidden; }
        .progress-bar-fill { height: 100%; border-radius: 2px; }

        /* Ticket Styles */
        .ticket-list { display: flex; flex-direction: column; gap: 1rem; }
        .ticket-item { padding-bottom: 1rem; border-bottom: 1px solid var(--surface-container); }
        .ticket-item:last-child { border-bottom: none; padding-bottom: 0; }
        .ticket-header { display: flex; margin-bottom: 0.5rem; align-items: center; }
        .ticket-location { font-size: 0.75rem; color: var(--primary); display: flex; align-items: center; gap: 0.25rem; font-family: 'Space Grotesk', sans-serif; text-transform: uppercase;}
        .icon-tiny { font-size: 0.875rem; }
        .ticket-desc { font-size: 0.875rem; color: var(--on-surface); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </Layout>
  );
}
