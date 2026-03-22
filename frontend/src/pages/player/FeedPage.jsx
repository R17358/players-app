import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postAPI, userAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { getInitials, timeFromNow, sportEmoji } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './FeedPage.css';

function PostCard({ post, onLike, onComment, onDelete, me }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [comments, setComments]         = useState(post.comments || []);
  const [liked, setLiked]               = useState(post.likes?.includes(me?._id));
  const [likeCount, setLikeCount]       = useState(post.likesCount || 0);

  const handleLike = async () => {
    try {
      await postAPI.like(post._id);
      setLiked(l => !l);
      setLikeCount(c => liked ? c - 1 : c + 1);
    } catch { toast.error('Failed to like'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const r = await postAPI.comment(post._id, { text: commentText });
      setComments(prev => [...prev, r.data.data]);
      setCommentText('');
    } catch { toast.error('Failed to comment'); }
  };

  const isMyPost = post.author?._id === me?._id;

  return (
    <div className="post-card card anim-fadeUp">
      {/* Header */}
      <div className="pc-header">
        <Link to={`/u/${post.author?.username}`} className="pc-author">
          {post.author?.avatar?.url
            ? <img src={post.author.avatar.url} className="avatar avatar-sm" alt="" />
            : <div className="pc-av-init">{getInitials(post.author?.name)}</div>}
          <div>
            <div className="pc-name">{post.author?.name}</div>
            <div className="pc-time">{timeFromNow(post.createdAt)}</div>
          </div>
        </Link>
        <div className="pc-header-right">
          {post.postType !== 'regular' && (
            <span className={`badge badge-${post.postType === 'achievement' ? 'yellow' : post.postType === 'result' ? 'green' : 'blue'}`}>
              {post.postType === 'tournament_announcement' ? '🏆 Tournament' :
               post.postType === 'achievement' ? '🏅 Achievement' :
               post.postType === 'result' ? '🎯 Result' : ''}
            </span>
          )}
          {isMyPost && (
            <button className="pc-delete" onClick={() => onDelete(post._id)} title="Delete post">🗑️</button>
          )}
        </div>
      </div>

      {/* Tournament link */}
      {post.tournament && (
        <Link to={`/tournaments/${post.tournament.slug || post.tournament._id}`} className="pc-tournament-link">
          🏆 {post.tournament.title}
        </Link>
      )}

      {/* Content */}
      {post.content && <p className="pc-content">{post.content}</p>}

      {/* Media */}
      {post.media?.length > 0 && (
        <div className={`pc-media-grid ${post.media.length > 1 ? 'grid' : ''}`}>
          {post.media.slice(0, 4).map((m, i) => (
            <img key={i} src={m.url} alt="" className="pc-media-img" />
          ))}
        </div>
      )}

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="pc-tags">
          {post.tags.map((t, i) => <span key={i} className="pc-tag">#{t}</span>)}
        </div>
      )}

      {/* Actions */}
      <div className="pc-actions">
        <button className={`pc-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
          {liked ? '❤️' : '🤍'} <span>{likeCount}</span>
        </button>
        <button className="pc-action-btn" onClick={() => setShowComments(s => !s)}>
          💬 <span>{comments.length}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="pc-comments">
          {comments.map((c, i) => (
            <div key={i} className="pc-comment">
              <Link to={`/u/${c.user?.username}`}>
                {c.user?.avatar?.url
                  ? <img src={c.user.avatar.url} className="avatar avatar-xs" alt="" />
                  : <div className="pc-av-init xs">{getInitials(c.user?.name)}</div>}
              </Link>
              <div className="pc-comment-body">
                <span className="pc-comment-author">{c.user?.name}</span>
                <span className="pc-comment-text">{c.text}</span>
              </div>
            </div>
          ))}
          {me && (
            <form className="pc-comment-form" onSubmit={handleComment}>
              {me.avatar?.url
                ? <img src={me.avatar.url} className="avatar avatar-xs" alt="" />
                : <div className="pc-av-init xs">{getInitials(me.name)}</div>}
              <input className="pc-comment-input" placeholder="Write a comment..."
                value={commentText} onChange={e => setCommentText(e.target.value)} />
              <button type="submit" className="btn btn-blue btn-sm" disabled={!commentText.trim()}>Post</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const { user: me }          = useAuth();
  const [posts, setPosts]     = useState([]);
  const [tab, setTab]         = useState('feed');
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [suggestions, setSuggestions] = useState([]);

  // New post state
  const [newPost, setNewPost]     = useState('');
  const [postType, setPostType]   = useState('regular');
  const [posting, setPosting]     = useState(false);

  useEffect(() => {
    loadPosts(1, tab);
    if (me) userAPI.getSuggestions().then(r => setSuggestions(r.data.data)).catch(() => {});
  }, [tab]);

  const loadPosts = async (p = 1, t = tab) => {
    if (p === 1) setLoading(true);
    try {
      const fn = t === 'feed' ? postAPI.getFeed : postAPI.getExplore;
      const r  = await fn({ page: p, limit: 10 });
      setPosts(prev => p === 1 ? r.data.data : [...prev, ...r.data.data]);
      setHasMore(r.data.data.length === 10);
      setPage(p);
    } catch { toast.error('Failed to load posts'); }
    finally { setLoading(false); }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const r = await postAPI.create({ content: newPost, postType });
      setPosts(prev => [r.data.data, ...prev]);
      setNewPost(''); setPostType('regular');
      toast.success('Posted! 🎉');
    } catch { toast.error('Failed to post'); }
    finally { setPosting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await postAPI.delete(id);
      setPosts(prev => prev.filter(p => p._id !== id));
      toast.success('Post deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="feed-page">
      {/* Main feed column */}
      <div className="feed-main">
        {/* Create post (logged in only) */}
        {me && (
          <div className="create-post card">
            <div className="cp-top">
              {me.avatar?.url
                ? <img src={me.avatar.url} className="avatar avatar-md" alt="" />
                : <div className="pc-av-init">{getInitials(me.name)}</div>}
              <textarea className="cp-input" placeholder="Share an update, achievement, or tournament result..."
                value={newPost} onChange={e => setNewPost(e.target.value)} rows={3} />
            </div>
            <div className="cp-bottom">
              <div className="cp-types">
                {[['regular','💬 Post'],['achievement','🏅 Achievement'],['result','🎯 Result']].map(([t, l]) => (
                  <button key={t} className={`cp-type-btn ${postType === t ? 'active' : ''}`}
                    onClick={() => setPostType(t)}>{l}</button>
                ))}
              </div>
              <button className="btn btn-primary btn-sm" onClick={handlePost}
                disabled={!newPost.trim() || posting}>
                {posting ? <span className="spinner" style={{width:14,height:14,borderWidth:2}} /> : 'Post'}
              </button>
            </div>
          </div>
        )}

        {/* Feed / Explore tabs */}
        <div className="tab-bar" style={{ marginBottom: 16 }}>
          <button className={`tab-btn ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>
            👥 Following
          </button>
          <button className={`tab-btn ${tab === 'explore' ? 'active' : ''}`} onClick={() => setTab('explore')}>
            🌐 Explore
          </button>
        </div>

        {loading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="es-icon">📰</div>
            <h3>{tab === 'feed' ? 'Your feed is empty' : 'No posts yet'}</h3>
            {tab === 'feed' && <p>Follow players and organisers to see their posts here</p>}
          </div>
        ) : (
          <>
            {posts.map((post, i) => (
              <PostCard key={post._id} post={post} me={me}
                onLike={() => {}} onComment={() => {}} onDelete={handleDelete} />
            ))}
            {hasMore && (
              <button className="btn btn-outline" style={{ width:'100%', justifyContent:'center' }}
                onClick={() => loadPosts(page + 1)}>
                Load more
              </button>
            )}
          </>
        )}
      </div>

      {/* Right: Suggestions */}
      <div className="feed-sidebar">
        {me && suggestions.length > 0 && (
          <div className="card feed-suggestions">
            <div className="section-title">Who to Follow</div>
            {suggestions.map(u => (
              <div key={u._id} className="suggestion-row">
                <Link to={`/u/${u.username}`} className="sug-left">
                  {u.avatar?.url
                    ? <img src={u.avatar.url} className="avatar avatar-sm" alt="" />
                    : <div className="pc-av-init sm">{getInitials(u.name)}</div>}
                  <div>
                    <div className="sug-name">{u.name}</div>
                    <div className="sug-meta">@{u.username}</div>
                  </div>
                </Link>
                <Link to={`/u/${u.username}`} className="btn btn-outline btn-sm">View</Link>
              </div>
            ))}
          </div>
        )}

        {!me && (
          <div className="card feed-login-card">
            <div className="flc-title">Join SportVibe</div>
            <p className="flc-sub">Follow athletes, track tournaments, and share your achievements</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <Link to="/register" className="btn btn-primary" style={{ justifyContent:'center' }}>Create Account</Link>
              <Link to="/login" className="btn btn-outline" style={{ justifyContent:'center' }}>Log In</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
