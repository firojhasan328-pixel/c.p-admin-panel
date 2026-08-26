import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function RecycleBin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recycle_bin')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Fetch recycle bin error:', error);
    }
    setLoading(false);
  };

  const handleRestore = async (id) => {
    try {
      await supabase.from('recycle_bin').update({ restored_at: new Date().toISOString() }).eq('id', id);
      fetchItems();
    } catch (error) {
      console.error('Restore error:', error);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (confirm('এটি স্থায়ীভাবে ডিলিট করতে চান? এটি পুনরুদ্ধার করা যাবে না!')) {
      try {
        await supabase.from('recycle_bin').delete().eq('id', id);
        fetchItems();
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🗑️ রিসাইকেল বিন</h2>
      <p style={styles.subtitle}>ডিলিট করা ডেটা এখানে সংরক্ষিত থাকে, পুনরুদ্ধার করুন</p>

      {loading ? (
        <p>⏳ লোড হচ্ছে...</p>
      ) : items.length === 0 ? (
        <p style={styles.emptyText}>রিসাইকেল বিন খালি</p>
      ) : (
        <div style={styles.list}>
          {items.map((item) => (
            <div key={item.id} style={styles.item}>
              <div style={styles.itemInfo}>
                <span style={styles.itemTable}>{item.original_table}</span>
                <span style={styles.itemId}>ID: {item.original_id}</span>
                <span style={styles.itemDate}>{new Date(item.deleted_at).toLocaleString('bn-BD')}</span>
                {item.restored_at && <span style={styles.restoredBadge}>✅ পুনরুদ্ধারকৃত</span>}
              </div>
              <div style={styles.itemActions}>
                {!item.restored_at && (
                  <button onClick={() => handleRestore(item.id)} style={styles.restoreBtn}>↩️ পুনরুদ্ধার</button>
                )}
                <button onClick={() => handlePermanentDelete(item.id)} style={styles.deleteBtn}>🗑️ স্থায়ী ডিলিট</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: '40px 0' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  item: { background: 'white', borderRadius: '10px', padding: '12px 16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
  itemInfo: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  itemTable: { fontWeight: '700', color: '#0f172a', background: '#dbeafe', padding: '2px 10px', borderRadius: '6px', fontSize: '12px' },
  itemId: { fontSize: '13px', color: '#64748b' },
  itemDate: { fontSize: '12px', color: '#94a3b8' },
  restoredBadge: { background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  itemActions: { display: 'flex', gap: '8px' },
  restoreBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  deleteBtn: { background: '#dc2626', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
};
