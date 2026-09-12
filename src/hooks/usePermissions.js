import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAdmin } from '../context/AdminContext';

// ============================================
// সব পারমিশনের তালিকা
// ============================================
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

// ============================================
// রোল হায়ারার্কি
// প্রতিটি রোল তার নিচের রোলদের assign করতে পারবে
// ============================================
export const ROLE_HIERARCHY = {
  super_admin: ['super_admin', 'admin', 'sub_admin', 'teacher'],
  admin: ['admin', 'sub_admin', 'teacher'],
  sub_admin: ['sub_admin', 'teacher'],
  teacher: ['teacher'],
};

// ============================================
// রোল ব্যাজ ডিজাইন
// ============================================
export const ROLE_BADGES = {
  super_admin: { label: '⭐ সুপার অ্যাডমিন', bg: '#dcfce7', color: '#16a34a', border: '2px solid #16a34a' },
  admin: { label: '🔹 অ্যাডমিন', bg: '#dbeafe', color: '#2563eb', border: '2px solid #2563eb' },
  sub_admin: { label: '🔷 সাব-অ্যাডমিন', bg: '#e0e7ff', color: '#4338ca', border: '2px solid #4338ca' },
  teacher: { label: '👨‍🏫 শিক্ষক', bg: '#fef3c7', color: '#f59e0b', border: '2px solid #f59e0b' },
};

// ============================================
// রোলের প্রাধান্য (বেশি সংখ্যা = বেশি ক্ষমতা)
// ============================================
export const ROLE_PRIORITY = {
  super_admin: 4,
  admin: 3,
  sub_admin: 2,
  teacher: 1,
};

// ============================================
// মূল hook
// ============================================
export function usePermissions() {
  const { adminUser } = useAdmin();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  // ============================================
  // ইউজারের রোল ও পারমিশন লোড
  // ============================================
  const loadPermissionsByEmail = async (email) => {
    try {
      // ১. admin_users থেকে রোল লোড
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('role')
        .eq('email', email)
        .maybeSingle();

      const userRole = adminData?.role || 'teacher';

      // ২. সুপার অ্যাডমিন — সব পারমিশন true
      if (userRole === 'super_admin') {
        const allTrue = {};
        ALL_PERMISSIONS.forEach(p => { allTrue[p.key] = true; });
        setPermissions(allTrue);
        return allTrue;
      }

      // ৩. teacher_permissions থেকে পারমিশন লোড
      const { data, error } = await supabase
        .from('teacher_permissions')
        .select('*')
        .eq('teacher_email', email);

      if (error) throw error;

      const permMap = {};
      (data || []).forEach(item => {
        permMap[item.permission_key] = item.is_allowed;
      });

      // ৪. অ্যাডমিনের ডিফল্ট পারমিশন (যদি ডাটাবেসে কিছু না থাকে)
      if (userRole === 'admin') {
        const adminDefaults = [
          'view_dashboard', 'edit_homepage', 'manage_teachers',
          'manage_students', 'manage_notices', 'manage_gallery',
        ];
        adminDefaults.forEach(key => {
          if (permMap[key] === undefined) permMap[key] = true;
        });
      }

      // ৫. সাব-অ্যাডমিনের ডিফল্ট পারমিশন
      if (userRole === 'sub_admin') {
        const subAdminDefaults = [
          'view_dashboard', 'manage_students', 'manage_notices',
        ];
        subAdminDefaults.forEach(key => {
          if (permMap[key] === undefined) permMap[key] = true;
        });
      }

      setPermissions(permMap);
      return permMap;

    } catch (error) {
      console.error('Load permissions error:', error);
      return {};
    }
  };

  // ============================================
  // পারমিশন আছে কি না চেক
  // ============================================
  const hasPermission = (permissionKey) => {
    if (adminUser?.role === 'super_admin') return true;
    return permissions[permissionKey] === true;
  };

  // ============================================
  // ⭐ মূল লজিক: কাউকে পারমিশন দেওয়ার অনুমতি আছে কি না
  // শর্ত: নিজের কাছে থাকতে হবে + সুপার অ্যাডমিন হলে সব
  // ============================================
  const canGrantPermission = (permissionKey) => {
    // সুপার অ্যাডমিন সব দিতে পারবে
    if (adminUser?.role === 'super_admin') return true;

    // অন্যরা শুধু নিজের কাছে যেটা আছে সেটাই দিতে পারবে
    if (permissions[permissionKey] !== true) return false;

    // ব্যবস্থাপনা পারমিশন শুধু admin+ দিতে পারবে
    const restrictedPermissions = ['manage_users', 'manage_permissions', 'manage_backup', 'manage_recycle'];
    if (restrictedPermissions.includes(permissionKey)) {
      return adminUser?.role === 'admin' || adminUser?.role === 'super_admin';
    }

    return true;
  };

  // ============================================
  // ⭐ এই ইউজার কাকে কোন রোল দিতে পারবে
  // ============================================
  const getAvailableRolesToAssign = () => {
    const myRole = adminUser?.role || 'teacher';
    return ROLE_HIERARCHY[myRole] || ['teacher'];
  };

  // ============================================
  // ⭐ এই ইউজার অন্যকে যে পারমিশনগুলো দিতে পারবে
  // ============================================
  const getAvailablePermissionsToGrant = () => {
    return ALL_PERMISSIONS.filter(p => canGrantPermission(p.key));
  };

  // ============================================
  // পারমিশন আপডেট (সাধারণ শিক্ষকদের জন্য)
  // ============================================
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
            updated_at: new Date().toISOString(),
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
      await supabase.from('permission_logs').insert([{
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

  // ============================================
  // প্রাথমিক লোড
  // ============================================
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
    getAvailableRolesToAssign,
    getAvailablePermissionsToGrant,
    updatePermissionByEmail,
    ALL_PERMISSIONS,
    ROLE_HIERARCHY,
    ROLE_BADGES,
    ROLE_PRIORITY,
  };
}
