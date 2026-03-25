"use client";

import Layout from '@/components/Layout';
import KPICard from '@/components/KPICard';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEvents, getTransactions, getTickets, getInventoryStock, updateStock, getClubs } from '@/lib/firestore';

export default function AdminDashboard() {
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // New UI states
  const [viewMode, setViewMode] = useState('clubs'); // 'clubs' | 'events'
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [issuingFilters, setIssuingFilters] = useState(['Fully Issued', 'Partially Issued', 'Not Issued', 'N/A']);

  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [clubsData, eventsData, txData, ticketsData, invData] = await Promise.all([
           getClubs(),
           getEvents(),
           getTransactions(),
           getTickets(),
           getInventoryStock()
        ]);
        setClubs(clubsData);
        setEvents(eventsData);
        txData.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(txData.filter(t => !t.isUndone));
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

  // Compute KPIs using Club Data Model
  const clubStats = {};
  
  clubs.forEach(club => {
    clubStats[club.id] = { requested: 0, issued: 0, returned: 0 };
    const req = Object.values(club.inventoryRequests || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    clubStats[club.id].requested = req;
  });

  transactions.forEach(tx => {
    const clubId = tx.clubId;
    if (clubId && clubStats[clubId]) {
      if (tx.type === 'Issuance') {
         clubStats[clubId].issued += (tx.quantity || 0);
      } else if (tx.type === 'Return') {
         clubStats[clubId].returned += (tx.quantity || 0);
      }
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

  // Build club table data
  const clubTableData = clubs.map(club => {
    const clubEvents = events.filter(e => e.clubId === club.id);
    const eventNames = clubEvents.map(e => e.eventName).filter(Boolean);

    const totalRequested = Object.values(club.inventoryRequests || {}).reduce((s, v) => s + (parseInt(v) || 0), 0);
    const totalIssued = transactions
      .filter(t => t.clubId === club.id && t.type === 'Issuance')
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    let issuingStatus = 'Not Issued';
    if (totalRequested === 0) issuingStatus = 'N/A';
    else if (totalIssued >= totalRequested) issuingStatus = 'Fully Issued';
    else if (totalIssued > 0) issuingStatus = 'Partially Issued';

    return {
      id: club.id,
      clubName: club.name || 'Unknown',
      coordinatorName: club.coordinatorName || '',
      contact: club.contact || '',
      eventNames,
      issuingStatus
    };
  });

  // Build event table data
  const eventTableData = events.map(ev => {
    const club = clubs.find(c => c.id === ev.clubId) || {};
    const eventTickets = tickets.filter(t => t.eventId === ev.id || t.eventName === ev.eventName);
    return {
      id: ev.id,
      eventName: ev.eventName || 'Unnamed Event',
      clubName: club.name || ev.clubName || 'Unknown',
      location: ev.location || 'Not Set',
      coordinatorName: club.coordinatorName || 'Not Set',
      ticketsCount: eventTickets.length
    };
  }).sort((a, b) => b.ticketsCount - a.ticketsCount); // Pre-sort naturally by active tickets desc

  // Table Columns
  const clubColumns = [
    { header: 'Club Name', accessorKey: 'clubName' },
    { 
      header: 'Event(s)', 
      cell: (row) => (
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
          {row.eventNames && row.eventNames.length > 0 ? row.eventNames.map((name, i) => (
            <span key={i} style={{fontSize: '0.8rem'}}>{name}</span>
          )) : <span style={{color: 'var(--outline)'}}>—</span>}
        </div>
      )
    },
    { 
      header: 'Coordinator', 
      cell: (row) => (
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <span>{row.coordinatorName || '—'}</span>
          <span style={{fontSize: '0.75rem', color: 'var(--outline)'}}>{row.contact}</span>
        </div>
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

  const eventColumns = [
    { header: 'Event Name', accessorKey: 'eventName' },
    { header: 'Club Name', accessorKey: 'clubName' },
    { header: 'Location', accessorKey: 'location' },
    { header: 'Coordinator', accessorKey: 'coordinatorName' },
    { header: 'Tickets', accessorKey: 'ticketsCount', align: 'right' },
  ];

  // Filters
  const safeSearch = (searchQuery || '').toLowerCase();
  
  const filteredClubData = clubTableData.filter(c => {
    const searchMatch = c.clubName.toLowerCase().includes(safeSearch) || 
                        c.eventNames.some(en => en.toLowerCase().includes(safeSearch));
    const filterMatch = issuingFilters.length === 0 || issuingFilters.includes(c.issuingStatus);
    return searchMatch && filterMatch;
  });

  const filteredEventData = eventTableData.filter(e => {
    const searchMatch = e.eventName.toLowerCase().includes(safeSearch) || 
                        e.clubName.toLowerCase().includes(safeSearch);
    const locMatch = locationFilter === 'All' || e.location === locationFilter;
    return searchMatch && locMatch;
  });

  const uniqueLocations = [...new Set(eventTableData.map(e => e.location))].filter(Boolean).sort();

  const sortedInventory = inventory
    .map(inv => {
       const total = parseInt(inv.totalStock, 10) || 0;
       const issued = parseInt(inv.issuedStock, 10) || 0;
       const returned = parseInt(inv.returnedStock, 10) || 0;
       const available = total - issued + returned;
       return { ...inv, available, total };
    })
    .filter(inv => inv.total > 0 && inv.available <= 0)
    .sort((a, b) => a.available - b.available);

  return (
    <Layout adminOnly={true}>
      <div className="dashboard-header">
        <h1 className="headline">Operations Dashboard</h1>
        <p className="subtitle">APOGEE 2026</p>
      </div>

      {loading ? (
        <p>Loading tactical overview...</p>
      ) : (
        <>
          <div className="kpi-grid">
            <KPICard title="Active Clubs" value={totalClubsCount} icon="groups" />
            <KPICard title="Active Tickets" value={activeTicketsCount} icon="confirmation_number" />
            <KPICard title="Full Issuance Rate" value={fullyIssuedClubs} subtitle="Clubs fully issued" />
            <KPICard title="Return Rate" value={fullyReturnedClubs} subtitle="Clubs fully returned" />
          </div>

          <div className="table-full-width">
            <div className="section-header">
              <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
                <div className="toggle-group">
                  <button 
                    className={`toggle-btn ${viewMode === 'clubs' ? 'active' : ''}`} 
                    onClick={() => setViewMode('clubs')}
                  >
                    Active Clubs
                  </button>
                  <button 
                    className={`toggle-btn ${viewMode === 'events' ? 'active' : ''}`} 
                    onClick={() => setViewMode('events')}
                  >
                    Active Events
                  </button>
                </div>
              </div>
              
              <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                {viewMode === 'clubs' && (
                  <div className="status-filters">
                    {['Fully Issued', 'Partially Issued', 'Not Issued', 'N/A'].map(status => (
                      <label key={status} className="status-checkbox">
                        <input 
                          type="checkbox" 
                          checked={issuingFilters.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) setIssuingFilters([...issuingFilters, status]);
                            else setIssuingFilters(issuingFilters.filter(s => s !== status));
                          }}
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                )}
                
                {viewMode === 'events' && (
                  <select 
                    value={locationFilter} 
                    onChange={e => setLocationFilter(e.target.value)} 
                    className="dashboard-select"
                  >
                    <option value="All">All Locations</option>
                    {uniqueLocations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
                <input 
                  type="text" 
                  placeholder={`Search ${viewMode}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dashboard-input"
                />
                <span className="badge-outline">
                  SHOWING {viewMode === 'clubs' ? filteredClubData.length : filteredEventData.length} {viewMode.toUpperCase()}
                </span>
              </div>
            </div>
            
            {viewMode === 'clubs' ? (
              filteredClubData.length === 0 ? (
                  <div className="empty-state">No clubs found matching your criteria.</div>
              ) : (
                  <DataTable columns={clubColumns} data={filteredClubData} onRowClick={(row) => router.push(`/admin/clubs/${row.id}`)} itemsPerPage={6} />
              )
            ) : (
              filteredEventData.length === 0 ? (
                  <div className="empty-state">No events found matching your criteria.</div>
              ) : (
                  <DataTable columns={eventColumns} data={filteredEventData} itemsPerPage={6} />
              )
            )}
          </div>

          <div className="three-column-footer">
            {/* Column 1: Transactions */}
            <div className="glass-panel footer-col">
              <h3 
                className="headline col-title clickable-title" 
                onClick={() => router.push('/admin/transactions')}
                title="View All Transactions"
              >
                Transactions <span className="material-symbols-outlined" style={{fontSize: '1rem'}}>arrow_forward_ios</span>
              </h3>
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
              <h3 
                className="headline col-title clickable-title" 
                onClick={() => router.push('/admin/inventory')}
                title="Go to Inventory Stock View"
              >
                Inventory Check <span className="material-symbols-outlined" style={{fontSize: '1rem'}}>arrow_forward_ios</span>
              </h3>
              <div className="inventory-list">
                {sortedInventory.length === 0 ? (
                   <p className="text-muted">No vital assets tracked.</p>
                ) : (
                   sortedInventory.slice(0, 6).map(inv => {
                     return (
                        <div key={inv.id} className="quick-inv-item">
                           <div className="inv-header">
                              <span className="inv-name">
                                {inv.itemName}
                                <span className="depleted-badge">Depleted</span>
                              </span>
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <span className="inv-count">{inv.available} left</span>
                              </div>
                           </div>
                        </div>
                     );
                   })
                )}
              </div>
            </div>

            {/* Column 3: Active Tickets */}
            <div className="glass-panel footer-col">
              <h3 
                className="headline col-title clickable-title" 
                onClick={() => router.push('/admin/tickets')}
                title="Manage Support Tickets"
              >
                Active Tickets <span className="material-symbols-outlined" style={{fontSize: '1rem'}}>arrow_forward_ios</span>
              </h3>
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
        
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--surface-container-high); }
        .badge-outline { font-size: 0.75rem; color: var(--outline); font-weight: 600; padding: 0.25rem 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif;}
        
        /* Dashboard Toggle & Input Styles */
        .toggle-group {
          display: flex;
          background: var(--surface-container-highest);
          border-radius: 2rem;
          padding: 0.25rem;
          gap: 0.25rem;
          border: 1px solid var(--outline-variant);
        }
        .toggle-btn {
          border: none;
          background: transparent;
          color: var(--on-surface-variant);
          padding: 0.5rem 1.25rem;
          border-radius: 1.5rem;
          cursor: pointer;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          transition: all 0.2s ease;
        }
        .toggle-btn.active {
          background: var(--primary);
          color: var(--on-primary);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .toggle-btn:hover:not(.active) {
          color: var(--on-surface);
          background: rgba(255,255,255,0.05);
        }
        
        .dashboard-input, .dashboard-select {
          background-color: var(--surface-container-highest);
          border: 1px solid var(--outline-variant);
          border-radius: 0.5rem;
          color: var(--on-surface);
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
          font-family: 'Inter', sans-serif;
          outline: none;
          min-width: 200px;
          transition: border-color 0.2s;
        }
        .dashboard-input:focus, .dashboard-select:focus {
          border-color: var(--primary);
        }
        .empty-state {
          padding: 2rem;
          text-align: center;
          border: 1px dashed var(--outline-variant);
          border-radius: 0.5rem;
          color: var(--outline);
          font-family: 'Inter', sans-serif;
          background: var(--surface-container-low);
        }
        
        .status-filters {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-right: 0.5rem;
        }
        .status-checkbox {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--on-surface-variant);
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          user-select: none;
        }
        .status-checkbox input {
          accent-color: var(--primary);
          cursor: pointer;
        }

        .three-column-footer { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem; }
        .footer-col { padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--surface-container-high); display: flex; flex-direction: column; }
        .col-title { font-size: 1rem; margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--surface-container); display: flex; justify-content: space-between; align-items: center; }
        .clickable-title { cursor: pointer; transition: color 0.2s ease; }
        .clickable-title:hover { color: var(--primary); }
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
        .quick-inv-item { display: flex; flex-direction: column; padding-bottom: 0.75rem; border-bottom: 1px solid var(--surface-container); }
        .quick-inv-item:last-child { border-bottom: none; }
        .inv-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; }
        .inv-name { color: var(--on-surface); font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 0.5rem;}
        .depleted-badge { background: rgba(255, 180, 171, 0.15); color: var(--error); padding: 0.1rem 0.3rem; border-radius: 0.2rem; font-size: 0.6rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif; }
        .inv-count { color: var(--outline); font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem; font-weight: 500;}

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
