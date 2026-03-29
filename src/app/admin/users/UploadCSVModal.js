"use client";

import { useState } from 'react';
import Modal from '@/components/Modal';
import { addAdmin } from '@/lib/firestore';

export default function UploadCSVModal({ isOpen, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;

    setLoading(true);
    setResults(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Assume first line might be header "Email"
      const startIndex = lines[0].toLowerCase() === 'email' ? 1 : 0;
      
      let successCount = 0;
      let skippedCount = 0;

      for (let i = startIndex; i < lines.length; i++) {
        const email = lines[i].toLowerCase();
        if (email.includes('@')) {
          await addAdmin(email, {
            role: 'admin',
            isOnline: false,
            addedAt: new Date().toISOString()
          });
          successCount++;
        } else {
          skippedCount++;
        }
      }

      setLoading(false);
      setResults({ success: successCount, skipped: skippedCount });
      onUploadComplete();
    };

    reader.onerror = () => {
      console.error("File reading error");
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Batch Upload Admins">
       <div className="modal-content">
         <p className="help-text">
           Upload a standard CSV file. The file should have a single column containing the email addresses of the new admins.
         </p>

         {results ? (
           <div className="results-panel">
             <span className="material-symbols-outlined success-icon">check_circle</span>
             <h3>Upload Complete</h3>
             <p>{results.success} admins successfully added.</p>
             {results.skipped > 0 && <p className="error-text">{results.skipped} rows skipped (invalid formatting).</p>}
             
             <div className="form-actions" style={{marginTop: '1.5rem'}}>
               <button onClick={handleClose} className="btn-primary primary-gradient">Done</button>
             </div>
           </div>
         ) : (
           <>
             <div className="file-drop-area">
               <input 
                 type="file" 
                 accept=".csv" 
                 id="csv-upload" 
                 onChange={handleFileChange}
                 className="file-input"
               />
               <label htmlFor="csv-upload" className="file-label">
                 <span className="material-symbols-outlined upload-icon">cloud_upload</span>
                 <span className="label-text">
                   {file ? file.name : "Click to select or drag and drop a CSV file"}
                 </span>
               </label>
             </div>

             <div className="form-actions">
               <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>Cancel</button>
               <button 
                 type="button" 
                 className="btn-primary primary-gradient" 
                 onClick={handleUpload} 
                 disabled={!file || loading}
               >
                 {loading ? 'Processing...' : 'Upload CSV'}
               </button>
             </div>
           </>
         )}
       </div>

       <style jsx>{`
         .modal-content { display: flex; flex-direction: column; gap: 1.5rem; }
         .help-text { color: var(--on-surface-variant); font-size: 0.875rem; line-height: 1.5; margin: 0; }
         
         .file-drop-area {
           position: relative;
           background: var(--surface-container-low);
           border: 2px dashed var(--outline-variant);
           border-radius: 0.75rem;
           padding: 2rem;
           text-align: center;
           transition: border-color 0.2s;
         }
         .file-drop-area:hover { border-color: var(--primary); }
         .file-input {
           position: absolute; top: 0; left: 0; width: 100%; height: 100%;
           opacity: 0; cursor: pointer;
         }
         .file-label {
           display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
           pointer-events: none;
         }
         .upload-icon { font-size: 3rem; color: var(--primary); opacity: 0.8; }
         .label-text { font-family: 'Space Grotesk', sans-serif; color: var(--on-surface); font-weight: 500; font-size: 0.9rem; }
         
         .results-panel {
           display: flex; flex-direction: column; align-items: center; text-align: center;
           padding: 2rem; background: var(--surface-container-low); border-radius: 0.75rem;
         }
         .success-icon { font-size: 4rem; color: var(--success, #64dc8c); margin-bottom: 1rem; }
         .results-panel h3 { font-size: 1.25rem; color: var(--on-surface); margin-bottom: 0.5rem; font-family: 'Space Grotesk', sans-serif; }
         .results-panel p { color: var(--outline); font-size: 0.875rem; margin-bottom: 0.25rem; }
         .error-text { color: var(--warning, #ffca28) !important; font-weight: 500; }

         .form-actions { display: flex; justify-content: flex-end; gap: 1rem; width: 100%; }
         button { padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
         .btn-secondary { background: transparent; border: 1px solid var(--outline); color: var(--outline); }
         .btn-secondary:hover { background: var(--surface-container-highest); color: var(--on-surface); }
         .btn-primary { border: none; }
         .primary-gradient { background: #abc7fb; color: #040616 !important; }
         .btn-primary:active { transform: translateY(1px); }
         .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
       `}</style>
    </Modal>
  );
}
