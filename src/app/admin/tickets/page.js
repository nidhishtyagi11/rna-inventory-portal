"use client";

import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import { getTickets, updateTicketStatus, createTicket, getEvents } from '@/lib/firestore';

const TICKET_TYPES = [
  { id: 'Electricity', label: 'Electricity', icon: 'bolt' },
  { id: 'Tent', label: 'Tent / Polling', icon: 'T', isText: true },
  { id: 'Inventory', label: 'Inventory', icon: 'inventory_2' },
  { id: 'Other', label: 'Other', icon: 'help' },
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('Open');

  // Search / location / type filter
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Raise ticket modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketType, setTicketType] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [data, eventsData] = await Promise.all([getTickets(), getEvents()]);
      setTickets(data);
      setEvents(eventsData);
    } catch (err) {
      console.error("Error fetching tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleResolve = async (ticketId) => {
    if (confirm("Mark this ticket as Resolved?")) {
      try {
        await updateTicketStatus(ticketId, 'Resolved');
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Failed to resolve ticket.");
      }
    }
  };

  const handleReopen = async (ticketId) => {
    try {
      await updateTicketStatus(ticketId, 'Open');
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to reopen ticket.");
    }
  };

  // Legacy "Closed" status support
  const isResolved = (t) => t.status === 'Resolved' || t.status === 'Closed';
  const isOpen = (t) => !isResolved(t);

  // Sorted open-first, then oldest-open-first within open group
  const sortedTickets = useMemo(() => {
    const open = tickets
      .filter(isOpen)
      .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)); // oldest first
    const resolved = tickets
      .filter(isResolved)
      .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); // newest first
    return [...open, ...resolved];
  }, [tickets]);

  // Unique locations from all ticket locations
  const uniqueLocations = useMemo(() => {
    const locs = sortedTickets.map(t => t.location).filter(Boolean);
    return [...new Set(locs)].sort();
  }, [sortedTickets]);

  const filteredTickets = useMemo(() => {
    let result = sortedTickets;

    // Status filter
    if (filterStatus === 'Open') result = result.filter(isOpen);
    else if (filterStatus === 'Resolved') result = result.filter(isResolved);

    // Location filter
    if (locationFilter !== 'All') result = result.filter(t => t.location === locationFilter);

    // Type filter
    if (typeFilter !== 'All') result = result.filter(t => t.ticketType === typeFilter);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.clubName?.toLowerCase().includes(q) ||
        t.eventName?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.ticketType?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sortedTickets, filterStatus, locationFilter, typeFilter, searchQuery]);

  // Event search for modal
  const modalFilteredEvents = events.filter(ev => {
    const q = eventSearch.toLowerCase();
    return (
      ev.eventName?.toLowerCase().includes(q) ||
      ev.clubName?.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const resetModal = () => {
    setEventSearch('');
    setSelectedEvent(null);
    setTicketType('');
    setDescription('');
    setFormError('');
  };

  const handleRaiseTicket = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!selectedEvent) { setFormError('Please select an event.'); return; }
    if (!ticketType) { setFormError('Please select a ticket type.'); return; }
    if (!description.trim()) { setFormError('Description cannot be empty.'); return; }
    setSubmitting(true);
    try {
      await createTicket({
        eventId: selectedEvent.id,
        eventName: selectedEvent.eventName,
        clubId: selectedEvent.clubId,
        clubName: selectedEvent.clubName,
        location: selectedEvent.location || '',
        ticketType,
        description: description.trim(),
        raisedByAdmin: true,
      });
      resetModal();
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error creating ticket:", err);
      setFormError('Failed to raise ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const typeVariant = (type) => {
    const map = { Electricity: 'warning', Tent: 'info', Inventory: 'error', Other: 'default' };
    return map[type] || 'default';
  };

  const formatDate = (ts) => {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const columns = [
    { header: 'Club', accessorKey: 'clubName' },
    { header: 'Event', accessorKey: 'eventName' },
    { header: 'Location', accessorKey: 'location', cell: (row) => row.location || '—' },
    {
      header: 'Type',
      cell: (row) => <Badge variant={typeVariant(row.ticketType)}>{row.ticketType || 'General'}</Badge>
    },
    {
      header: 'Status',
      cell: (row) => <Badge variant={isOpen(row) ? 'error' : 'success'}>{isOpen(row) ? 'Open' : 'Resolved'}</Badge>
    },
    {
      header: 'Description',
      cell: (row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', maxWidth: '280px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.description}
        </span>
      )
    },
    { header: 'Raised At', cell: (row) => formatDate(row.timestamp) },
    {
      header: 'Action',
      align: 'right',
      cell: (row) => isOpen(row) ? (
        <button onClick={() => handleResolve(row.id)} className="action-pill pill-resolve">
          Resolve
        </button>
      ) : (
        <button onClick={() => handleReopen(row.id)} className="action-pill pill-reopen">
          Reopen
        </button>
      )
    }
  ];

  return (
    <Layout adminOnly={true}>
      <div className="page-header">
        <div>
          <h1 className="headline">Support Tickets</h1>
          <p className="subtitle">Issues raised by clubs</p>
        </div>
        <button className="primary-gradient action-btn" onClick={() => { resetModal(); setIsModalOpen(true); }}>
          <span className="material-symbols-outlined">add</span>
          Raise Ticket
        </button>
      </div>

      {/* Controls row: pill toggle + search + filter + metrics */}
      <div className="controls-row">
        <div className="toggle-group">
          {['All', 'Open', 'Resolved'].map(s => (
            <button
              key={s}
              className={`toggle-btn ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Search club, event, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Location filter dropdown */}
        <div className="location-filter-wrapper">
          <button
            className="dashboard-select"
            onClick={() => setIsLocationDropdownOpen(v => !v)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>location_on</span>
            Location {locationFilter !== 'All' && `· ${locationFilter}`}
          </button>
          {isLocationDropdownOpen && (
            <div className="location-dropdown">
              {['All', ...uniqueLocations].map(loc => (
                <button
                  key={loc}
                  className={`location-option ${locationFilter === loc ? 'selected' : ''}`}
                  onClick={() => { setLocationFilter(loc); setIsLocationDropdownOpen(false); }}
                >
                  {loc === 'All' ? 'All Locations' : loc}
                  {locationFilter === loc && (
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginLeft: 'auto' }}>check</span>
                  )}
                </button>
              ))}
              {uniqueLocations.length === 0 && (
                <span className="location-empty">No locations available</span>
              )}
            </div>
          )}
        </div>

        {/* Type filter dropdown */}
        <div className="location-filter-wrapper">
          <button
            className="dashboard-select"
            onClick={() => setIsTypeDropdownOpen(v => !v)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>category</span>
            Type {typeFilter !== 'All' && `· ${typeFilter}`}
          </button>
          {isTypeDropdownOpen && (
            <div className="location-dropdown">
              {['All', ...TICKET_TYPES.map(t => t.id)].map(type => (
                <button
                  key={type}
                  className={`location-option ${typeFilter === type ? 'selected' : ''}`}
                  onClick={() => { setTypeFilter(type); setIsTypeDropdownOpen(false); }}
                >
                  {type === 'All' ? 'All Types' : type}
                  {typeFilter === type && (
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginLeft: 'auto' }}>check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="count-badge">{filteredTickets.length} tickets</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '2rem' }}>
          <div className="metric">
            <span className="metric-val">{tickets.filter(isOpen).length}</span>
            <span className="metric-label">Open</span>
          </div>
          <div className="metric">
            <span className="metric-val">{tickets.filter(isResolved).length}</span>
            <span className="metric-label">Resolved</span>
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--outline)' }}>Loading tickets...</p>
      ) : filteredTickets.length === 0 ? (
        <div className="empty-state">No tickets found.</div>
      ) : (
        <DataTable columns={columns} data={filteredTickets} />
      )}

      {/* Admin Raise Ticket Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetModal(); }} title="Raise a Support Ticket">
        <form onSubmit={handleRaiseTicket} className="ticket-form">
          <div className="form-group">
            <label>Search Event or Club</label>
            <input
              type="text"
              placeholder="Type club or event name..."
              value={eventSearch}
              onChange={(e) => { setEventSearch(e.target.value); setSelectedEvent(null); }}
              className="modal-input"
              autoComplete="off"
            />
            {eventSearch && !selectedEvent && modalFilteredEvents.length > 0 && (
              <div className="event-dropdown">
                {modalFilteredEvents.map(ev => (
                  <button
                    type="button"
                    key={ev.id}
                    className="event-option"
                    onClick={() => { setSelectedEvent(ev); setEventSearch(`${ev.eventName} · ${ev.clubName}`); }}
                  >
                    <span className="event-name">{ev.eventName}</span>
                    <span className="event-club">{ev.clubName}{ev.location ? ` · ${ev.location}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedEvent && (
              <div className="selected-event-chip">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check_circle</span>
                {selectedEvent.eventName} · <span style={{ color: 'var(--outline)' }}>{selectedEvent.clubName}</span>
                <button type="button" className="chip-clear" onClick={() => { setSelectedEvent(null); setEventSearch(''); }}>✕</button>
              </div>
            )}
          </div>

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

          {formError && <p className="form-error">{formError}</p>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => { setIsModalOpen(false); resetModal(); }} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-primary primary-gradient" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Raise Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      <style jsx>{`
        /* Page layout */
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .subtitle { color: var(--on-surface-variant); font-size: 0.875rem; margin-top: 0.25rem; }
        .action-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; font-weight: 700; font-size: 0.875rem; font-family: 'Space Grotesk', sans-serif; cursor: pointer; color: var(--on-primary-container) !important; text-transform: uppercase; letter-spacing: 0.05em; transition: opacity 0.2s, transform 0.15s; }
        .action-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* Controls row */
        .controls-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .toggle-group { display: flex; background: var(--surface-container-highest); border-radius: 2rem; padding: 0.25rem; gap: 0.25rem; border: 1px solid var(--outline-variant); flex-shrink: 0; }
        .toggle-btn { border: none; background: transparent; color: var(--on-surface-variant); padding: 0.4rem 1rem; border-radius: 1.5rem; cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; transition: all 0.2s ease; white-space: nowrap; }
        .toggle-btn.active { background: var(--primary); color: var(--on-primary); }
        .toggle-btn:hover:not(.active) { color: var(--on-surface); background: rgba(255,255,255,0.05); }

        /* Search */
        .search-wrapper { position: relative; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 0.75rem; font-size: 1.1rem; color: var(--outline); pointer-events: none; }
        .search-input { background: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 0.875rem; padding: 0.45rem 1rem 0.45rem 2.25rem; font-family: 'Inter', sans-serif; outline: none; width: 240px; transition: border-color 0.2s; }
        .search-input:focus { border-color: var(--primary); }

        /* Location filter */
        .location-filter-wrapper { position: relative; }
        .dashboard-select { display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 1rem; background: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 0.875rem; font-family: 'Inter', sans-serif; cursor: pointer; white-space: nowrap; transition: border-color 0.2s; }
        .dashboard-select:hover { border-color: var(--outline); }
        .location-dropdown { position: absolute; top: calc(100% + 4px); left: 0; min-width: 180px; background: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; z-index: 100; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
        .location-option { width: 100%; background: transparent; border: none; padding: 0.65rem 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--on-surface); font-family: 'Inter', sans-serif; transition: background 0.15s; text-align: left; }
        .location-option:hover { background: var(--surface-container-high); }
        .location-option.selected { color: var(--primary); }
        .location-empty { display: block; padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--outline); font-family: 'Inter', sans-serif; }

        .count-badge { font-size: 0.75rem; color: var(--outline); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif; white-space: nowrap; }

        /* Metrics */
        .metric { display: flex; flex-direction: column; align-items: flex-end; }
        .metric-val { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 700; line-height: 1; color: var(--on-surface); }
        .metric-label { font-size: 0.65rem; color: var(--outline); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.25rem; }

        /* Action Pills moved to global style below */
        .empty-state { padding: 2rem; text-align: center; border: 1px dashed var(--outline-variant); border-radius: 0.5rem; color: var(--outline); font-family: 'Inter', sans-serif; background: var(--surface-container-low); }

        /* Modal */
        .ticket-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; position: relative; }
        label { font-size: 0.75rem; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.08em; font-family: 'Space Grotesk', sans-serif; font-weight: 700; }
        .modal-input, textarea { padding: 0.75rem 1rem; background-color: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 0.9rem; font-family: 'Inter', sans-serif; resize: vertical; transition: border-color 0.2s; outline: none; width: 100%; }
        .modal-input:focus, textarea:focus { border-color: var(--primary); }
        .event-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; z-index: 50; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
        .event-option { width: 100%; background: transparent; border: none; padding: 0.75rem 1rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.15rem; text-align: left; transition: background 0.15s; }
        .event-option:hover { background: var(--surface-container-high); }
        .event-name { font-size: 0.875rem; color: var(--on-surface); font-family: 'Inter', sans-serif; }
        .event-club { font-size: 0.75rem; color: var(--outline); font-family: 'Inter', sans-serif; }
        .selected-event-chip { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(171, 199, 255, 0.08); border: 1px solid var(--primary); border-radius: 0.5rem; font-size: 0.85rem; color: var(--primary); font-family: 'Inter', sans-serif; }
        .chip-clear { background: none; border: none; cursor: pointer; color: var(--outline); margin-left: auto; font-size: 0.75rem; padding: 0 0.25rem; }
        .chip-clear:hover { color: var(--on-surface); }
        .type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
        .type-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem 0.5rem; border-radius: 0.75rem; background: var(--surface-container); border: 1.5px solid var(--outline-variant); color: var(--on-surface-variant); font-size: 0.75rem; font-family: 'Space Grotesk', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .type-card:hover { border-color: var(--on-surface-variant); color: var(--on-surface); }
        .type-card.selected { border-color: var(--primary); background: rgba(171, 199, 255, 0.1); color: var(--primary); }
        .form-error { color: var(--error); font-size: 0.8rem; font-family: 'Inter', sans-serif; }
        .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 0.5rem; }
        .btn-secondary { padding: 0.625rem 1.25rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; background: transparent; border: 1px solid var(--outline-variant); color: var(--on-surface); transition: background 0.2s; }
        .btn-secondary:hover { background: var(--surface-container-highest); }
        .btn-primary { padding: 0.625rem 1.5rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; border: none; color: var(--on-primary-container) !important; }
        .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <style jsx global>{`
        /* Action Pills — perfectly mirroring inventory global styles */
        .action-pill {
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          height: 32px;
          max-height: 32px;
          gap: 0.375rem;
          padding: 0 0.875rem;
          border-radius: 0.375rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
          border: none;
          line-height: normal;
          overflow: hidden;
        }
        .action-pill:hover { opacity: 0.85; transform: translateY(-1px); }
        .pill-resolve {
          background-color: rgba(67, 143, 255, 0.15);
          color: #438fff;
          border: 1px solid rgba(67, 143, 255, 0.3);
        }
        .pill-reopen {
          background-color: rgba(46, 196, 182, 0.15);
          color: #2ec4b6;
          border: 1px solid rgba(46, 196, 182, 0.3);
        }
      `}</style>
    </Layout>
  );
}
