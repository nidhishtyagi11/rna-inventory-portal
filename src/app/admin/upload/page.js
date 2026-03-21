"use client";

import { useState } from 'react';
import Layout from '@/components/Layout';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// These are the exact column headers expected in the CSV.
// Quantities for each inventory item must be listed under the item's name.
const INVENTORY_ITEMS = [
  'Mattresses', 'Quilts', 'Tables', 'Tablecloths', 'Fans', 'Chairs',
  'Extension Boxes', 'LED Lights', 'Red Carpets', 'Green Carpets',
  'White Curtains', 'Coloured Curtains', 'Buckets', 'Mugs'
];

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const parseFile = (f) => {
    setFile(f);
    setFileName(f.name);
    setSuccess(false);
    setErrors([]);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setPreviewData(results.data);
        validateData(results.data);
      }
    });
  };

  const validateData = (rows) => {
    const errs = [];
    rows.forEach((row, i) => {
      if (!row['Club Name']) errs.push(`Row ${i + 2}: Missing "Club Name"`);
      if (!row['Event Name']) errs.push(`Row ${i + 2}: Missing "Event Name"`);
      if (!row['Location']) errs.push(`Row ${i + 2}: Missing "Location"`);
    });
    setErrors(errs);
  };

  const handleFileInput = (e) => {
    const f = e.target.files[0];
    if (f) parseFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) parseFile(f);
  };

  const processUpload = async () => {
    if (!previewData.length || errors.length) return;
    setLoading(true);

    try {
      // --- Step 1: Ensure all inventory stock items exist ---
      const stockRef = collection(db, 'inventoryStock');
      const stockSnap = await getDocs(stockRef);
      const existingStock = {};
      stockSnap.docs.forEach(d => { existingStock[d.data().itemName] = d.id; });

      for (const item of INVENTORY_ITEMS) {
        if (!existingStock[item]) {
          const newDoc = await addDoc(stockRef, {
            itemName: item,
            totalStock: 0,
            issuedStock: 0,
            returnedStock: 0
          });
          existingStock[item] = newDoc.id;
        }
      }

      // --- Step 2: Process each row into a Club + Event document ---
      const clubsRef = collection(db, 'clubs');
      const eventsRef = collection(db, 'events');

      // Cache clubs to avoid duplicates
      const clubCache = {};
      const clubsSnap = await getDocs(clubsRef);
      clubsSnap.docs.forEach(d => { clubCache[d.data().name] = d.id; });

      let eventsCreated = 0;

      for (const row of previewData) {
        if (!row['Event Name'] || !row['Club Name']) continue;

        // 2a. Create or reuse club
        let clubId = clubCache[row['Club Name']];
        if (!clubId) {
          const clubDoc = await addDoc(clubsRef, {
            name: row['Club Name'],
            coordinatorName: row['Coordinator Name'] || '',
            contact: row['Contact'] || '',
            email: row['Email'] || ''
          });
          clubId = clubDoc.id;
          clubCache[row['Club Name']] = clubId;
        }

        // 2b. Build inventoryRequests map from CSV columns
        const inventoryRequests = {};
        for (const item of INVENTORY_ITEMS) {
          const val = parseInt(row[item], 10);
          if (!isNaN(val) && val > 0) {
            inventoryRequests[item] = val;
          }
        }

        // 2c. Create event linked to club
        await addDoc(eventsRef, {
          clubId,
          clubName: row['Club Name'],
          coordinatorName: row['Coordinator Name'] || '',
          contact: row['Contact'] || '',
          eventName: row['Event Name'],
          location: row['Location'],
          specialRequirements: row['Special Requirements'] || '',
          notes: row['Notes'] || '',
          inventoryRequests,
          createdAt: new Date().toISOString()
        });

        eventsCreated++;
      }

      setSuccess(true);
      setPreviewData([]);
      setFile(null);
      setFileName('');
      alert(`✅ Successfully imported ${eventsCreated} events from CSV!`);
    } catch (err) {
      console.error("CSV upload error:", err);
      alert(`❌ Import failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout adminOnly={true}>
      <div className="page-header">
        <div>
          <h1 className="headline">Data Initialization</h1>
          <p className="subtitle">Import events and inventory requests via CSV</p>
        </div>
      </div>

      {/* Schema Reference */}
      <div className="schema-card glass-panel">
        <h3 className="schema-title">
          <span className="material-symbols-outlined">schema</span>
          Expected CSV Columns
        </h3>
        <div className="schema-grid">
          <div className="schema-group">
            <span className="schema-label">Required</span>
            {['Club Name', 'Event Name', 'Location'].map(col => (
              <span key={col} className="schema-tag required">{col}</span>
            ))}
          </div>
          <div className="schema-group">
            <span className="schema-label">Optional</span>
            {['Coordinator Name', 'Contact', 'Email', 'Special Requirements', 'Notes'].map(col => (
              <span key={col} className="schema-tag optional">{col}</span>
            ))}
          </div>
          <div className="schema-group">
            <span className="schema-label">Inventory Items (numeric)</span>
            {INVENTORY_ITEMS.map(item => (
              <span key={item} className="schema-tag item">{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone glass-panel ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <span className="material-symbols-outlined upload-icon">cloud_upload</span>
        <h3>{fileName || 'Drag & drop your CSV here'}</h3>
        <p>{fileName ? `${previewData.length} rows detected` : 'or click to browse your computer'}</p>
        <label className="browse-btn primary-gradient">
          Browse File
          <input type="file" accept=".csv" onChange={handleFileInput} hidden />
        </label>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="errors-panel">
          <h4>
            <span className="material-symbols-outlined">error</span>
            {errors.length} Validation {errors.length === 1 ? 'Error' : 'Errors'}
          </h4>
          <ul>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      {previewData.length > 0 && (
        <div className="preview-panel">
          <div className="preview-header">
            <h3 className="headline" style={{fontSize: '1.125rem'}}>
              Preview — {previewData.length} Records
            </h3>
            <button
              className="primary-gradient confirm-btn"
              onClick={processUpload}
              disabled={loading || errors.length > 0}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined spin">progress_activity</span>
                  Importing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">cloud_sync</span>
                  Confirm & Sync to Firestore
                </>
              )}
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Club Name</th>
                  <th>Event Name</th>
                  <th>Location</th>
                  <th>Special Req</th>
                  <th>Items Requested</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 20).map((row, idx) => {
                  const numItems = INVENTORY_ITEMS.reduce((sum, item) => {
                    const v = parseInt(row[item], 10);
                    return sum + (isNaN(v) || v <= 0 ? 0 : 1);
                  }, 0);
                  const hasError = !row['Club Name'] || !row['Event Name'] || !row['Location'];
                  return (
                    <tr key={idx} className={hasError ? 'row-error' : ''}>
                      <td className="row-num">{idx + 1}</td>
                      <td>{row['Club Name'] || <span className="missing">—</span>}</td>
                      <td>{row['Event Name'] || <span className="missing">—</span>}</td>
                      <td>{row['Location'] || <span className="missing">—</span>}</td>
                      <td>
                        <span className={`req-badge ${row['Special Requirements'] && row['Special Requirements'].trim() !== '' && row['Special Requirements'].trim().toLowerCase() !== 'no' ? 'yes' : 'no'}`}>
                          {row['Special Requirements'] && row['Special Requirements'].trim() !== '' && row['Special Requirements'].trim().toLowerCase() !== 'no' 
                            ? (row['Special Requirements'].length > 20 ? row['Special Requirements'].substring(0, 20) + '...' : row['Special Requirements'])
                            : 'None'}
                        </span>
                      </td>
                      <td className="items-count">{numItems} item types</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {previewData.length > 20 && (
              <p className="more-rows">+ {previewData.length - 20} more rows not shown in preview</p>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="success-banner">
          <span className="material-symbols-outlined">check_circle</span>
          Import complete! Head to the <a href="/admin/dashboard">Dashboard</a> to see your data.
        </div>
      )}

      <style jsx>{`
        .page-header { margin-bottom: 2rem; }
        .subtitle { color: var(--on-surface-variant); font-size: 0.875rem; margin-top: 0.25rem; }

        /* Schema */
        .schema-card {
          padding: 1.25rem 1.5rem;
          border-radius: 0.75rem;
          border: 1px solid var(--surface-container-high);
          margin-bottom: 1.5rem;
        }
        .schema-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--on-surface);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .schema-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .schema-group { display: flex; flex-wrap: wrap; gap: 0.375rem; align-items: center; }
        .schema-label { font-size: 0.65rem; color: var(--outline); text-transform: uppercase; letter-spacing: 0.1em; margin-right: 0.25rem; min-width: 100px; }
        .schema-tag { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-family: 'Space Grotesk', monospace; }
        .schema-tag.required { background: rgba(242,139,130,0.12); color: #f28b82; border: 1px solid rgba(242,139,130,0.2); }
        .schema-tag.optional { background: rgba(255,255,255,0.05); color: var(--outline); border: 1px solid var(--surface-container-high); }
        .schema-tag.item { background: rgba(171,199,255,0.08); color: var(--primary); border: 1px solid rgba(171,199,255,0.15); }

        /* Upload zone */
        .upload-zone {
          padding: 3rem;
          border-radius: 1rem;
          border: 2px dashed var(--outline-variant);
          text-align: center;
          margin-bottom: 1.5rem;
          transition: border-color 0.2s, background 0.2s;
          cursor: default;
        }
        .upload-zone.dragging {
          border-color: var(--primary);
          background: rgba(171,199,255,0.05);
        }
        .upload-icon { font-size: 3rem; color: var(--primary); opacity: 0.8; margin-bottom: 0.75rem; }
        .upload-zone h3 { font-size: 1rem; color: var(--on-surface); margin-bottom: 0.5rem; }
        .upload-zone p { font-size: 0.875rem; color: var(--on-surface-variant); margin-bottom: 1.5rem; }
        .browse-btn {
          display: inline-block;
          padding: 0.625rem 1.5rem;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
        }

        /* Errors */
        .errors-panel {
          background: rgba(242,139,130,0.08);
          border: 1px solid rgba(242,139,130,0.2);
          border-radius: 0.5rem;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          color: #f28b82;
        }
        .errors-panel h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        .errors-panel ul { font-size: 0.8125rem; padding-left: 1.25rem; }
        .errors-panel li { margin-bottom: 0.25rem; }

        /* Preview */
        .preview-panel {
          background: var(--surface-container-low);
          border: 1px solid var(--surface-container-high);
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--surface-container);
        }
        .confirm-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          border: none;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: opacity 0.2s;
        }
        .confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        th { padding: 0.75rem 1rem; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--outline); background: var(--surface-container); text-align: left; }
        td { padding: 0.75rem 1rem; color: var(--on-surface); border-bottom: 1px solid var(--surface-container); }
        tr.row-error td { background: rgba(242,139,130,0.05); }
        .row-num { color: var(--outline); font-size: 0.75rem; font-family: monospace; }
        .missing { color: var(--error, #f28b82); }
        .items-count { color: var(--primary); font-family: 'Space Grotesk', sans-serif; }
        .req-badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 0.25rem; }
        .req-badge.yes { background: rgba(242,139,130,0.12); color: #f28b82; }
        .req-badge.no { background: var(--surface-container); color: var(--outline); }
        .more-rows { text-align: center; padding: 1rem; font-size: 0.8125rem; color: var(--outline); font-style: italic; }

        /* Success */
        .success-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: rgba(100,220,140,0.08);
          border: 1px solid rgba(100,220,140,0.2);
          border-radius: 0.5rem;
          color: #64dc8c;
          font-size: 0.875rem;
        }
        .success-banner a { color: var(--primary); text-decoration: underline; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </Layout>
  );
}
