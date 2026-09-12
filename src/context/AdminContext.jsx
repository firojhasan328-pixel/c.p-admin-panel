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
// রোল হায়ারার্কি
// ============================================
const ROLE_HIERARCHY = {
  super_admin: ['super_admin', 'admin', 'sub_admin', 'teacher'],
  admin: ['admin', 'sub_admin', 'teacher'],
  sub_admin: ['sub_admin', 'teacher'],
  teacher: ['teacher'],
};

export function AdminProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  // ============================================
  // ইউজারের রোল লোড — ⭐ PRIORITY BASED
  // ক্রম: admin_users → super_admin_email → teachers
  // ============================================
  const loadUserRoleAndPermissions = async (userId, email) => {
    try {
      const normalizedEmail = (email || '').toLowerCase().trim();

      console.log('🔍 Loading role for:', normalizedEmail);

      // ============================================
      // ১. ⭐ প্রথমে admin_users চেক (সবচেয়ে গুরুত্বপূর্ণ)
      // ============================================
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (adminData) {
        console.log('✅ Admin found in admin_users:', adminData.role);
        return {
          id: adminData.user_id || userId,
          user_id: adminData.user_id || userId,
          email: adminData.email || normalizedEmail,
          name: adminData.name || 'অ্যাডমিন',
          role: adminData.role,
          is_active: adminData.is_active !== false,
          created_at: adminData.created_at,
        };
      }

      // ============================================
      // ২. ⭐ Super Admin Email চেক
      // ============================================
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

      // ============================================
      // ৩. teachers টেবিলে চেক (শেষে)
      // ============================================
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (teacherData && teacherData.is_approved) {
        console.log('👨‍🏫 Teacher found:', teacherData.name);
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

      console.log('⚠️ No role found for:', normalizedEmail);
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

  const logout = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
  };

  // ============================================
  // রোল ভেরিফিকেশন
  // ============================================
  const canAssignRole = (targetRole) => {
    const myRole = adminUser?.role;
    if (!myRole) return false;
    const allowed = ROLE_HIERARCHY[myRole] || [];
    return allowed.includes(targetRole);
  };

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

    isAuthenticated: !!adminUser,

    // রোল চেক
    isSuperAdmin: adminUser?.role === 'super_admin',
    isAdmin: adminUser?.role === 'admin',
    isSubAdmin: adminUser?.role === 'sub_admin',
    isTeacher: adminUser?.role === 'teacher',

    canAssignRole,
    getAssignableRoles,

    ROLE_HIERARCHY,

    isAnyAdmin: ['super_admin', 'admin', 'sub_admin'].includes(
      adminUser?.role
    ),
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
