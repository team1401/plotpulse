import crypto from 'crypto';

/**
 * Initialize WebSocket server with authentication
 */
export function initWebSocket(io, db) {
  // Authenticate WebSocket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    // Hash token and verify
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = db.prepare(`
      SELECT u.* 
      FROM users u
      JOIN api_keys ak ON u.id = ak.user_id
      WHERE ak.key_hash = ? AND ak.provider = 'plotpulse'
    `).get(keyHash);
    
    if (!user) {
      return next(new Error('Invalid token'));
    }
    
    // Attach user to socket
    socket.user = user;
    
    // Update last_used_at
    db.prepare(`
      UPDATE api_keys 
      SET last_used_at = ? 
      WHERE user_id = ? AND provider = 'plotpulse'
    `).run(Date.now(), user.id);
    
    next();
  });
  
  // Handle connections
  io.on('connection', (socket) => {
    console.log(`[WebSocket] User ${socket.user.email} connected (${socket.id})`);
    
    // Set connection timeout (1 hour max)
    const connectionTimeout = setTimeout(() => {
      console.log(`[WebSocket] Connection timeout for ${socket.user.email}`);
      socket.disconnect();
    }, 3600000); // 1 hour
    
    // Subscribe to novel updates
    socket.on('subscribe:novel', (novelId) => {
      try {
        // Verify user owns this novel
        const novel = db.prepare(`
          SELECT id FROM novels WHERE id = ? AND user_id = ?
        `).get(novelId, socket.user.id);
        
        if (!novel) {
          socket.emit('error', {
            code: 'UNAUTHORIZED',
            message: 'You do not have access to this novel'
          });
          return;
        }
        
        // Join room for this novel
        socket.join(`novel:${novelId}`);
        
        console.log(`[WebSocket] ${socket.user.email} subscribed to novel ${novelId}`);
        
        // Send confirmation
        socket.emit('subscribed', { novelId });
        
        // Send current progress
        const stats = db.prepare(`
          SELECT 
            COUNT(*) as total_chapters,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_chapters,
            MAX(chapter_number) as latest_chapter
          FROM chapters
          WHERE novel_id = ?
        `).get(novelId);
        
        socket.emit('progress', {
          novelId,
          ...stats
        });
      } catch (err) {
        console.error('[WebSocket] Subscribe error:', err);
        socket.emit('error', {
          code: 'SUBSCRIBE_ERROR',
          message: 'Failed to subscribe to novel updates'
        });
      }
    });
    
    // Unsubscribe from novel updates
    socket.on('unsubscribe:novel', (novelId) => {
      socket.leave(`novel:${novelId}`);
      console.log(`[WebSocket] ${socket.user.email} unsubscribed from novel ${novelId}`);
      socket.emit('unsubscribed', { novelId });
    });
    
    // Heartbeat to keep connection alive
    let heartbeatInterval;
    socket.on('ping', () => {
      socket.emit('pong');
    });
    
    // Send heartbeat every 30 seconds
    heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat');
    }, 30000);
    
    // Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log(`[WebSocket] User ${socket.user.email} disconnected (${socket.id})`);
      clearTimeout(connectionTimeout);
      clearInterval(heartbeatInterval);
      
      // Remove all listeners to prevent memory leaks
      socket.removeAllListeners();
    });
    
    // Handle errors
    socket.on('error', (err) => {
      console.error('[WebSocket] Socket error:', err);
    });
  });
  
  console.log('[WebSocket] Server initialized');
}

/**
 * Emit progress update to all subscribers of a novel
 */
export function emitProgress(io, novelId, data) {
  io.to(`novel:${novelId}`).emit('progress', {
    novelId,
    ...data,
    timestamp: Date.now()
  });
}

/**
 * Emit chapter completion to all subscribers
 */
export function emitChapterComplete(io, novelId, chapter) {
  io.to(`novel:${novelId}`).emit('chapter:complete', {
    novelId,
    chapterNumber: chapter.chapter_number,
    title: chapter.title,
    wordCount: chapter.word_count,
    timestamp: Date.now()
  });
}

/**
 * Emit error to all subscribers of a novel
 */
export function emitError(io, novelId, error) {
  io.to(`novel:${novelId}`).emit('generation:error', {
    novelId,
    error: {
      code: error.code,
      message: error.message,
      chapter: error.chapter
    },
    timestamp: Date.now()
  });
}

/**
 * Emit generation complete
 */
export function emitComplete(io, novelId) {
  io.to(`novel:${novelId}`).emit('generation:complete', {
    novelId,
    timestamp: Date.now()
  });
}
