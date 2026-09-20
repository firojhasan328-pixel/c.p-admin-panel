import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AIChatLogs() {
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMessages: 0,
    transferred: 0,
    todaySessions: 0,
  });

  // ============================================
  // ডেটা লোড + রিয়েলটাইম
  // ============================================
  useEffect(() => {
    fetchSessions();
    fetchStats();

    const channel = supabase
      .channel('ai-chat-sessions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_chat_sessions' },
        () => {
          fetchSessions();
          fetchStats();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Fetch sessions error:', error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const { count: totalSessions } = await supabase
        .from('ai_chat_sessions')
        .select('*', { count: 'exact', head: true });

      const { count: totalMessages } = await supabase
        .from('ai_chat_messages')
        .select('*', { count: 'exact', head: true });

      const { count: transferred } = await supabase
        .from('ai_chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_transferred_to_whatsapp', true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todaySessions } = await supabase
        .from('ai_chat_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setStats({
        totalSessions: totalSessions || 0,
        totalMessages: totalMessages || 0,
        transferred: transferred || 0,
        todaySessions: todaySessions || 0,
      });
    } catch (error) {
      console.error('Stats error:', error);
    }
  };

  const fetchMessages = async (sessionId) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Fetch messages error:', error);
    }
    setMessagesLoading(false);
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    fetchMessages(session.id);
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('এই সেশন এবং সব মেসেজ ডিলিট করতে চান?')) return;

    try {
      await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('session_id', sessionId);

      await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);

      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setMessages([]);
      }

      fetchSessions();
      fetchStats();
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ ডিলিট করতে সমস্যা');
    }
  };

  const handleArchive = async (sessionId, isArchived) => {
    try {
      await supabase
        .from('ai_chat_sessions')
        .update({ is_archived: !isArchived })
        .eq('id', sessionId);

      fetchSessions();
    } catch (error) {
      console.error('Archive error:', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('⚠️ সব চ্যাট সেশন ডিলিট করতে চান? এটা ফিরিয়ে আনা যাবে না!')) return;
    if (!confirm('আপনি কি নিশ্চিত?')) return;

    try {
      await supabase.from('ai_chat_messages').delete().neq('id', 0);
      await supabase.from('ai_chat_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      setSelectedSession(null);
      setMessages([]);
      fetchSessions();
      fetchStats();
    } catch (error) {
      console.error('Clear error:', error);
      alert('❌ ডিলিট করতে সমস্যা');
    }
  };

  const getFilteredSessions = () => {
    let filtered = sessions;

    if (searchTerm) {
      filtered = filtered.filter((s) =>
        s.session_token?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus === 'transferred') {
      filtered = filtered.filter((s) => s.is_transferred_to_whatsapp);
    } else if (filterStatus === 'archived') {
      filtered = filtered.filter((s) => s.is_archived);
    } else if (filterStatus === 'active') {
      filtered = filtered.filter((s) => !s.is_archived);
    }

    return filtered;
  };

  const filteredSessions = getFilteredSessions();

  const formatTime = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleString('bn-BD', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={styles.container}>
      {/* হেডার */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>💬 AI চ্যাট লগ</h2>
          <p style={styles.subtitle}>
            কে কী জিজ্ঞেস করছে — সব দেখুন, WhatsApp ট্রান্সফার দেখুন
          </p>
        </div>
        {sessions.length > 0 && (
          <button onClick={handleClearAll} style={styles.clearBtn}>
            🗑️ সব ডিলিট
          </button>
        )}
      </div>

      {/* স্ট্যাট কার্ড */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <div style={styles.statIcon}>💬</div>
          <div>
            <div style={styles.statNumber}>{stats.totalSessions}</div>
            <div style={styles.statLabel}>মোট সেশন</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <div style={styles.statIcon}>📩</div>
          <div>
            <div style={styles.statNumber}>{stats.totalMessages}</div>
            <div style={styles.statLabel}>মোট মেসেজ</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <div style={styles.statIcon}>📞</div>
          <div>
            <div style={styles.statNumber}>{stats.transferred}</div>
            <div style={styles.statLabel}>WhatsApp গেছে</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
          <div style={styles.statIcon}>🆕</div>
          <div>
            <div style={styles.statNumber}>{stats.todaySessions}</div>
            <div style={styles.statLabel}>আজকের সেশন</div>
          </div>
        </div>
      </div>

      {/* দুই পাশে দুই প্যানেল */}
      <div style={styles.splitView}>
        {/* বাম: সেশন লিস্ট */}
        <div style={styles.sessionList}>
          <div style={styles.filterBar}>
            <input
              type="text"
              placeholder="🔍 সেশন ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">📌 সব</option>
              <option value="active">✅ অ্যাক্টিভ</option>
              <option value="transferred">📞 WhatsApp</option>
              <option value="archived">📦 আর্কাইভ</option>
            </select>
            <span style={styles.countBadge}>{filteredSessions.length}</span>
          </div>

          {loading ? (
            <div style={styles.loadingState}>⏳ লোড হচ্ছে...</div>
          ) : filteredSessions.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p>কোনো সেশন নেই</p>
            </div>
          ) : (
            <div style={styles.sessionsWrapper}>
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  style={{
                    ...styles.sessionItem,
                    ...(selectedSession?.id === session.id ? styles.sessionItemActive : {}),
                  }}
                >
                  <div style={styles.sessionRow}>
                    <span style={styles.sessionToken}>
                      {session.session_token?.substring(0, 12)}...
                    </span>
                    {session.is_transferred_to_whatsapp && (
                      <span style={styles.transferBadge}>📞</span>
                    )}
                    {session.is_archived && (
                      <span style={styles.archiveBadge}>📦</span>
                    )}
                  </div>
                  <div style={styles.sessionMeta}>
                    <span>💬 {session.message_count || 0} মেসেজ</span>
                    <span>🕐 {formatTime(session.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ডান: মেসেজ প্যানেল */}
        <div style={styles.messagePanel}>
          {!selectedSession ? (
            <div style={styles.emptyPanel}>
              <span style={styles.emptyIcon}>💬</span>
              <p style={{ color: '#94a3b8' }}>বাম দিক থেকে একটি সেশন সিলেক্ট করুন</p>
            </div>
          ) : (
            <>
              <div style={styles.messageHeader}>
                <div>
                  <div style={styles.messageTitle}>
                    সেশন: {selectedSession.session_token?.substring(0, 20)}...
                  </div>
                  <div style={styles.messageSubtitle}>
                    শুরু: {formatTime(selectedSession.created_at)} • শেষ: {formatTime(selectedSession.updated_at)}
                  </div>
                </div>
                <div style={styles.messageActions}>
                  <button
                    onClick={() => handleArchive(selectedSession.id, selectedSession.is_archived)}
                    style={styles.iconBtn}
                    title={selectedSession.is_archived ? 'আনআর্কাইভ' : 'আর্কাইভ'}
                  >
                    {selectedSession.is_archived ? '📂' : '📦'}
                  </button>
                  <button
                    onClick={() => handleDeleteSession(selectedSession.id)}
                    style={styles.iconBtnDanger}
                    title="ডিলিট"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div style={styles.messagesArea}>
                {messagesLoading ? (
                  <div style={styles.loadingState}>⏳ লোড হচ্ছে...</div>
                ) : messages.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>কোনো মেসেজ নেই</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.messageBubble,
                        ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                      }}
                    >
                      <div style={styles.messageRole}>
                        {msg.role === 'user' ? '👤 ইউজার' : '🤖 AI'}
                        {msg.triggered_whatsapp && (
                          <span style={styles.transferNote}>📞 WhatsApp এ পাঠানো</span>
                        )}
                      </div>
                      <div style={styles.messageContent}>{msg.content}</div>
                      <div style={styles.messageTime}>{formatTime(msg.created_at)}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// স্টাইল
// ============================================
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 16px 40px 16px',
    fontFamily: "'Hind Siliguri', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  clearBtn: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '14px',
    marginBottom: '20px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 18px',
    borderRadius: '14px',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  statIcon: { fontSize: '26px' },
  statNumber: { fontSize: '22px', fontWeight: '800', lineHeight: 1.2 },
  statLabel: { fontSize: '12px', opacity: 0.9 },
  splitView: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '16px',
    minHeight: '500px',
  },
  sessionList: {
    background: 'white',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '70vh',
  },
  filterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '100px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '13px',
    outline: 'none',
  },
  filterSelect: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '12px',
    outline: 'none',
    background: 'white',
  },
  countBadge: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '600',
    background: '#f1f5f9',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  sessionsWrapper: {
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sessionItem: {
    padding: '10px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    border: '1.5px solid #e2e8f0',
    transition: 'all 0.2s ease',
    background: 'white',
  },
  sessionItemActive: {
    background: '#f0fdf4',
    borderColor: '#16a34a',
  },
  sessionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
  },
  sessionToken: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'monospace',
    flex: 1,
  },
  transferBadge: { fontSize: '14px' },
  archiveBadge: { fontSize: '12px' },
  sessionMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#94a3b8',
  },
  messagePanel: {
    background: 'white',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '70vh',
    overflow: 'hidden',
  },
  emptyPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px 20px',
  },
  messageHeader: {
    padding: '14px 18px',
    borderBottom: '2px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  messageTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  messageSubtitle: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  messageActions: {
    display: 'flex',
    gap: '6px',
  },
  iconBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  iconBtnDanger: {
    background: '#fee2e2',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#f8fafc',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: '14px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  userMessage: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    background: 'white',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderBottomLeftRadius: '4px',
  },
  messageRole: {
    fontSize: '11px',
    fontWeight: '700',
    marginBottom: '4px',
    opacity: 0.85,
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  transferNote: {
    fontSize: '10px',
    background: '#fef3c7',
    color: '#f59e0b',
    padding: '1px 8px',
    borderRadius: '10px',
  },
  messageContent: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  messageTime: {
    fontSize: '10px',
    opacity: 0.7,
    marginTop: '4px',
    textAlign: 'right',
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#94a3b8',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#94a3b8',
  },
  emptyIcon: {
    fontSize: '56px',
    display: 'block',
    marginBottom: '12px',
  },
  '@media (max-width: 768px)': {
    splitView: {
      gridTemplateColumns: '1fr',
    },
  },
};
