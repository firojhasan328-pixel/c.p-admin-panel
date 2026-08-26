import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (data) {
          setAdminUser(data);
          console.log('✅ Session restored:', data.email);
        } else {
          console.warn('⚠️ No admin record found for user:', session.user.id);
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
    setLoading(false);
  };

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

      // Check admin role
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (adminError) {
        console.error('❌ Admin query error:', adminError);
        return { success: false, error: 'অ্যাডমিন তথ্য পাওয়া যায়নি' };
      }

      if (!adminData) {
        console.error('❌ No admin record found for user');
        return { success: false, error: 'এই ব্যবহারকারীর অ্যাডমিন অ্যাক্সেস নেই' };
      }

      console.log('✅ Admin record found:', adminData.role);
      setAdminUser(adminData);
      return { success: true };

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
