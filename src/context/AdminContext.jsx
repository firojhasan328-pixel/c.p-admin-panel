import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AdminContext = createContext();

// ============================================
// সুপার অ্যাডমিন ইমেইল (হার্ডকোডেড)
// ============================================
const SUPER_ADMIN_EMAILS = [
  'firojhasan808@gmail.com',
  'firojhasan283@gmail.com',
];

// ============================================
// রোল হায়ারার্কি (কারা কাদের বানাতে পারবে)
// ============================================
const ROLE_HIERARCHY = {
  super_admin: ['super_admin', 'admin', 'sub_admin', 'teacher'],
  admin: ['admin', 'sub_admin', 'teacher'],
  sub_admin: ['sub_admin', 'teacher'],
  teacher: ['teacher'],
};

// ============================================
// Provider
// ============================================
export function AdminProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  // ============================================
  // ইউজারের রোল ও তথ্য লোড
  // ============================================
  const loadUserRoleAndPermissions = async (userId, email) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // ১. admin_users এ চেক
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (adminData && adminData.is_active) {
        console.log('✅ Admin found:', adminData.role);
        return {
          id: adminData.user_id || userId,
          user_id: adminData.user_id || userId,
          email: adminData.email,
          name: adminData.name || 'অ্যাডমিন',
          role: adminData.role,
          is_active: adminData.is_active,
          created_at: adminData.created_at,
        };
      }

      // ২. Super Admin Email চেক
      if (SUPER_ADMIN_EMAILS.includes(normalizedEmail)) {
        console.log('🔥 Super Admin detected by email');

        const superAdmin = {
          id: userId,
          user_id: userId,
          email: normalizedEmail,
          name: 'ফিরোজ হাসান',
          role: 'super_admin',
          is_active: true,
          created_at: new Date().toISOString(),
        };

        // DB-তে সেভ করার চেষ্টা
        try {
          await supabase
            .from('admin_users')
            .upsert(
              {
                user_id: userId,
                email: normalizedEmail,
                name: 'ফিরোজ হাসান',
                role: 'super_admin',
                is_active: true,
              },
              { onConflict: 'email' }
            );
        } catch (err) {
          console.log('⚠️ Could not save super admin:', err);
        }

        return superAdmin;
      }

      // ৩. teachers টেবিলে চেক (শিক্ষক কি না)
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (teacherData && teacherData.is_approved) {
        console.log('✅ Teacher found:', teacherData.name);
        return {
          id: userId,
          user_id: userId,
          email: normalizedEmail,
          name: teacherData.name || 'শিক্ষক',
          role: 'teacher',
          is_active: true,
          created_at: teacherData.created_at,
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Load user role error:', error);
      return null;
    }
  };

  // ============================================
  // সেশন চেক
  // ============================================
  const checkSession = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const userData = await loadUserRoleAndPermissions(
          session.user.id,
          session.user.email
        );

        if (userData) {
          setAdminUser(userData);
          console.log('✅ Admin loaded:', userData.role);
        } else {
          console.warn('⚠️ No admin record found');
          setAdminUser(null);
        }
      }
    } catch (error) {
      console.error('❌ Session check error:', error);
    }
    setLoading(false);
  };

  // ============================================
  // লগইন
  // ============================================
  const login = async (email, password) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password.trim(),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'ব্যবহারকারী পাওয়া যায়নি' };
      }

      const userData = await loadUserRoleAndPermissions(
        data.user.id,
        data.user.email
      );

      if (userData) {
        setAdminUser(userData);
        return { success: true };
      }

      // অ্যাক্সেস নেই — সাইন আউট করে দাও
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'এই অ্যাকাউন্টের অ্যাডমিন অ্যাক্সেস নেই',
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: 'লগইন প্রক্রিয়ায় সমস্যা' };
    }
  };

  // ============================================
  // লগআউট
  // ============================================
  const logout = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
  };

  // ============================================
  // ⭐ এই ইউজার এই রোলটি assign করতে পারবে কি না
  // ============================================
  const canAssignRole = (targetRole) => {
    const myRole = adminUser?.role;
    if (!myRole) return false;
    const allowed = ROLE_HIERARCHY[myRole] || [];
    return allowed.includes(targetRole);
  };

  // ============================================
  // ⭐ এই ইউজার যে রোলগুলো assign করতে পারবে
  // ============================================
  const getAssignableRoles = () => {
    const myRole = adminUser?.role;
    if (!myRole) return [];
    return ROLE_HIERARCHY[myRole] || [];
  };

  // ============================================
  // Context Value
  // ============================================
  const value = {
    adminUser,
    loading,
    login,
    logout,
    checkSession,

    // অথেনটিকেশন
    isAuthenticated: !!adminUser,

    // রোল চেক
    isSuperAdmin: adminUser?.role === 'super_admin',
    isAdmin: adminUser?.role === 'admin',
    isSubAdmin: adminUser?.role === 'sub_admin',
    isTeacher: adminUser?.role === 'teacher',

    // ⭐ নতুন ফাংশন
    canAssignRole,
    getAssignableRoles,

    // হায়ারার্কি এক্সপোর্ট (কোডের অন্য জায়গায় লাগতে পারে)
    ROLE_HIERARCHY,

    // পুরোনো কম্প্যাটিবিলিটির জন্য
    isAnyAdmin: ['super_admin', 'admin', 'sub_admin'].includes(
      adminUser?.role
    ),
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

// ============================================
// Hook
// ============================================
export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
