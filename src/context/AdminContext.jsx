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
        if (data) setAdminUser(data);
      }
    } catch (error) {
      console.error('Session error:', error);
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) throw error;
      await checkSession();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
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
