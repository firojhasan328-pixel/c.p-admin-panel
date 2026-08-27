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
  const [step, setStep] = useState(1); // 1 = রোল সিলেক্ট, 2 = পারমিশন
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [teacherPermissions, setTeacherPermissions] = useState({});

  // রোল অপশন
  const ROLES = [
    { 
      id: 'teacher', 
      label: '👨‍🏫 সাধারণ শিক্ষক', 
      desc: 'শুধু দেখার অনুমতি',
      icon: '👨‍🏫'
    },
    { 
      id: 'admin', 
      label: '🔹 সাব-অ্যাডমিন', 
      desc: 'শিক্ষক + মডারেশন পারমিশন',
      icon: '🔹'
    },
    { 
      id: 'super_admin', 
      label: '⭐ সুপার অ্যাডমিন', 
      desc: 'সবকিছুর সম্পূর্ণ অনুমতি',
      icon: '⭐'
    },
  ];

  // মডাল খোলার সময় রিসেট করুন
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedRole('');
      setSelectedPermissions({});
      setError('');
      loadTeacherPermissions();
    }
  }, [isOpen]);

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
      
      // শিক্ষকের বর্তমান রোল সেট করুন
      if (teacher.role) {
        setSelectedRole(teacher.role);
        // রোল অনুযায়ী পারমিশন প্রিসেট করুন
        if (teacher.role === 'super_admin') {
          const allTrue = {};
          ALL_PERMISSIONS.forEach(p => {
            allTrue[p.key] = true;
          });
          setSelectedPermissions(allTrue);
        } else if (teacher.role === 'admin') {
          // সাব-অ্যাডমিনের জন্য কিছু ডিফল্ট পারমিশন
          const defaultPerms = {};
          ALL_PERMISSIONS.forEach(p => {
            defaultPerms[p.key] = permMap[p.key] || false;
          });
          setSelectedPermissions(defaultPerms);
        } else {
          // সাধারণ শিক্ষক
          const defaultPerms = {};
          ALL_PERMISSIONS.forEach(p => {
            defaultPerms[p.key] = permMap[p.key] || false;
          });
          setSelectedPermissions(defaultPerms);
        }
      }
    } catch (error) {
      console.error('Load teacher permissions error:', error);
    }
    setLoading(false);
  };

  // রোল সিলেক্ট করলে ডিফল্ট পারমিশন সেট করুন
  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setError('');
    
    // রোল অনুযায়ী ডিফল্ট পারমিশন সেট করুন
    const defaultPerms = {};
    ALL_PERMISSIONS.forEach(p => {
      if (roleId === 'super_admin') {
        defaultPerms[p.key] = true; // সব অন
      } else if (roleId === 'admin') {
        // সাব-অ্যাডমিনের জন্য কিছু ডিফল্ট
        const adminDefaults = [
          'view_dashboard', 'edit_homepage', 'manage_teachers', 
          'manage_students', 'manage_notices', 'manage_gallery'
        ];
        defaultPerms[p.key] = adminDefaults.includes(p.key);
      } else {
        // সাধারণ শিক্ষক - শুধু ড্যাশবোর্ড
        defaultPerms[p.key] = p.key === 'view_dashboard';
      }
    });
    setSelectedPermissions(defaultPerms);
  };

  // পরবর্তী স্টেপে যান
  const handleNext = () => {
    if (!selectedRole) {
      setError('দয়া করে একটি রোল সিলেক্ট করুন');
      return;
    }
    setStep(2);
  };

  // পারমিশন চেঞ্জ
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

  // সংরক্ষণ করুন
  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      // ১. শিক্ষকের রোল আপডেট করুন
      const { error: roleError } = await supabase
        .from('admin_users')
        .update({ role: selectedRole })
        .eq('id', teacher.id);

      if (roleError) throw roleError;

      // ২. সব পারমিশন আপডেট করুন
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

  // ফিরে যান (স্টেপ ১)
  const handleBack = () => {
    setStep(1);
    setError('');
  };

  if (!isOpen) return null;

  // পারমিশন গ্রুপ ক্যাটাগরি অনুযায়ী
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
          <h3 style={styles.title}>
            {step === 1 ? '🔐 রোল সিলেক্ট করুন' : `🔐 ${teacher?.name} - পারমিশন`}
          </h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.subHeader}>
          <span style={styles.email}>📧 {teacher?.email}</span>
          {step === 2 && (
            <span style={{
              ...styles.roleBadge,
              background: selectedRole === 'super_admin' ? '#dcfce7' : 
                         selectedRole === 'admin' ? '#dbeafe' : '#f1f5f9',
              color: selectedRole === 'super_admin' ? '#16a34a' : 
                     selectedRole === 'admin' ? '#2563eb' : '#64748b',
            }}>
              {selectedRole === 'super_admin' ? '⭐ সুপার অ্যাডমিন' : 
               selectedRole === 'admin' ? '🔹 সাব-অ্যাডমিন' : '👨‍🏫 সাধারণ শিক্ষক'}
            </span>
          )}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>⏳ লোড হচ্ছে...</div>
        ) : (
          <>
            {/* স্টেপ ১: রোল সিলেক্ট */}
            {step === 1 && (
              <div style={styles.step1Container}>
                <p style={styles.step1Hint}>
                  এই শিক্ষককে কী ধরনের অ্যাক্সেস দিতে চান?
                </p>
                <div style={styles.roleList}>
                  {ROLES.map((role) => (
                    <div
                      key={role.id}
                      style={{
                        ...styles.roleCard,
                        ...(selectedRole === role.id ? styles.roleCardActive : {}),
                      }}
                      onClick={() => handleRoleSelect(role.id)}
                    >
                      <div style={styles.roleCardLeft}>
                        <span style={styles.roleIcon}>{role.icon}</span>
                        <div>
                          <div style={styles.roleLabel}>{role.label}</div>
                          <div style={styles.roleDesc}>{role.desc}</div>
                        </div>
                      </div>
                      {selectedRole === role.id && (
                        <span style={styles.roleCheck}>✅</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* স্টেপ ২: পারমিশন কনফিগার */}
            {step === 2 && (
              <div style={styles.permissionsList}>
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} style={styles.categoryGroup}>
                    <h4 style={styles.categoryTitle}>{category}</h4>
                    {perms.map((perm) => {
                      const isChecked = selectedPermissions[perm.key] || false;
                      const canChange = canGrantPermission(perm.key) || selectedRole === 'super_admin';
                      
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
                            disabled={!canChange || selectedRole === 'super_admin'}
                            style={styles.checkbox}
                          />
                          <span style={styles.permissionLabel}>{perm.label}</span>
                          {!canChange && selectedRole !== 'super_admin' && (
                            <span style={styles.lockedIcon}>🔒</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>
            {step === 1 ? '❌ বাতিল' : '✕ বন্ধ করুন'}
          </button>
          
          {step === 1 ? (
            <button
              onClick={handleNext}
              disabled={!selectedRole || loading}
              style={{
                ...styles.nextBtn,
                opacity: (!selectedRole || loading) ? 0.5 : 1,
              }}
            >
              পরবর্তী →
            </button>
          ) : (
            <>
              <button onClick={handleBack} style={styles.backBtn}>
                ← আগের ধাপ
              </button>
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
            </>
          )}
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
  step1Container: {
    padding: '20px 24px',
  },
  step1Hint: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  roleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  roleCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  roleCardActive: {
    borderColor: '#16a34a',
    background: '#f0fdf4',
  },
  roleCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  roleIcon: {
    fontSize: '28px',
  },
  roleLabel: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#0f172a',
  },
  roleDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  roleCheck: {
    fontSize: '18px',
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
  nextBtn: {
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
  backBtn: {
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
