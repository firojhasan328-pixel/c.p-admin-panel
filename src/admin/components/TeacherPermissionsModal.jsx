import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';
import {
  usePermissions,
  ALL_PERMISSIONS,
  ROLE_BADGES,
} from '../../hooks/usePermissions';

export default function TeacherPermissionsModal({
  teacher,
  isOpen,
  onClose,
  onSuccess,
}) {
  const { adminUser, getAssignableRoles } = useAdmin();
  const { canGrantPermission, getAvailablePermissionsToGrant } = usePermissions();

  const [step, setStep] = useState(1); // 1 = role, 2 = permissions
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ============================================
  // সব রোল অপশন
  // ============================================
  const ALL_ROLES = [
    {
      id: 'super_admin',
      label: '⭐ সুপার অ্যাডমিন',
      desc: 'সম্পূর্ণ CMS নিয়ন্ত্রণ',
      icon: '⭐',
    },
    {
      id: 'admin',
      label: '🔹 অ্যাডমিন',
      desc: 'সীমিত প্রাধান্য নিয়ন্ত্রণ',
      icon: '🔹',
    },
    {
      id: 'sub_admin',
      label: '🔷 সাব-অ্যাডমিন',
      desc: 'আরো সীমিত নিয়ন্ত্রণ',
      icon: '🔷',
    },
    {
      id: 'teacher',
      label: '👨‍🏫 শিক্ষক',
      desc: 'মৌলিক অ্যাক্সেস',
      icon: '👨‍🏫',
    },
  ];

  const assignableRoleIds = getAssignableRoles();
  const availableRoles = ALL_ROLES.filter((r) =>
    assignableRoleIds.includes(r.id)
  );

  // ============================================
  // Modal খুললে ডেটা লোড
  // ============================================
  useEffect(() => {
    if (isOpen && teacher) {
      setStep(1);
      setError('');
      setSuccessMessage('');
      setSelectedRole('');
      setSelectedPermissions({});
      loadTeacherData();
    }
  }, [isOpen, teacher]);

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      // ১. teacher_permissions লোড
      const { data: permData } = await supabase
        .from('teacher_permissions')
        .select('*')
        .eq('teacher_email', teacher.email);

      // ২. admin_users থেকে বর্তমান রোল লোড
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('role')
        .eq('email', teacher.email)
        .maybeSingle();

      const currentRole = adminData?.role || '';

      // ৩. পারমিশন ম্যাপ
      const permMap = {};
      (permData || []).forEach((item) => {
        permMap[item.permission_key] = item.is_allowed;
      });

      // ৪. রোল সেট
      if (currentRole && assignableRoleIds.includes(currentRole)) {
        setSelectedRole(currentRole);
      }

      setSelectedPermissions(permMap);
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  };

  // ============================================
  // স্টেপ ১ → ২
  // ============================================
  const handleNext = () => {
    if (!selectedRole) {
      setError('দয়া করে একটি রোল সিলেক্ট করুন');
      return;
    }
    setError('');
    setStep(2);
  };

  // ============================================
  // রোল সিলেক্ট
  // ============================================
  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setError('');

    const grantablePerms = getAvailablePermissionsToGrant().map((p) => p.key);

    const defaultPerms = {};
    ALL_PERMISSIONS.forEach((p) => {
      if (!grantablePerms.includes(p.key)) {
        defaultPerms[p.key] = false;
        return;
      }

      if (roleId === 'super_admin') {
        defaultPerms[p.key] = true;
      } else if (roleId === 'admin') {
        const adminDefaults = [
          'view_dashboard',
          'edit_homepage',
          'manage_teachers',
          'manage_students',
          'manage_notices',
          'manage_gallery',
        ];
        defaultPerms[p.key] = adminDefaults.includes(p.key);
      } else if (roleId === 'sub_admin') {
        const subAdminDefaults = [
          'view_dashboard',
          'manage_students',
          'manage_notices',
        ];
        defaultPerms[p.key] = subAdminDefaults.includes(p.key);
      } else {
        defaultPerms[p.key] = p.key === 'view_dashboard';
      }
    });

    setSelectedPermissions(defaultPerms);
  };

  // ============================================
  // পারমিশন টগল
  // ============================================
  const handlePermissionChange = (permissionKey, isAllowed) => {
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

  const handleToggleAll = (category, isChecked) => {
    const grantablePerms = getAvailablePermissionsToGrant().map((p) => p.key);
    const categoryPerms = ALL_PERMISSIONS.filter(
      (p) => p.category === category && grantablePerms.includes(p.key)
    );

    const newPerms = { ...selectedPermissions };
    categoryPerms.forEach((p) => {
      newPerms[p.key] = isChecked;
    });
    setSelectedPermissions(newPerms);
  };

  // ============================================
  // ✅ সংরক্ষণ — সরাসরি DB-তে
  // ============================================
  const handleSave = async () => {
    if (!selectedRole) {
      setError('দয়া করে একটি রোল সিলেক্ট করুন');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const normalizedEmail = teacher.email.toLowerCase().trim();

      // ============================================
      // ১. admin_users টেবিলে রোল আপডেট/ইনসার্ট
      // ============================================
      const { error: adminError } = await supabase
        .from('admin_users')
        .upsert(
          {
            email: normalizedEmail,
            name: teacher.name || 'শিক্ষক',
            role: selectedRole,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );

      if (adminError) {
        console.warn('admin_users upsert warning:', adminError.message);
      }

      // ============================================
      // ২. teacher_permissions সেভ
      // ============================================
      // পুরোনো পারমিশন মুছে ফেলি
      await supabase
        .from('teacher_permissions')
        .delete()
        .eq('teacher_email', normalizedEmail);

      // নতুন পারমিশন যোগ করি
      const permRows = Object.entries(selectedPermissions)
        .filter(([_, value]) => value === true)
        .map(([key]) => ({
          teacher_email: normalizedEmail,
          permission_key: key,
          is_allowed: true,
          granted_by: null,
        }));

      if (permRows.length > 0) {
        const { error: permError } = await supabase
          .from('teacher_permissions')
          .insert(permRows);

        if (permError) {
          throw new Error('পারমিশন সেভ সমস্যা: ' + permError.message);
        }
      }

      // ============================================
      // ৩. লগ তৈরি
      // ============================================
      try {
        await supabase.from('admin_registration_logs').insert([
          {
            admin_user_id: null,
            email: normalizedEmail,
            name: teacher.name || 'শিক্ষক',
            role: selectedRole,
            assigned_by_email: adminUser?.email || 'system',
            assigned_by_role: adminUser?.role || 'system',
            assigned_permissions: selectedPermissions || {},
          },
        ]);
      } catch (logErr) {
        console.warn('Log insert warning:', logErr);
      }

      // ============================================
      // ✅ সফল
      // ============================================
      setSuccessMessage(
        `✅ ${teacher.name}-কে ${ROLE_BADGES[selectedRole]?.label || selectedRole} হিসাবে সেট করা হয়েছে!\n\n` +
          `📌 এখন থেকে তিনি তার নিজের ইমেইল (${normalizedEmail}) ও পাসওয়ার্ড দিয়ে অ্যাডমিন প্যানেলে লগইন করতে পারবেন।`
      );

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 3500);
    } catch (err) {
      console.error('❌ Save error:', err);
      setError('❌ ' + (err.message || 'সংরক্ষণ করতে সমস্যা হয়েছে'));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setError('');
    }
  };

  const handleClose = () => {
    if (saving || loading) return;
    onClose();
  };

  if (!isOpen || !teacher) return null;

  // ============================================
  // পারমিশন গ্রুপ
  // ============================================
  const grantablePermissionKeys = getAvailablePermissionsToGrant().map(
    (p) => p.key
  );

  const groupedPermissions = {};
  ALL_PERMISSIONS.forEach((p) => {
    if (!groupedPermissions[p.category]) {
      groupedPermissions[p.category] = [];
    }
    groupedPermissions[p.category].push(p);
  });

  return (
    <>
      <div style={styles.overlay} onClick={handleClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* সফল অবস্থা */}
          {successMessage ? (
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>🎉</div>
              <h2 style={styles.successTitle}>সফলভাবে সংরক্ষণ হয়েছে!</h2>
              <pre style={styles.successText}>{successMessage}</pre>
              <p style={styles.successFooter}>
                ⏳ পপআপ স্বয়ংক্রিয়ভাবে বন্ধ হবে...
              </p>
            </div>
          ) : (
            <>
              {/* হেডার */}
              <div style={styles.header}>
                <h3 style={styles.title}>
                  {step === 1 && '🔐 রোল সিলেক্ট করুন'}
                  {step === 2 && `🔐 ${teacher?.name} - পারমিশন`}
                </h3>
                <button onClick={handleClose} style={styles.closeBtn}>
                  ✕
                </button>
              </div>

              {/* সাব-হেডার */}
              <div style={styles.subHeader}>
                <span style={styles.email}>📧 {teacher?.email}</span>
                {selectedRole && (
                  <span
                    style={{
                      ...styles.roleBadge,
                      background: ROLE_BADGES[selectedRole]?.bg || '#f1f5f9',
                      color: ROLE_BADGES[selectedRole]?.color || '#64748b',
                    }}
                  >
                    {ROLE_BADGES[selectedRole]?.label || selectedRole}
                  </span>
                )}
              </div>

              {/* স্টেপ ইন্ডিকেটর */}
              <div style={styles.stepIndicator}>
                <div
                  style={{
                    ...styles.stepDot,
                    background: step >= 1 ? '#16a34a' : '#e2e8f0',
                  }}
                >
                  1
                </div>
                <div
                  style={{
                    ...styles.stepLine,
                    background: step >= 2 ? '#16a34a' : '#e2e8f0',
                  }}
                />
                <div
                  style={{
                    ...styles.stepDot,
                    background: step >= 2 ? '#16a34a' : '#e2e8f0',
                  }}
                >
                  2
                </div>
              </div>

              {error && <div style={styles.errorBox}>{error}</div>}

              {loading ? (
                <div style={styles.loading}>⏳ লোড হচ্ছে...</div>
              ) : (
                <>
                  {/* ============================================
                      স্টেপ ১: রোল সিলেক্ট
                      ============================================ */}
                  {step === 1 && (
                    <div style={styles.step1Container}>
                      <p style={styles.step1Hint}>
                        এই শিক্ষককে কী ধরনের অ্যাক্সেস দিতে চান?
                      </p>

                      {availableRoles.length === 0 ? (
                        <div style={styles.noRolesBox}>
                          ⚠️ আপনার এই মুহূর্তে কোনো রোল দেওয়ার অনুমতি নেই।
                        </div>
                      ) : (
                        <div style={styles.roleList}>
                          {availableRoles.map((role) => (
                            <div
                              key={role.id}
                              style={{
                                ...styles.roleCard,
                                ...(selectedRole === role.id
                                  ? styles.roleCardActive
                                  : {}),
                              }}
                              onClick={() => handleRoleSelect(role.id)}
                            >
                              <div style={styles.roleCardLeft}>
                                <span style={styles.roleIcon}>{role.icon}</span>
                                <div>
                                  <div style={styles.roleLabel}>
                                    {role.label}
                                  </div>
                                  <div style={styles.roleDesc}>
                                    {role.desc}
                                  </div>
                                </div>
                              </div>
                              {selectedRole === role.id && (
                                <span style={styles.roleCheck}>✅</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={styles.infoNote}>
                        💡 শিক্ষক তার নিজের ইমেইল ও পাসওয়ার্ড দিয়েই অ্যাডমিন
                        প্যানেলে লগইন করতে পারবেন — নতুন পাসওয়ার্ড সেট করার
                        দরকার নেই।
                      </div>
                    </div>
                  )}

                  {/* ============================================
                      স্টেপ ২: পারমিশন
                      ============================================ */}
                  {step === 2 && (
                    <div style={styles.permissionsContainer}>
                      <div style={styles.permissionInfoBox}>
                        💡 আপনি কেবল সেই পারমিশনগুলো দিতে পারবেন যেগুলো আপনার
                        কাছেই আছে।
                      </div>

                      <div style={styles.permissionsList}>
                        {Object.entries(groupedPermissions).map(
                          ([category, perms]) => {
                            const grantableInCategory = perms.filter((p) =>
                              grantablePermissionKeys.includes(p.key)
                            );

                            const allChecked =
                              grantableInCategory.length > 0 &&
                              grantableInCategory.every(
                                (p) => selectedPermissions[p.key] === true
                              );

                            return (
                              <div
                                key={category}
                                style={styles.categoryGroup}
                              >
                                <div style={styles.categoryHeader}>
                                  <h4 style={styles.categoryTitle}>
                                    {category}
                                  </h4>
                                  {grantableInCategory.length > 0 && (
                                    <label style={styles.toggleAllLabel}>
                                      <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={(e) =>
                                          handleToggleAll(
                                            category,
                                            e.target.checked
                                          )
                                        }
                                        style={styles.toggleAllCheckbox}
                                      />
                                      <span style={styles.toggleAllText}>
                                        সব
                                      </span>
                                    </label>
                                  )}
                                </div>

                                {perms.map((perm) => {
                                  const isGrantable =
                                    grantablePermissionKeys.includes(
                                      perm.key
                                    );
                                  const isChecked =
                                    selectedPermissions[perm.key] === true;
                                  const canChange = canGrantPermission(perm.key);

                                  return (
                                    <label
                                      key={perm.key}
                                      style={{
                                        ...styles.permissionItem,
                                        opacity: isGrantable ? 1 : 0.4,
                                        cursor: isGrantable
                                          ? 'pointer'
                                          : 'not-allowed',
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked && isGrantable}
                                        onChange={(e) =>
                                          handlePermissionChange(
                                            perm.key,
                                            e.target.checked
                                          )
                                        }
                                        disabled={!isGrantable || !canChange}
                                        style={styles.checkbox}
                                      />
                                      <span style={styles.permissionLabel}>
                                        {perm.label}
                                      </span>
                                      {!isGrantable && (
                                        <span style={styles.lockedIcon}>
                                          🔒
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ফুটার */}
              <div style={styles.footer}>
                {step === 1 && (
                  <>
                    <button onClick={handleClose} style={styles.cancelBtn}>
                      ❌ বাতিল
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!selectedRole || loading}
                      style={{
                        ...styles.nextBtn,
                        opacity: !selectedRole || loading ? 0.5 : 1,
                      }}
                    >
                      পরবর্তী →
                    </button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <button onClick={handleBack} style={styles.backBtn}>
                      ← আগের ধাপ
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || loading}
                      style={{
                        ...styles.saveBtn,
                        opacity: saving || loading ? 0.6 : 1,
                      }}
                    >
                      {saving ? '⏳ সংরক্ষণ...' : '💾 সংরক্ষণ করুন'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================
// স্টাইল
// ============================================
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modal: {
    background: 'white',
    borderRadius: '20px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 22px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '17px',
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
    padding: '4px 10px',
    borderRadius: '6px',
  },
  subHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 22px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    gap: '8px',
  },
  email: { fontSize: '12px', color: '#64748b', fontWeight: '500' },
  roleBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '3px 12px',
    borderRadius: '20px',
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
    padding: '14px 22px 4px 22px',
  },
  stepDot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#e2e8f0',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    transition: 'all 0.3s ease',
  },
  stepLine: {
    width: '80px',
    height: '3px',
    background: '#e2e8f0',
    transition: 'all 0.3s ease',
  },
  errorBox: {
    margin: '10px 22px 0 22px',
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
    fontSize: '15px',
  },
  step1Container: { padding: '16px 22px', overflowY: 'auto' },
  step1Hint: { fontSize: '13px', color: '#64748b', margin: '0 0 14px 0' },
  noRolesBox: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '14px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    textAlign: 'center',
  },
  roleList: { display: 'flex', flexDirection: 'column', gap: '10px' },
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
  roleCardActive: { borderColor: '#16a34a', background: '#f0fdf4' },
  roleCardLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  roleIcon: { fontSize: '26px' },
  roleLabel: { fontSize: '15px', fontWeight: '600', color: '#0f172a' },
  roleDesc: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  roleCheck: { fontSize: '18px' },
  infoNote: {
    marginTop: '16px',
    padding: '10px 14px',
    background: '#eff6ff',
    borderRadius: '10px',
    fontSize: '12px',
    color: '#1e40af',
    borderLeft: '4px solid #3b82f6',
    lineHeight: '1.6',
  },
  permissionsContainer: {
    padding: '14px 22px',
    overflowY: 'auto',
    flex: 1,
  },
  permissionInfoBox: {
    background: '#f0f9ff',
    color: '#075985',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '12px',
    marginBottom: '14px',
    borderLeft: '4px solid #0ea5e9',
  },
  permissionsList: { display: 'flex', flexDirection: 'column', gap: '14px' },
  categoryGroup: { paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  categoryTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0,
  },
  toggleAllLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '600',
    color: '#16a34a',
  },
  toggleAllCheckbox: {
    width: '14px',
    height: '14px',
    cursor: 'pointer',
    accentColor: '#16a34a',
  },
  toggleAllText: { fontSize: '11px' },
  permissionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '7px 8px',
    borderRadius: '6px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#16a34a',
    flexShrink: 0,
  },
  permissionLabel: { fontSize: '13px', color: '#0f172a', fontWeight: '500' },
  lockedIcon: { fontSize: '14px', color: '#94a3b8', marginLeft: 'auto' },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '14px 22px',
    borderTop: '1px solid #e2e8f0',
  },
  cancelBtn: {
    background: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '10px 22px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
  },
  backBtn: {
    background: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '10px 22px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
  },
  successContainer: { textAlign: 'center', padding: '30px 20px' },
  successIcon: { fontSize: '56px', marginBottom: '12px' },
  successTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  successText: {
    fontSize: '14px',
    color: '#475569',
    textAlign: 'left',
    background: '#f0fdf4',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid #bbf7d0',
    lineHeight: '1.8',
    fontFamily: 'inherit',
    whiteSpace: 'pre-wrap',
    margin: '0 0 16px 0',
  },
  successFooter: { fontSize: '12px', color: '#94a3b8', margin: 0 },
};
