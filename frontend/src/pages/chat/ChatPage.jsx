import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { chatAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { getInitials, timeFromNow } from '../../utils/helpers';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import './ChatPage.css';

export default function ChatPage() {
  const { conversationId }  = useParams();
  const { user: me }        = useAuth();
  const navigate            = useNavigate();

  const [conversations, setConversations]   = useState([]);
  const [activeConv, setActiveConv]         = useState(null);
  const [messages, setMessages]             = useState([]);
  const [text, setText]                     = useState('');
  const [loading, setLoading]               = useState(true);
  const [sending, setSending]               = useState(false);
  const [typing, setTyping]                 = useState(false);
  const [otherTyping, setOtherTyping]       = useState(false);
  const [searchQ, setSearchQ]               = useState('');
  const [searchRes, setSearchRes]           = useState([]);
  const [totalUnread, setTotalUnread]       = useState(0);

  const socketRef   = useRef(null);
  const messagesEnd = useRef(null);
  const typingTO    = useRef(null);
  const inputRef    = useRef(null);

  // Init socket
  useEffect(() => {
    if (!me) return;
    const socket = io('/', { withCredentials: true });
    socketRef.current = socket;
    socket.emit('join_user', me._id);

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });
    socket.on('user_typing',      () => setOtherTyping(true));
    socket.on('user_stop_typing', () => setOtherTyping(false));
    socket.on('conversation_updated', ({ conversationId: cid, lastMessage }) => {
      setConversations(prev => prev.map(c =>
        c._id === cid ? { ...c, lastMessage, myUnread: (c.myUnread || 0) + 1 } : c
      ));
    });

    return () => socket.disconnect();
  }, [me]);

  // Load conversations
  useEffect(() => {
    chatAPI.getConversations()
      .then(r => {
        setConversations(r.data.data);
        const unread = r.data.data.reduce((s, c) => s + (c.myUnread || 0), 0);
        setTotalUnread(unread);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Open conversation from URL param
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c._id === conversationId);
      if (conv) openConversation(conv);
    }
  }, [conversationId, conversations]);

  const openConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    navigate(`/chat/${conv._id}`, { replace: true });

    // Leave previous room, join new
    if (socketRef.current) {
      if (activeConv) socketRef.current.emit('leave_chat', activeConv._id);
      socketRef.current.emit('join_chat', conv._id);
    }

    // Load messages
    try {
      const r = await chatAPI.getMessages(conv._id);
      setMessages(r.data.data);
      // Reset unread
      setConversations(prev => prev.map(c =>
        c._id === conv._id ? { ...c, myUnread: 0 } : c
      ));
      setTimeout(scrollToBottom, 100);
    } catch { toast.error('Failed to load messages'); }
  }, [activeConv, navigate]);

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!text.trim() || !activeConv || sending) return;
    setSending(true);
    const t = text.trim();
    setText('');

    // Stop typing
    socketRef.current?.emit('stop_typing', { conversationId: activeConv._id, userId: me._id });

    try {
      const r = await chatAPI.sendMessage(activeConv._id, t);
      setMessages(prev => [...prev, r.data.data]);
      setConversations(prev => prev.map(c =>
        c._id === activeConv._id
          ? { ...c, lastMessage: { text: t, sender: me._id, createdAt: new Date() } }
          : c
      ));
      scrollToBottom();
    } catch { toast.error('Failed to send'); setText(t); }
    finally { setSending(false); }
  };

  const handleTyping = (val) => {
    setText(val);
    if (!activeConv || !socketRef.current) return;
    if (!typing) {
      setTyping(true);
      socketRef.current.emit('typing', { conversationId: activeConv._id, userId: me._id });
    }
    clearTimeout(typingTO.current);
    typingTO.current = setTimeout(() => {
      setTyping(false);
      socketRef.current?.emit('stop_typing', { conversationId: activeConv._id, userId: me._id });
    }, 1500);
  };

  // Search users to start new chat
  const handleSearch = async (q) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchRes([]); return; }
    try {
      const r = await userAPI.search({ q });
      setSearchRes(r.data.data.filter(u => u._id !== me._id));
    } catch {}
  };

  const startChat = async (userId) => {
    try {
      const r = await chatAPI.getOrCreate(userId);
      const conv = r.data.data;
      setSearchQ(''); setSearchRes([]);
      const exists = conversations.find(c => c._id === conv._id);
      if (!exists) setConversations(prev => [conv, ...prev]);
      openConversation(conv);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const getOtherUser = (conv) => conv?.participants?.find(p => p._id !== me?._id && p.username !== me?.username);

  if (!me) return <div className="empty-state"><h3>Login to access messages</h3><Link to="/login" className="btn btn-primary" style={{marginTop:12}}>Login</Link></div>;

  return (
    <div className="chat-page">
      {/* Left: Conversations sidebar */}
      <div className={`chat-sidebar ${activeConv ? 'hidden-mobile' : ''}`}>
        <div className="chat-sidebar-header">
          <h2 className="chat-sidebar-title display">MESSAGES</h2>
          {totalUnread > 0 && <span className="chat-unread-total">{totalUnread}</span>}
        </div>

        {/* New chat search */}
        <div className="chat-new-search">
          <input className="form-input" placeholder="🔍 Search users to message..."
            value={searchQ} onChange={e => handleSearch(e.target.value)} />
          {searchRes.length > 0 && (
            <div className="chat-search-results">
              {searchRes.map(u => (
                <div key={u._id} className="chat-search-item" onClick={() => startChat(u._id)}>
                  {u.avatar?.url
                    ? <img src={u.avatar.url} className="avatar avatar-sm" alt="" />
                    : <div className="chat-av-init sm">{getInitials(u.name)}</div>}
                  <div>
                    <div className="csi-name">{u.name}</div>
                    <div className="csi-meta">@{u.username} · {u.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div className="conv-list">
          {loading && <div style={{padding:20,textAlign:'center'}}><div className="spinner" /></div>}
          {!loading && conversations.length === 0 && (
            <div className="empty-state" style={{padding:'40px 20px'}}>
              <div className="es-icon">💬</div>
              <h3>No conversations yet</h3>
              <p>Search for a user above to start chatting</p>
            </div>
          )}
          {conversations.map(conv => {
            const other    = getOtherUser(conv);
            const isActive = activeConv?._id === conv._id;
            const unread   = conv.myUnread || 0;
            return (
              <div key={conv._id} className={`conv-item ${isActive ? 'active' : ''} ${unread > 0 ? 'unread' : ''}`}
                onClick={() => openConversation(conv)}>
                <div className="conv-avatar">
                  {other?.avatar?.url
                    ? <img src={other.avatar.url} className="avatar avatar-md" alt="" />
                    : <div className="chat-av-init">{getInitials(other?.name)}</div>}
                  {unread > 0 && <span className="conv-unread-dot">{unread}</span>}
                </div>
                <div className="conv-info">
                  <div className="conv-name">{other?.name || 'Unknown'}</div>
                  <div className="conv-last">
                    {conv.lastMessage?.sender?._id === me._id && <span>You: </span>}
                    {conv.lastMessage?.text || 'Start a conversation'}
                  </div>
                </div>
                <div className="conv-time">
                  {conv.lastMessage?.createdAt && timeFromNow(conv.lastMessage.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Message area */}
      <div className={`chat-main ${!activeConv ? 'hidden-mobile' : ''}`}>
        {!activeConv ? (
          <div className="chat-empty">
            <div className="ce-icon">💬</div>
            <h2>Select a conversation</h2>
            <p>Choose from your existing conversations or search for someone new</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button className="btn btn-ghost btn-sm back-btn" onClick={() => { setActiveConv(null); navigate('/chat'); }}>←</button>
              {(() => {
                const other = getOtherUser(activeConv);
                return (
                  <Link to={`/u/${other?.username}`} className="chat-header-user">
                    {other?.avatar?.url
                      ? <img src={other.avatar.url} className="avatar avatar-sm" alt="" />
                      : <div className="chat-av-init sm">{getInitials(other?.name)}</div>}
                    <div>
                      <div className="chat-header-name">{other?.name}</div>
                      <div className="chat-header-meta">@{other?.username}
                        {other?.role === 'organiser' && other?.organiserProfile?.isVerified && <span className="badge badge-blue" style={{fontSize:9,marginLeft:5}}>✓ Org</span>}
                      </div>
                    </div>
                  </Link>
                );
              })()}
            </div>

            {/* Messages */}
            <div className="messages-area">
              {messages.length === 0 && (
                <div className="messages-empty">
                  <div className="mes-icon">👋</div>
                  <p>Say hello to start the conversation!</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe   = msg.sender?._id === me._id || msg.sender?._id === me?.id;
                const showAv = !isMe && (i === 0 || messages[i-1]?.sender?._id !== msg.sender?._id);
                return (
                  <div key={msg._id} className={`msg-row ${isMe ? 'me' : 'other'}`}>
                    {!isMe && (
                      <div className="msg-avatar">
                        {showAv && (msg.sender?.avatar?.url
                          ? <img src={msg.sender.avatar.url} className="avatar avatar-xs" alt="" />
                          : <div className="chat-av-init xs">{getInitials(msg.sender?.name)}</div>)}
                      </div>
                    )}
                    <div className="msg-bubble-wrap">
                      <div className={`msg-bubble ${isMe ? 'me' : 'other'} ${msg.isDeleted ? 'deleted' : ''}`}>
                        {msg.text}
                      </div>
                      <div className="msg-time">
                        {timeFromNow(msg.createdAt)}
                        {isMe && msg.isRead && <span className="msg-read"> ✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {otherTyping && (
                <div className="msg-row other">
                  <div className="msg-avatar" />
                  <div className="typing-bubble">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <form className="chat-input-area" onSubmit={handleSend}>
              <input ref={inputRef} className="chat-input" placeholder="Type a message..."
                value={text} onChange={e => handleTyping(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(e)} />
              <button type="submit" className="btn btn-blue chat-send-btn" disabled={!text.trim() || sending}>
                {sending ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '➤'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
