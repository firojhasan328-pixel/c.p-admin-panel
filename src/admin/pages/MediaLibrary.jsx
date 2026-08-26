import React, { useState } from 'react';

export default function MediaLibrary() {
  const [files, setFiles] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFiles([...files, { name: file.name, url, type: file.type }]);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📁 মিডিয়া লাইব্রেরি</h2>
      <p style={styles.subtitle}>ছবি, ভিডিও ও অন্যান্য ফাইল আপলোড করুন</p>

      <div style={styles.uploadArea}>
        <input
          type="file"
          accept="image/*,video/*,application/pdf"
          onChange={handleFileUpload}
          style={styles.fileInput}
        />
        <span style={styles.uploadText}>📤 ফাইল আপলোড করুন</span>
        <span style={styles.uploadHint}>JPG, PNG, MP4, PDF (max 5MB)</span>
      </div>

      <div style={styles.grid}>
        {files.length === 0 ? (
          <p style={styles.emptyText}>কোনো ফাইল আপলোড করা হয়নি</p>
        ) : (
          files.map((file, i) => (
            <div key={i} style={styles.fileCard}>
              {file.type.startsWith('image/') ? (
                <img src={file.url} alt={file.name} style={styles.thumb} />
              ) : (
                <div style={styles.fileIcon}>📄</div>
              )}
              <p style={styles.fileName}>{file.name}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  uploadArea: { border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', position: 'relative', backgroundColor: '#f8fafc', marginBottom: '20px' },
  fileInput: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  uploadText: { fontSize: '16px', fontWeight: '600', color: '#0f172a', display: 'block' },
  uploadHint: { fontSize: '12px', color: '#94a3b8' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' },
  fileCard: { background: 'white', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid #e2e8f0' },
  thumb: { width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px' },
  fileIcon: { fontSize: '40px', padding: '20px 0' },
  fileName: { fontSize: '12px', color: '#64748b', margin: '8px 0 0 0', wordBreak: 'break-all' },
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: '40px 0' },
};
