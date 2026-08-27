import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AdminContext = createContext();

// সুপার অ্যাডমিন ইমেইল লিস্ট (হার্ডকোডেড)
const SUPER_ADMIN_EMAILS = [
  'firojhasan808@gmail.com',
  'firojhasan283@gmail.com'
];

export function AdminProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  // =============================================
  // ✅ ইউজারের রোল ও পারমিশন লোড করুন
  // =============================================
  const loadUserRoleAndPermissions = async (userId, email) => {
    try {
      // ১. admin_users এ চেক করুন
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (adminData) {
        console.log('✅ Admin found in DB:', adminData.role);
        return adminData;
      }

      // ২. teachers টেবিলে চেক করুন (শিক্ষক কি না)
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (teacherData) {
        console.log('✅ Teacher found in DB:', teacherData.name);
        
        // ৩. teacher_permissions এ চেক করুন (পারমিশন আছে কি না)
        const { data: permData, error: permError } = await supabase
          .from('teacher_permissions')
          .select('*')
          .eq('teacher_email', email)
          .limit(1);

        if (permData && permData.length > 0) {
          console.log('✅ Teacher has permissions, auto-login allowed');
          
          // অটোমেটিক অ্যাডমিন তৈরি করুন
          const newAdmin = {
            id: userId,
            user_id: userId,
            email: email,
            name: teacherData.name || 'শিক্ষক',
            role: 'teacher', // ডিফল্ট রোল
            is_active: true,
            created_at: new Date().toISOString()
          };

          // admin_users এ যোগ করুন
          try {
            await supabase
              .from('admin_users')
              .insert([{
                user_id: userId,
                email: email,
                name: teacherData.name || 'শিক্ষক',
                role: 'teacher',
                is_active: true
              }]);
            console.log('✅ Auto-added to admin_users');
          } catch (err) {
            console.log('⚠️ Could not add to admin_users:', err);
          }

          return newAdmin;
        }
      }

      // ৪. SUPER_ADMIN_EMAILS চেক করুন
      if (SUPER_ADMIN_EMAILS.includes(email)) {
        console.log('🔥 Super Admin found by email!');
        const superAdmin = {
          id: userId,
          user_id: userId,
          email: email,
          name: 'ফিরোজ হাসান',
          role: 'super_admin',
          is_active: true,
          created_at: new Date().toISOString()
        };
        
        try {
          await supabase
            .from('admin_users')
            .insert([{
              user_id: userId,
              email: email,
              name: 'ফিরোজ হাসান',
              role: 'super_admin',
              is_active: true
            }]);
          console.log('✅ Super Admin added to database!');
        } catch (err) {
          console.log('⚠️ Could not add super admin:', err);
        }
        
        return superAdmin;
      }

      return null;
    } catch (error) {
      console.error('❌ Load user role error:', error);
      return null;
    }
  };

  const checkSession = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('🔍 Session found for user:', session.user.id);
        
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
      } else {
        console.log('🔍 No session found');
      }
    } catch (error) {
      console.error('❌ Session check error:', error);
    }
    setLoading(false);
  };

  // =============================================
  // ✅ লগইন ফাংশন
  // =============================================
  const login = async (email, password) => {
    try {
      console.log('🔑 Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        console.error('❌ Login error:', error.message);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        console.error('❌ No user data returned');
        return { success: false, error: 'ব্যবহারকারী পাওয়া যায়নি' };
      }

      console.log('✅ User logged in:', data.user.email);

      const userData = await loadUserRoleAndPermissions(
        data.user.id,
        data.user.email
      );

      if (userData) {
        setAdminUser(userData);
        console.log('✅ Admin set:', userData.role);
        return { success: true };
      }

      return { success: false, error: 'এই ব্যবহারকারীর অ্যাডমিন অ্যাক্সেস নেই' };

    } catch (error) {
      console.error('❌ Unexpected login error:', error);
      return { success: false, error: 'লগইন প্রক্রিয়ায় সমস্যা হয়েছে' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
  };

  return (
    <AdminContext.Provider value={{
      adminUser,
      loading,
      login,
      logout,
      isAuthenticated: !!adminUser,
      isSuperAdmin: adminUser?.role === 'super_admin',
      isAdmin: adminUser?.role === 'admin' || adminUser?.role === 'super_admin',
      isTeacher: adminUser?.role === 'teacher' || adminUser?.role === 'admin' || adminUser?.role === 'super_admin',
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider');
  return context;
}
