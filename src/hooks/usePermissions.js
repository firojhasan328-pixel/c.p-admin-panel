import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAdmin } from '../context/AdminContext';

export const ALL_PERMISSIONS = [
  { key: 'view_dashboard', label: '📊 ড্যাশবোর্ড দেখুন', category: 'দেখার অনুমতি' },
  { key: 'edit_homepage', label: '🏠 হোমপেজ এডিট করুন', category: 'এডিট অনুমতি' },
  { key: 'manage_teachers', label: '👨‍🏫 শিক্ষক ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_students', label: '🎓 ছাত্র ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_notices', label: '📢 নোটিশ ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_gallery', label: '🖼️ গ্যালারি ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_contact', label: '📞 যোগাযোগ ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_footer', label: '📋 ফুটার ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_theme', label: '🎨 থিম ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_settings', label: '⚙️ সেটিংস ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_seo', label: '🔍 এসইও ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_media', label: '📁 মিডিয়া ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_users', label: '👥 ব্যবহারকারী ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_permissions', label: '🔐 পারমিশন ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'manage_backup', label: '💾 ব্যাকআপ ব্যবস্থাপনা', category: 'ব্যবস্থাপনা' },
  { key: 'view_logs', label: '📋 অ্যাক্টিভিটি লগ', category: 'দেখার অনুমতি' },
  { key: 'manage_recycle', label: '🗑️ রিসাইকেল বিন', category: 'ব্যবস্থাপনা' },
];

export function usePermissions() {
  const { adminUser } = useAdmin();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  // =============================================
  // ✅ ইউজারের রোল ও পারমিশন লোড
  // =============================================
  const loadPermissionsByEmail = async (email) => {
    try {
      // ১. admin_users থেকে রোল লোড
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('role')
        .eq('email', email)
        .maybeSingle();

      const userRole = adminData?.role || 'teacher';

      // ২. যদি সুপার অ্যাডমিন হয়, সব পারমিশন true
      if (userRole === 'super_admin') {
        const allTrue = {};
        ALL_PERMISSIONS.forEach(p => { allTrue[p.key] = true; });
        setPermissions(allTrue);
        return allTrue;
      }

      // ৩. teacher_permissions লোড
      const { data, error } = await supabase
        .from('teacher_permissions')
        .select('*')
        .eq('teacher_email', email);

      if (error) throw error;

      const permMap = {};
      data.forEach(item => {
        permMap[item.permission_key] = item.is_allowed;
      });

      // ৪. অ্যাডমিন হলে কিছু ডিফল্ট পারমিশন true
      if (userRole === 'admin') {
        const adminDefaults = ['view_dashboard', 'edit_homepage', 'manage_teachers', 'manage_students', 'manage_notices', 'manage_gallery'];
        adminDefaults.forEach(key => {
          permMap[key] = true;
        });
      }

      setPermissions(permMap);
      return permMap;

    } catch (error) {
      console.error('Load permissions error:', error);
      return {};
    }
  };

  // =============================================
  // ✅ পারমিশন আছে কিনা চেক
  // =============================================
  const hasPermission = (permissionKey) => {
    // সুপার অ্যাডমিন সব পারমিশন পায়
    if (adminUser?.role === 'super_admin') return true;
    
    // অ্যাডমিন কিছু ডিফল্ট পারমিশন পায়
    if (adminUser?.role === 'admin') {
      const adminDefaults = ['view_dashboard', 'edit_homepage', 'manage_teachers', 'manage_students', 'manage_notices', 'manage_gallery'];
      if (adminDefaults.includes(permissionKey)) return true;
    }
    
    return permissions[permissionKey] === true;
  };

  // =============================================
  // ✅ পারমিশন দেওয়ার অনুমতি আছে কিনা
  // =============================================
  const canGrantPermission = (permissionKey) => {
    if (adminUser?.role === 'super_admin') return true;
    if (adminUser?.role === 'admin') {
      // অ্যাডমিনরা পারমিশন দিতে পারে না (শুধু সুপার অ্যাডমিন)
      return false;
    }
    return permissions[permissionKey] === true;
  };

  // =============================================
  // ✅ পারমিশন আপডেট
  // =============================================
  const updatePermissionByEmail = async (email, permissionKey, isAllowed) => {
    try {
      if (!canGrantPermission(permissionKey) && adminUser?.role !== 'super_admin') {
        throw new Error('এই পারমিশন দেওয়ার অনুমতি আপনার নেই');
      }

      if (permissionKey === 'super_admin') {
        throw new Error('আপনি কাউকে সুপার অ্যাডমিন বানাতে পারবেন না');
      }

      const { data: existing } = await supabase
        .from('teacher_permissions')
        .select('*')
        .eq('teacher_email', email)
        .eq('permission_key', permissionKey)
        .maybeSingle();

      let result;
      if (existing) {
        result = await supabase
          .from('teacher_permissions')
          .update({ 
            is_allowed: isAllowed, 
            granted_by: adminUser?.user_id || adminUser?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        result = await supabase
          .from('teacher_permissions')
          .insert([{
            teacher_email: email,
            permission_key: permissionKey,
            is_allowed: isAllowed,
            granted_by: adminUser?.user_id || adminUser?.id,
          }]);
      }

      if (result.error) throw result.error;

      // লগ করুন
      await supabase
        .from('permission_logs')
        .insert([{
          action: isAllowed ? 'granted' : 'revoked',
          teacher_email: email,
          permission_key: permissionKey,
          changed_by: adminUser?.user_id || adminUser?.id,
          old_value: existing?.is_allowed || false,
          new_value: isAllowed,
        }]);

      return { success: true };

    } catch (error) {
      console.error('Update permission error:', error);
      return { success: false, error: error.message };
    }
  };

  // =============================================
  // ✅ loadPermissions
  // =============================================
  useEffect(() => {
    if (adminUser?.email) {
      loadPermissionsByEmail(adminUser.email).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [adminUser?.email]);

  return {
    permissions,
    loading,
    loadPermissionsByEmail,
    hasPermission,
    canGrantPermission,
    updatePermissionByEmail,
    ALL_PERMISSIONS,
  };
}
