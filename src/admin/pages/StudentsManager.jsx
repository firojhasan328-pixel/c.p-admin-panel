import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';
import { usePermissions } from '../../hooks/usePermissions';
import TeacherPermissionsModal from '../components/TeacherPermissionsModal';

export default function TeachersManager() {
  const { adminUser } = useAdmin();
  const { hasPermission, canGrantPermission } = usePermissions();
  const [teachers, setTeachers] = useState([]);
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('approved'); // 'approved' | 'pending'
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    subject: '',
    phone: '',
    email: '',
    photo_url: '',
  });
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [teacherRoles, setTeacherRoles] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const canManageTeachers = hasPermission('manage_teachers');
  const canManagePermissions = hasPermission('manage_permissions');

  useEffect(() => {
    if (canManageTeachers) {
      fetchAllData();
      fetchAllRoles();

      // ✅ Realtime subscription — শিক্ষক ও রেজিস্ট্রেশন অনুরোধ উভয়ের জন্যই
      const teacherChannel = supabase
        .channel('teachers-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'teachers',
        }, () => {
          fetchAllData();
        })
        .subscribe();

      const requestChannel = supabase
        .channel('teacher-requests-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'registration_requests',
        }, () => {
          fetchAllData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(teacherChannel);
        supabase.removeChannel(requestChannel);
      };
    }
  }, [canManageTeachers]);

  // =============================================
  // ✅ সব ডেটা লোড (approved teachers + pending requests)
  // =============================================
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // ✅ শুধু approved শিক্ষক
      const { data: approvedData, error: approvedError } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_approved', true)
        .order('name');

      if (approvedError) throw approvedError;
      setTeachers(approvedData || []);

      // ✅ Pending শিক্ষক রেজিস্ট্রেশন অনুরোধ
      const { data: pendingData, error: pendingError } = await supabase
        .from('registration_requests')
        .select('*')
        .eq('role', 'teacher')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      setPendingTeachers(pendingData || []);

    } catch (error) {
      console.error('❌ ডেটা লোড করতে সমস্যা:', error);
      setErrorMessage('❌ ডেটা লোড করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setLoading(false);
  };

  // =============================================
  // ✅ সব শিক্ষকের রোল লোড করুন
  // =============================================
  const fetchAllRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('email, role');

      if (data) {
        const roleMap = {};
        data.forEach(item => {
          roleMap[item.email] = item.role;
        });
        setTeacherRoles(roleMap);
        console.log('✅ Roles loaded:', roleMap);
      }
    } catch (error) {
      console.error('❌ Fetch roles error:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageTeachers) {
      alert('আপনার শিক্ষক যোগ করার অনুমতি নেই');
      return;
    }
    setActionLoading(true);
    try {
      if (editing) {
        await supabase.from('teachers').update(formData).eq('id', editing);
      } else {
        await supabase.from('teachers').insert([{ ...formData, is_approved: true }]);
      }
      setShowForm(false);
      setEditing(null);
      setFormData({ name: '', designation: '', subject: '', phone: '', email: '', photo_url: '' });
      await fetchAllData();
      setSuccessMessage(editing ? '✅ শিক্ষক আপডেট করা হয়েছে!' : '✅ শিক্ষক যোগ করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage('❌ সংরক্ষণ করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const handleEdit = (teacher) => {
    if (!canManageTeachers) {
      alert('আপনার শিক্ষক এডিট করার অনুমতি নেই');
      return;
    }
    setEditing(teacher.id);
    setFormData(teacher);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!canManageTeachers) {
      alert('আপনার শিক্ষক ডিলিট করার অনুমতি নেই');
      return;
    }
    if (confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) {
      setActionLoading(true);
      try {
        await supabase.from('teachers').delete().eq('id', id);
        await fetchAllData();
        setSuccessMessage('✅ শিক্ষক ডিলিট করা হয়েছে!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('Delete error:', error);
        setErrorMessage('❌ ডিলিট করতে সমস্যা');
        setTimeout(() => setErrorMessage(''), 3000);
      }
      setActionLoading(false);
    }
  };

  // =============================================
  // ✅ Pending শিক্ষক Approve
  // =============================================
  const handleApprove = async (request) => {
    if (!confirm(`"${request.student_name}"-কে শিক্ষক হিসেবে অনুমোদন দিতে চান?`)) return;

    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // ১. registration_requests আপডেট
      const { error: updateError } = await supabase
        .from('registration_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminUser?.email || 'admin',
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // ২. teachers টেবিলে update (existing ID দিয়ে)
      const teacherData = {
        name: request.student_name,
        designation: request.designation || 'শিক্ষক',
        subject: request.subject || '—',
        gender: request.gender || null,
        phone: request.phone,
        email: request.email,
        photo_url: request.student_photo || null,
        is_approved: true,
        is_verified: true,
      };

      // ইমেইল দিয়ে existing চেক
      const { data: existingTeacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('email', request.email)
        .maybeSingle();

      if (existingTeacher) {
        // আপডেট
        await supabase
          .from('teachers')
          .update(teacherData)
          .eq('id', existingTeacher.id);
      } else {
        // নতুন insert
        await supabase
          .from('teachers')
          .insert([teacherData]);
      }

      // ৩. registration_codes আপডেট
      await supabase
        .from('registration_codes')
        .update({
          is_used: true,
          used_by: request.email,
          used_at: new Date().toISOString(),
        })
        .eq('code', request.code);

      // ৪. লগ তৈরি
      await supabase
        .from('registration_logs')
        .insert([{
          code: request.code,
          action: 'teacher_approved',
          email: request.email,
          role: 'teacher',
        }]);

      setSuccessMessage(`✅ "${request.student_name}"-কে অনুমোদন দেওয়া হয়েছে!`);
      await fetchAllData();
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Approve error:', error);
      setErrorMessage('❌ অনুমোদন করতে সমস্যা: ' + error.message);
      setTimeout(() => setErrorMessage(''), 5000);
    }
    setActionLoading(false);
  };

  // =============================================
  // ✅ Pending শিক্ষক Reject
  // =============================================
  const handleReject = async (request) => {
    if (!confirm(`"${request.student_name}"-এর অনুরোধ বাতিল করতে চান?`)) return;

    setActionLoading(true);
    try {
      await supabase
        .from('registration_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: adminUser?.email || 'admin',
        })
        .eq('id', request.id);

      await supabase
        .from('registration_logs')
        .insert([{
          code: request.code,
          action: 'teacher_rejected',
          email: request.email,
          role: 'teacher',
        }]);

      setSuccessMessage(`❌ "${request.student_name}"-এর অনুরোধ বাতিল করা হয়েছে!`);
      await fetchAllData();
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Reject error:', error);
      setErrorMessage('❌ বাতিল করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 5000);
    }
    setActionLoading(false);
  };

  const handlePermissionsClick = (teacher) => {
    if (!canManagePermissions) {
      alert('আপনার পারমিশন পরিবর্তনের অনুমতি নেই');
      return;
    }
    setSelectedTeacher(teacher);
    setShowPermissionsModal(true);
  };

  // =============================================
  // ✅ রোল ব্যাজ
  // =============================================
  const getRoleBadge = (email) => {
    const role = teacherRoles[email];
    if (!role) return null;
    
    const badges = {
      super_admin: { 
        label: '⭐ সুপার অ্যাডমিন', 
        bg: '#dcfce7', 
        color: '#16a34a',
        border: '2px solid #16a34a'
      },
      admin: { 
        label: '🔹 সাব অ্যাডমিন', 
        bg: '#dbeafe', 
        color: '#2563eb',
        border: '2px solid #2563eb'
      },
      teacher: { 
        label: '👨‍🏫 শিক্ষক', 
        bg: '#fef3c7', 
        color: '#f59e0b',
        border: '2px solid #f59e0b'
      },
      viewer: { 
        label: '👁️ দর্শক', 
        bg: '#f1f5f9', 
        color: '#64748b',
        border: '2px solid #64748b'
      }
    };
    
    return badges[role] || null;
  };

  if (!canManageTeachers) {
    return (
      <div style={styles.noAccess}>
        <span style={styles.noAccessIcon}>🔒</span>
        <h3 style={styles.noAccessTitle}>অ্যাক্সেস নেই</h3>
        <p style={styles.noAccessText}>আপনার শিক্ষক ব্যবস্থাপনা দেখার অনুমতি নেই</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* পপআপ মেসেজ */}
      {successMessage && (
        <div style={styles.popupSuccess}>
          <span>✅</span> {successMessage}
          <button onClick={() => setSuccessMessage('')} style={styles.popupClose}>✕</button>
        </div>
      )}
      {errorMessage && (
        <div style={styles.popupError}>
          <span>⚠️</span> {errorMessage}
          <button onClick={() => setErrorMessage('')} style={styles.popupClose}>✕</button>
        </div>
      )}

      <div style={styles.header}>
        <h2 style={styles.title}>👨‍🏫 শিক্ষক ব্যবস্থাপনা</h2>
        <button 
          onClick={() => { setShowForm(true); setEditing(null); setFormData({ name: '', designation: '', subject: '', phone: '', email: '', photo_url: '' }); }} 
          style={styles.addBtn}
        >
          ➕ নতুন শিক্ষক
        </button>
      </div>

      {/* ✅ ট্যাব সিস্টেম */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('approved')}
          style={{ ...styles.tab, ...(activeTab === 'approved' ? styles.tabActive : {}) }}
        >
          ✅ অনুমোদিত শিক্ষক <span style={styles.tabBadge}>{teachers.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{ ...styles.tab, ...(activeTab === 'pending' ? styles.tabActive : {}) }}
        >
          ⏳ অনুমোদনের অপেক্ষায় <span style={styles.tabBadge}>{pendingTeachers.length}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input name="name" value={formData.name} onChange={handleChange} placeholder="নাম" style={styles.input} required />
          <input name="designation" value={formData.designation} onChange={handleChange} placeholder="পদবী" style={styles.input} />
          <input name="subject" value={formData.subject} onChange={handleChange} placeholder="বিষয়" style={styles.input} />
          <input name="phone" value={formData.phone} onChange={handleChange} placeholder="ফোন" style={styles.input} />
          <input name="email" value={formData.email} onChange={handleChange} placeholder="ইমেইল" style={styles.input} />
          <input name="photo_url" value={formData.photo_url} onChange={handleChange} placeholder="ছবি URL" style={styles.input} />
          <div style={styles.formActions}>
            <button type="submit" disabled={actionLoading} style={styles.saveBtn}>{editing ? 'আপডেট' : 'যোগ করুন'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>বাতিল</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>⏳ লোড হচ্ছে...</p>
        </div>
      ) : (
        <>
          {/* ✅ Approved Teachers ট্যাব */}
          {activeTab === 'approved' && (
            <>
              {teachers.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>📭</span>
                  <p>কোনো অনুমোদিত শিক্ষক নেই</p>
                </div>
              ) : (
                <div style={styles.list}>
                  {teachers.map((t) => {
                    const roleBadge = getRoleBadge(t.email);
                    return (
                      <div key={t.id} style={styles.item}>
                        <div style={styles.itemLeft}>
                          <strong style={styles.teacherName}>{t.name}</strong>
                          {roleBadge && (
                            <span style={{
                              ...styles.roleBadge,
                              background: roleBadge.bg,
                              color: roleBadge.color,
                              border: roleBadge.border,
                            }}>
                              {roleBadge.label}
                            </span>
                          )}
                          <span style={styles.badge}>{t.designation || 'শিক্ষক'}</span>
                          <span style={styles.badge2}>{t.subject}</span>
                        </div>
                        <div style={styles.actions}>
                          <button onClick={() => handleEdit(t)} style={styles.editBtn} title="এডিট">✏️</button>
                          {canManagePermissions && (
                            <button 
                              onClick={() => handlePermissionsClick(t)} 
                              style={styles.permissionBtn} 
                              title="পারমিশন সেটিংস"
                            >
                              ⚙️
                            </button>
                          )}
                          <button onClick={() => handleDelete(t.id)} style={styles.deleteBtn} title="ডিলিট">🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ✅ Pending Teachers ট্যাব */}
          {activeTab === 'pending' && (
            <>
              {pendingTeachers.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>✅</span>
                  <p>কোনো pending শিক্ষক অনুরোধ নেই</p>
                </div>
              ) : (
                <div style={styles.list}>
                  {pendingTeachers.map((p) => (
                    <div key={p.id} style={styles.pendingItem}>
                      <div style={styles.pendingLeft}>
                        <div style={styles.pendingAvatar}>
                          {p.student_photo ? (
                            <img src={p.student_photo} alt={p.student_name} style={styles.pendingAvatarImg} />
                          ) : (
                            <span style={styles.pendingAvatarText}>{p.student_name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div style={styles.pendingInfo}>
                          <div style={styles.pendingName}>{p.student_name}</div>
                          <div style={styles.pendingMeta}>
                            <span>💼 {p.designation || 'শিক্ষক'}</span>
                            <span>📚 {p.subject || '—'}</span>
                          </div>
                          <div style={styles.pendingMeta}>
                            <span>📧 {p.email}</span>
                            <span>📱 {p.phone}</span>
                          </div>
                          <div style={styles.pendingDate}>
                            📅 {new Date(p.created_at).toLocaleDateString('bn-BD')}
                          </div>
                        </div>
                      </div>
                      <div style={styles.actions}>
                        <button 
                          onClick={() => handleApprove(p)} 
                          disabled={actionLoading}
                          style={styles.approveBtn}
                          title="অনুমোদন"
                        >
                          ✅
                        </button>
                        <button 
                          onClick={() => handleReject(p)} 
                          disabled={actionLoading}
                          style={styles.rejectBtn}
                          title="বাতিল"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <TeacherPermissionsModal
        teacher={selectedTeacher}
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedTeacher(null);
        }}
        onSuccess={() => {
          fetchAllData();
          fetchAllRoles();
        }}
      />
    </div>
  );
}

const styles = {
  container: { maxWidth: '900px', margin: '0 auto' },
  noAccess: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
  },
  noAccessIcon: { fontSize: '48px', display: 'block', marginBottom: '12px' },
  noAccessTitle: { fontSize: '20px', color: '#0f172a', margin: '0 0 8px 0' },
  noAccessText: { fontSize: '14px', color: '#64748b', margin: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 },
  addBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  
  // ✅ ট্যাব
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    padding: '8px',
    background: '#f1f5f9',
    borderRadius: '12px',
  },
  tab: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  tabActive: {
    background: 'white',
    color: '#0f172a',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  tabBadge: {
    background: '#e2e8f0',
    padding: '0 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
    minWidth: '24px',
    textAlign: 'center',
  },

  form: { background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none' },
  formActions: { display: 'flex', gap: '10px' },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 0',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #16a34a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  emptyState: { textAlign: 'center', padding: '50px 0', color: '#94a3b8' },
  emptyIcon: { fontSize: '56px', display: 'block', marginBottom: '12px' },
  
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  item: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '12px 16px', 
    background: 'white', 
    borderRadius: '10px', 
    border: '1px solid #e2e8f0', 
    flexWrap: 'wrap', 
    gap: '8px',
  },
  itemLeft: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    flexWrap: 'wrap',
    flex: 1,
  },
  teacherName: { 
    fontSize: '15px', 
    fontWeight: '600', 
    color: '#0f172a',
  },
  roleBadge: {
    padding: '2px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.3px',
  },
  badge: { background: '#dbeafe', color: '#2563eb', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badge2: { background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  actions: { display: 'flex', gap: '6px' },
  editBtn: { background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  permissionBtn: { background: '#fef3c7', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  deleteBtn: { background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  
  // ✅ Pending item
  pendingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: '#fffbeb',
    borderRadius: '12px',
    border: '2px solid #fde68a',
    flexWrap: 'wrap',
    gap: '12px',
  },
  pendingLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: '240px',
  },
  pendingAvatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: '#f59e0b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    border: '2px solid #fde68a',
  },
  pendingAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  pendingAvatarText: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'white',
  },
  pendingInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1,
  },
  pendingName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
  },
  pendingMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    fontSize: '12px',
    color: '#64748b',
  },
  pendingDate: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  approveBtn: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  rejectBtn: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  
  popupSuccess: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    color: '#166534',
    padding: '14px 22px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #86efac',
    boxShadow: '0 10px 30px rgba(22, 163, 74, 0.3)',
    maxWidth: '400px',
    animation: 'slideIn 0.5s ease',
  },
  popupError: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: '#991b1b',
    padding: '14px 22px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #fca5a5',
    boxShadow: '0 10px 30px rgba(220, 38, 38, 0.3)',
    maxWidth: '400px',
    animation: 'slideIn 0.5s ease',
  },
  popupClose: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    marginLeft: 'auto',
    padding: '4px',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(styleSheet);
