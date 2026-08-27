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

  const checkSession = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('🔍 Session found for user:', session.user.id);
        
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (error) {
          console.error('❌ Admin query error:', error);
        }
        
        if (data) {
          setAdminUser(data);
          console.log('✅ Admin found in DB:', data.role);
        } else {
          // ডাটাবেসে না পেলে ইমেইল চেক করুন
          const userEmail = session.user.email;
          if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
            console.log('🔥 Super Admin found by email!');
            const manualAdmin = {
              id: session.user.id,
              user_id: session.user.id,
              email: userEmail,
              name: 'ফিরোজ হাসান',
              role: 'super_admin',
              is_active: true,
              created_at: new Date().toISOString()
            };
            setAdminUser(manualAdmin);
            
            // ডাটাবেসেও যোগ করে দিন
            try {
              await supabase
                .from('admin_users')
                .insert([{
                  user_id: session.user.id,
                  email: userEmail,
                  name: 'ফিরোজ হাসান',
                  role: 'super_admin',
                  is_active: true,
                  created_at: new Date().toISOString()
                }]);
              console.log('✅ Admin added to database!');
            } catch (err) {
              console.log('⚠️ Could not add to DB:', err);
            }
          } else {
            console.warn('⚠️ No admin record and not in super admin list');
            setAdminUser(null);
          }
        }
      } else {
        console.log('🔍 No session found');
      }
    } catch (error) {
      console.error('❌ Session check error:', error);
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
      console.log('🆔 User ID:', data.user.id);

      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (adminError) {
        console.error('❌ Admin query error:', adminError);
      }

      if (adminData) {
        console.log('✅ Admin found in DB:', adminData.role);
        setAdminUser(adminData);
        return { success: true };
      }

      // ডাটাবেসে না পেলে ইমেইল চেক করুন
      const userEmail = data.user.email;
      if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
        console.log('🔥 Super Admin found by email!');
        const manualAdmin = {
          id: data.user.id,
          user_id: data.user.id,
          email: userEmail,
          name: 'ফিরোজ হাসান',
          role: 'super_admin',
          is_active: true,
          created_at: new Date().toISOString()
        };
        setAdminUser(manualAdmin);
        
        try {
          await supabase
            .from('admin_users')
            .insert([{
              user_id: data.user.id,
              email: userEmail,
              name: 'ফিরোজ হাসান',
              role: 'super_admin',
              is_active: true,
              created_at: new Date().toISOString()
            }]);
          console.log('✅ Admin added to database!');
        } catch (err) {
          console.log('⚠️ Could not add to DB:', err);
        }
        
        return { success: true };
      }

      console.error('❌ No admin record found for user_id:', data.user.id);
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
