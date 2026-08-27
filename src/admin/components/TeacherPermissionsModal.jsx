import React, { useState, useEffect } from 'react';
import { usePermissions, ALL_PERMISSIONS } from '../../hooks/usePermissions';
import { supabase } from '../../supabaseClient';

export default function TeacherPermissionsModal({ 
  teacher, 
  isOpen, 
  onClose, 
  onSuccess 
}) {
  const { permissions, loadPermissions, updatePermission, canGrantPermission } = usePermissions();
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [teacherPermissions, setTeacherPermissions] = useState({});

  // শিক্ষকের পারমিশন লোড করুন
  useEffect(() => {
    if (isOpen && teacher) {
      loadTeacherPermissions();
    }
  }, [isOpen, teacher]);

  const loadTeacherPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teacher_permissions')
        .select('*')
        .eq('teacher_id', teacher.id);

      if (error) throw error;

      const permMap = {};
      data.forEach(item => {
        permMap[item.permission_key] = item.is_allowed;
      });
      setTeacherPermissions(permMap);
      
      // সুপার অ্যাডমিন চেক
      if (teacher.role === 'super_admin') {
        const allTrue = {};
        ALL_PERMISSIONS.forEach(p => {
          allTrue[p.key] = true;
        });
        setSelectedPermissions(allTrue);
      } else {
        setSelectedPermissions({ ...permMap });
      }
    } catch (error) {
      console.error('Load teacher permissions error:', error);
    }
    setLoading(false);
  };

  const handlePermissionChange = (permissionKey, isAllowed) => {
    // চেক করুন এই পারমিশন দেওয়ার অনুমতি আছে কিনা
    if (!canGrantPermission(permissionKey)) {
      setError('আপনার এই পারমিশন দেওয়ার অনুমতি নেই');
      return;
    }
    setSelectedPermissions({
      ...selectedPermissions,
      [permissionKey]: isAllowed,
    });
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      // সব পারমিশন আপডেট করুন
      for (const [key, value] of Object.entries(selectedPermissions)) {
        const result = await updatePermission(teacher.id, key, value);
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      setError(error.message || 'সংরক্ষণ করতে সমস্যা হয়েছে');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  // গ্রুপ পারমিশন ক্যাটাগরি অনুযায়ী
  const groupedPermissions = {};
  ALL_PERMISSIONS.forEach(p => {
    if (!groupedPermissions[p.category]) {
      groupedPermissions[p.category] = [];
    }
    groupedPermissions[p.category].push(p);
  });

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>🔐 {teacher?.name} - পারমিশন</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.subHeader}>
          <span style={styles.email}>📧 {teacher?.email}</span>
          <span style={{
            ...styles.roleBadge,
            background: teacher?.role === 'super_admin' ? '#dcfce7' : '#dbeafe',
            color: teacher?.role === 'super_admin' ? '#16a34a' : '#2563eb',
          }}>
            {teacher?.role === 'super_admin' ? '⭐ সুপার অ্যাডমিন' : 
             teacher?.role === 'admin' ? '🔹 অ্যাডমিন' : '👨‍🏫 শিক্ষক'}
          </span>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>⏳ লোড হচ্ছে...</div>
        ) : (
          <div style={styles.permissionsList}>
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <div key={category} style={styles.categoryGroup}>
                <h4 style={styles.categoryTitle}>{category}</h4>
                {perms.map((perm) => {
                  const isChecked = selectedPermissions[perm.key] || false;
                  const canChange = canGrantPermission(perm.key) || teacher?.role === 'super_admin';
                  
                  return (
                    <label key={perm.key} style={{
                      ...styles.permissionItem,
                      opacity: canChange ? 1 : 0.5,
                      cursor: canChange ? 'pointer' : 'not-allowed',
                    }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handlePermissionChange(perm.key, e.target.checked)}
                        disabled={!canChange || teacher?.role === 'super_admin'}
                        style={styles.checkbox}
                      />
                      <span style={styles.permissionLabel}>{perm.label}</span>
                      {!canChange && teacher?.role !== 'super_admin' && (
                        <span style={styles.lockedIcon}>🔒</span>
                      )}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>❌ বাতিল</button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              ...styles.saveBtn,
              opacity: (saving || loading) ? 0.6 : 1,
            }}
          >
            {saving ? '⏳ সংরক্ষণ...' : '💾 সংরক্ষণ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    animation: 'fadeIn 0.3s ease',
  },
  modal: {
    background: 'white',
    borderRadius: '20px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.3s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  subHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    gap: '8px',
  },
  email: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  roleBadge: {
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  errorBox: {
    margin: '12px 24px 0 24px',
    background: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    borderLeft: '4px solid #dc2626',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#94a3b8',
    fontSize: '16px',
  },
  permissionsList: {
    padding: '16px 24px',
    overflowY: 'auto',
    flex: 1,
  },
  categoryGroup: {
    marginBottom: '16px',
  },
  categoryTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
    paddingBottom: '4px',
    borderBottom: '1px solid #f1f5f9',
  },
  permissionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 8px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#16a34a',
  },
  permissionLabel: {
    fontSize: '14px',
    color: '#0f172a',
    fontWeight: '500',
  },
  lockedIcon: {
    fontSize: '14px',
    color: '#94a3b8',
    marginLeft: 'auto',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
  },
  cancelBtn: {
    background: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
  },
};

// অ্যানিমেশন inject
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
document.head.appendChild(styleSheet);
