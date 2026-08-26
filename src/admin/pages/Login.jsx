import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

export default function Login() {
  const { login, isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // যদি already authenticated হয় তাহলে Dashboard-এ redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Login সফল হলে Dashboard-এ redirect
        navigate('/');
      } else {
        setError(result.error || 'লগইন ব্যর্থ');
      }
    } catch (err) {
      setError('লগইন করতে সমস্যা হয়েছে');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🔐</div>
        <h1 style={styles.title}>অ্যাডমিন লগইন</h1>
        <p style={styles.subtitle}>চিলমারী প্রি ক্যাডেট মাদ্রাসা</p>
        {error && <div style={styles.errorBox}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>📧 ইমেইল</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="admin@email.com" 
              required 
              style={styles.input}
              disabled={loading}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>🔑 পাসওয়ার্ড</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
              style={styles.input}
              disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '⏳ লগইন হচ্ছে...' : '🚀 লগইন'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: 'linear-gradient(135deg, #064e3b, #14532d)', 
    padding: '20px' 
  },
  card: { 
    background: 'white', 
    padding: '40px 32px', 
    borderRadius: '28px', 
    maxWidth: '400px', 
    width: '100%', 
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' 
  },
  logo: { fontSize: '48px', textAlign: 'center', marginBottom: '8px' },
  title: { 
    fontSize: '24px', 
    fontWeight: '800', 
    color: '#0f172a', 
    textAlign: 'center', 
    margin: '0 0 4px 0' 
  },
  subtitle: { 
    fontSize: '14px', 
    color: '#64748b', 
    textAlign: 'center', 
    margin: '0 0 24px 0' 
  },
  errorBox: { 
    background: '#fee2e2', 
    color: '#991b1b', 
    padding: '10px 14px', 
    borderRadius: '10px', 
    fontSize: '13px', 
    marginBottom: '16px', 
    borderLeft: '4px solid #dc2626' 
  },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#334155' },
  input: { 
    padding: '12px 14px', 
    borderRadius: '12px', 
    border: '1.5px solid #e2e8f0', 
    fontSize: '14px', 
    outline: 'none', 
    backgroundColor: '#f8fafc' 
  },
  button: { 
    background: 'linear-gradient(135deg, #16a34a, #15803d)', 
    color: 'white', 
    border: 'none', 
    padding: '14px', 
    borderRadius: '12px', 
    fontSize: '16px', 
    fontWeight: '700', 
    boxShadow: '0 6px 20px rgba(22,163,74,0.3)', 
    marginTop: '4px' 
  },
};
