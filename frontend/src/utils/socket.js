import { io } from 'socket.io-client'

class SocketClient {
  constructor() {
    this.socket = null
    this.listeners = new Map()
  }
  
  connect() {
    if (this.socket?.connected) return
    
    this.socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    
    this.socket.on('connect', () => {
      console.log('✅ Socket connected')
    })
    
    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected')
    })
    
    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
    })
    
    // Re-attach listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback)
    })
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }
  
  on(event, callback) {
    this.listeners.set(event, callback)
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }
  
  off(event) {
    this.listeners.delete(event)
    if (this.socket) {
      this.socket.off(event)
    }
  }
  
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }
  
  joinNovel(novelId) {
    this.emit('join-novel', { novelId })
  }
  
  leaveNovel(novelId) {
    this.emit('leave-novel', { novelId })
  }
}

export const socket = new SocketClient()
