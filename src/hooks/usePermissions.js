import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAdmin } from '../context/AdminContext';

// সব পারমিশনের লিস্ট
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

  // ইউজারের পারমিশন লোড করুন
  const loadPermissions = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('teacher_permissions')
        .select('*')
        .eq('teacher_id', userId);

      if (error) throw error;

      const permMap = {};
      data.forEach(item => {
        permMap[item.permission_key] = item.is_allowed;
      });
      setPermissions(permMap);
      return permMap;
    } catch (error) {
      console.error('Load permissions error:', error);
      return {};
    }
  };

  // চেক করুন ইউজারের একটি পারমিশন আছে কিনা
  const hasPermission = (permissionKey) => {
    // সুপার অ্যাডমিন সব পারমিশন পায়
    if (adminUser?.role === 'super_admin') return true;
    return permissions[permissionKey] === true;
  };

  // চেক করুন ইউজার অন্যকে পারমিশন দিতে পারেন কিনা
  const canGrantPermission = (permissionKey) => {
    // সুপার অ্যাডমিন সব পারমিশন দিতে পারে
    if (adminUser?.role === 'super_admin') return true;
    // অন্যরা শুধু তাদের থাকা পারমিশন দিতে পারে
    return permissions[permissionKey] === true;
  };

  // পারমিশন আপডেট করুন
  const updatePermission = async (teacherId, permissionKey, isAllowed) => {
    try {
      // চেক করুন কারেন্ট ইউজারের এই পারমিশন দেওয়ার ক্ষমতা আছে কিনা
      if (!canGrantPermission(permissionKey) && adminUser?.role !== 'super_admin') {
        throw new Error('এই পারমিশন দেওয়ার অনুমতি আপনার নেই');
      }

      // চেক করুন কাউকে সুপার অ্যাডমিন বানানো হচ্ছে কিনা
      if (permissionKey === 'super_admin') {
        throw new Error('আপনি কাউকে সুপার অ্যাডমিন বানাতে পারবেন না');
      }

      const { data: existing } = await supabase
        .from('teacher_permissions')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('permission_key', permissionKey)
        .maybeSingle();

      let result;
      if (existing) {
        // আপডেট
        result = await supabase
          .from('teacher_permissions')
          .update({ 
            is_allowed: isAllowed, 
            granted_by: adminUser?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // ইনসার্ট
        result = await supabase
          .from('teacher_permissions')
          .insert([{
            teacher_id: teacherId,
            permission_key: permissionKey,
            is_allowed: isAllowed,
            granted_by: adminUser?.id,
          }]);
      }

      if (result.error) throw result.error;

      // লগ সংরক্ষণ
      await supabase
        .from('permission_logs')
        .insert([{
          action: isAllowed ? 'granted' : 'revoked',
          teacher_id: teacherId,
          permission_key: permissionKey,
          changed_by: adminUser?.id,
          old_value: existing?.is_allowed || false,
          new_value: isAllowed,
        }]);

      return { success: true };
    } catch (error) {
      console.error('Update permission error:', error);
      return { success: false, error: error.message };
    }
  };

  // ইউজারের পারমিশন লোড করুন (শুরুতে)
  useEffect(() => {
    if (adminUser?.id) {
      loadPermissions(adminUser.id).finally(() => setLoading(false));
    }
  }, [adminUser?.id]);

  return {
    permissions,
    loading,
    loadPermissions,
    hasPermission,
    canGrantPermission,
    updatePermission,
    ALL_PERMISSIONS,
  };
}

// ইউজারের পারমিশন লোড করার ফাংশন (কম্পোনেন্টের বাইরে ব্যবহারের জন্য)
export async function getUserPermissions(userId) {
  try {
    const { data, error } = await supabase
      .from('teacher_permissions')
      .select('*')
      .eq('teacher_id', userId);

    if (error) throw error;

    const permMap = {};
    data.forEach(item => {
      permMap[item.permission_key] = item.is_allowed;
    });
    return permMap;
  } catch (error) {
    console.error('Get user permissions error:', error);
    return {};
  }
}
