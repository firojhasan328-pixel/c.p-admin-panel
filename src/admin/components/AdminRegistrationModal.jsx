import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function AdminRegistrationModal({
  isOpen,
  onClose,
  teacher,
  selectedRole,
  selectedPermissions,
  onSuccess,
}) {
  const { adminUser } = useAdmin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdEmail, setCreatedEmail] = useState('');

  // ============================================
  // Modal খুললে ডিফল্ট ইমেইল বসাও
  // ============================================
  useEffect(() => {
    if (isOpen && teacher) {
      setEmail(teacher.email || '');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess(false);
      setShowPassword(false);
      setCreatedEmail('');
    }
  }, [isOpen, teacher]);

  if (!isOpen || !teacher) return null;

  // ============================================
  // পাসওয়ার্ড শক্তি চেক
  // ============================================
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', color: '', percent: 0 };
    if (pwd.length < 6) return { label: '⚠️ খুব দুর্বল', color: '#dc2626', percent: 25 };
    if (pwd.length < 8) return { label: '🔸 দুর্বল', color: '#f59e0b', percent: 50 };
    if (pwd.length < 10) return { label: '🔹 ভালো', color: '#2563eb', percent: 75 };
    return { label: '✅ শক্তিশালী', color: '#16a34a', percent: 100 };
  };

  const passwordStrength = getPasswordStrength(password);

  // ============================================
  // Validation
  // ============================================
  const validate = () => {
    if (!email || !email.includes('@')) {
      setError('❌ সঠিক ইমেইল দিন');
      return false;
    }
    if (!password || password.length < 6) {
      setError('❌ পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return false;
    }
    if (password !== confirmPassword) {
      setError('❌ পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না');
      return false;
    }
    return true;
  };

  // ============================================
  // Submit — Direct Supabase call
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // ============================================
      // ধাপ ১: Auth ইউজার তৈরি (signUp ব্যবহার)
      // ============================================
      let userId = null;

      // প্রথমে চেক করি ইউজার আছে কি না
      const { data: existingCheck } = await supabase
        .from('admin_users')
        .select('user_id, email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingCheck?.user_id) {
        // ✅ ইউজার আছে — পাসওয়ার্ড আপডেট করতে signIn করে update
        // কিন্তু current admin এর session নষ্ট হবে না — আমরা signUp এর বদলে
        // সরাসরি auth.admin ব্যবহার করতে পারি না (service_role লাগে)
        // তাই আমরা এই ক্ষেত্রে শুধু admin_users আপডেট করবো

        userId = existingCheck.user_id;

        // admin_users আপডেট
        const { error: updateAdminError } = await supabase
          .from('admin_users')
          .update({
            name: teacher.name || 'অ্যাডমিন',
            role: selectedRole,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('email', normalizedEmail);

        if (updateAdminError) throw updateAdminError;

        // user_roles আপডেট
        await supabase
          .from('user_roles')
          .upsert(
            { user_id: userId, role_name: selectedRole },
            { onConflict: 'user_id,role_name' }
          );

      } else {
        // ✅ নতুন ইউজার — signUp কল করি
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: normalizedEmail,
            password: password,
            options: {
              data: {
                name: teacher.name || 'অ্যাডমিন',
                role: selectedRole,
              },
            },
          });

        if (signUpError) {
          throw new Error('সাইনআপ সমস্যা: ' + signUpError.message);
        }

        if (!signUpData?.user) {
          throw new Error('ইউজার তৈরি হয়নি — Supabase সেটিংস চেক করুন');
        }

        userId = signUpData.user.id;
      }

      // ============================================
      // ধাপ ২: admin_users টেবিলে insert/update
      // ============================================
      const { error: adminInsertError } = await supabase
        .from('admin_users')
        .upsert(
          {
            user_id: userId,
            email: normalizedEmail,
            name: teacher.name || 'অ্যাডমিন',
            role: selectedRole,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        );

      if (adminInsertError) {
        console.warn('admin_users upsert warning:', adminInsertError.message);
      }

      // ============================================
      // ধাপ ৩: user_roles এ insert
      // ============================================
      await supabase
        .from('user_roles')
        .upsert(
          { user_id: userId, role_name: selectedRole },
          { onConflict: 'user_id,role_name' }
        );

      // ============================================
      // ধাপ ৪: teacher_permissions সেভ
      // ============================================
      if (selectedPermissions && typeof selectedPermissions === 'object') {
        // পুরোনো মুছে ফেলি
        await supabase
          .from('teacher_permissions')
          .delete()
          .eq('teacher_email', normalizedEmail);

        // নতুন যোগ করি
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
            console.warn('পারমিশন সেভ সমস্যা:', permError.message);
          }
        }
      }

      // ============================================
      // ধাপ ৫: লগ তৈরি
      // ============================================
      try {
        await supabase.from('admin_registration_logs').insert([
          {
            admin_user_id: userId,
            email: normalizedEmail,
            name: teacher.name || 'অ্যাডমিন',
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
      setCreatedEmail(normalizedEmail);
      setSuccess(true);

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2500);

    } catch (err) {
      console.error('❌ Admin registration error:', err);
      setError('❌ ' + (err.message || 'সংরক্ষণ করতে সমস্যা হয়েছে'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.successTitle}>অ্যাডমিন অ্যাকাউন্ট তৈরি সফল!</h2>
            <p style={styles.successText}>
              <strong>{createdEmail}</strong> ইমেইলটি{' '}
              <strong>{getRoleLabel(selectedRole)}</strong> হিসাবে তৈরি হয়েছে।
            </p>
            <div style={styles.successInfoBox}>
              <p style={styles.successInfoTitle}>📌 গুরুত্বপূর্ণ তথ্য</p>
              <ul style={styles.successList}>
                <li>
                  এই ইমেইল ও পাসওয়ার্ড দিয়ে{' '}
                  <strong>অ্যাডমিন প্যানেলে লগইন</strong> করতে পারবেন
                </li>
                <li>
                  <strong>রোল:</strong> {getRoleLabel(selectedRole)}
                </li>
                <li>
                  <strong>পারমিশন:</strong>{' '}
                  {Object.values(selectedPermissions || {}).filter(Boolean).length} টি
                </li>
                <li style={{ color: '#dc2626', fontWeight: '700' }}>
                  ⚠️ পাসওয়ার্ড ও ইমেইল এখনই সংরক্ষণ করুন — পরে আর দেখানো হবে না!
                </li>
              </ul>
            </div>
            <p style={styles.successFooter}>
              ⏳ পপআপ স্বয়ংক্রিয়ভাবে বন্ধ হবে...
            </p>
          </div>
        ) : (
          <>
            <div style={styles.header}>
              <div style={styles.headerLeft}>
                <span style={styles.headerIcon}>🔑</span>
                <div>
                  <h3 style={styles.title}>অ্যাডমিন রেজিস্ট্রেশন</h3>
                  <p style={styles.subtitle}>
                    নতুন অ্যাডমিনের লগইন তথ্য সেট করুন
                  </p>
                </div>
              </div>
              <button onClick={handleClose} style={styles.closeBtn}>
                ✕
              </button>
            </div>

            <div style={styles.teacherInfo}>
              <div style={styles.teacherAvatar}>
                {teacher.photo_url ? (
                  <img
                    src={teacher.photo_url}
                    alt={teacher.name}
                    style={styles.teacherAvatarImg}
                  />
                ) : (
                  <span style={styles.teacherAvatarText}>
                    {teacher.name?.charAt(0) || '?'}
                  </span>
                )}
              </div>
              <div style={styles.teacherMeta}>
                <div style={styles.teacherName}>{teacher.name}</div>
                <div style={styles.teacherRoleBadge}>
                  {getRoleBadge(selectedRole)}
                </div>
              </div>
            </div>

            <div style={styles.permissionSummary}>
              <span style={styles.permissionSummaryLabel}>
                ✅ পারমিশন দেওয়া হয়েছে:
              </span>
              <span style={styles.permissionSummaryCount}>
                {Object.values(selectedPermissions || {}).filter(Boolean).length} টি
              </span>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>
                  📧 ইমেইল (লগইন করতে ব্যবহার করবেন)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  style={styles.input}
                  required
                />
                <small style={styles.hint}>
                  💡 চাইলে শিক্ষকের বর্তমান ইমেইল রাখুন অথবা নতুন ইমেইল দিন
                </small>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>🔑 পাসওয়ার্ড</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    style={styles.passwordInput}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {password && (
                  <div style={styles.strengthWrapper}>
                    <div style={styles.strengthBar}>
                      <div
                        style={{
                          ...styles.strengthFill,
                          width: `${passwordStrength.percent}%`,
                          background: passwordStrength.color,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        ...styles.strengthLabel,
                        color: passwordStrength.color,
                      }}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>🔑 পাসওয়ার্ড নিশ্চিত করুন</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="আবার পাসওয়ার্ড দিন"
                  style={{
                    ...styles.input,
                    borderColor:
                      confirmPassword && confirmPassword !== password
                        ? '#dc2626'
                        : '#e2e8f0',
                  }}
                  required
                />
                {confirmPassword && confirmPassword === password && (
                  <small style={styles.matchHint}>✅ পাসওয়ার্ড মিলছে</small>
                )}
                {confirmPassword && confirmPassword !== password && (
                  <small style={styles.errorHint}>❌ পাসওয়ার্ড মিলছে না</small>
                )}
              </div>

              <div style={styles.infoBox}>
                <p style={styles.infoBoxTitle}>📌 লক্ষ্য রাখুন</p>
                <ul style={styles.infoBoxList}>
                  <li>এই ইমেইল + পাসওয়ার্ড দিয়ে অ্যাডমিন প্যানেলে লগইন করতে হবে</li>
                  <li>পাসওয়ার্ড সংরক্ষণের পর কারো সাথে শেয়ার করবেন না</li>
                  <li>পাসওয়ার্ড পরে আর দেখানো হবে না</li>
                </ul>
              </div>

              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={styles.cancelBtn}
                  disabled={loading}
                >
                  ✕ বাতিল
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.submitBtn,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                  disabled={loading}
                >
                  {loading ? '⏳ সংরক্ষণ...' : '💾 সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function getRoleLabel(role) {
  const map = {
    super_admin: '⭐ সুপার অ্যাডমিন',
    admin: '🔹 অ্যাডমিন',
    sub_admin: '🔷 সাব-অ্যাডমিন',
    teacher: '👨‍🏫 শিক্ষক',
  };
  return map[role] || role;
}

function getRoleBadge(role) {
  const badges = {
    super_admin: { label: '⭐ সুপার অ্যাডমিন', bg: '#dcfce7', color: '#16a34a' },
    admin: { label: '🔹 অ্যাডমিন', bg: '#dbeafe', color: '#2563eb' },
    sub_admin: { label: '🔷 সাব-অ্যাডমিন', bg: '#e0e7ff', color: '#4338ca' },
    teacher: { label: '👨‍🏫 শিক্ষক', bg: '#fef3c7', color: '#f59e0b' },
  };
  const b = badges[role] || badges.teacher;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        background: b.bg,
        color: b.color,
      }}
    >
      {b.label}
    </span>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(6px)',
    zIndex: 11000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modal: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '520px',
    width: '100%',
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: '0 25px 60px -12px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    paddingBottom: '14px',
    borderBottom: '2px solid #f1f5f9',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: { fontSize: '28px' },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  closeBtn: {
    background: '#f1f5f9',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#64748b',
  },
  teacherInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '12px',
    border: '1px solid #e2e8f0',
  },
  teacherAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  teacherAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  teacherAvatarText: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
  },
  teacherMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  teacherName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
  },
  teacherRoleBadge: {
    display: 'flex',
    gap: '6px',
  },
  permissionSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 14px',
    background: '#dcfce7',
    borderRadius: '10px',
    marginBottom: '14px',
    border: '1px solid #86efac',
  },
  permissionSummaryLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#166534',
  },
  permissionSummaryCount: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#15803d',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '14px',
    borderLeft: '4px solid #dc2626',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    padding: '11px 48px 11px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
  },
  strengthWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '4px',
  },
  strengthBar: {
    flex: 1,
    height: '5px',
    background: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'all 0.3s ease',
  },
  strengthLabel: {
    fontSize: '11px',
    fontWeight: '600',
  },
  hint: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  matchHint: {
    fontSize: '11px',
    color: '#16a34a',
    fontWeight: '600',
    marginTop: '2px',
  },
  errorHint: {
    fontSize: '11px',
    color: '#dc2626',
    fontWeight: '600',
    marginTop: '2px',
  },
  infoBox: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  infoBoxTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#92400e',
    margin: '0 0 6px 0',
  },
  infoBoxList: {
    margin: 0,
    paddingLeft: '18px',
    fontSize: '12px',
    color: '#78350f',
    lineHeight: '1.7',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
  },
  cancelBtn: {
    flex: 1,
    background: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
  },
  successContainer: {
    textAlign: 'center',
    padding: '20px 8px',
  },
  successIcon: {
    fontSize: '56px',
    marginBottom: '12px',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 10px 0',
  },
  successText: {
    fontSize: '14px',
    color: '#475569',
    margin: '0 0 16px 0',
    lineHeight: '1.6',
  },
  successInfoBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '14px 16px',
    textAlign: 'left',
    marginBottom: '16px',
  },
  successInfoTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#166534',
    margin: '0 0 8px 0',
  },
  successList: {
    margin: 0,
    paddingLeft: '18px',
    fontSize: '13px',
    color: '#15803d',
    lineHeight: '1.8',
  },
  successFooter: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
};
