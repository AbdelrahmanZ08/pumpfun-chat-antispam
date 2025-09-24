/**
 * Simplified Pump Chat Client for Chrome Extension
 * Based on pump-chat-client functionality
 *
 * lolnuked StreamGuard - Auto Reply Module
 * Created by: Daniel "CEO of the XRPL" Keller
 * Twitter/X: @daniel_wwf (https://x.com/daniel_wwf)
 *
 * ATTRIBUTION REQUIRED: This attribution MUST NOT be removed.
 */

class PumpChatClient {
  constructor(options = {}) {
    this.roomId = options.roomId;
    this.username = options.username || 'anonymous';
    this.messageHistoryLimit = options.messageHistoryLimit || 100;
    this.socket = null;
    this.isConnected = false;
    this.messages = [];
    this.eventListeners = new Map();

    // Connection state
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  // Connect to pump.fun chat via WebSocket
  connect() {
    try {
      const socketUrl = `wss://pump.fun/socket.io/?EIO=4&transport=websocket`;
      this.socket = new WebSocket(socketUrl);

      this.socket.onopen = () => {
        console.log('PumpChatClient: Connected to pump.fun');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');

        // Join the room
        if (this.roomId) {
          this.joinRoom(this.roomId);
        }
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = (event) => {
        console.log('PumpChatClient: Connection closed', event);
        this.isConnected = false;
        this.emit('disconnected');

        // Auto-reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`PumpChatClient: Reconnection attempt ${this.reconnectAttempts}`);
            this.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        } else {
          this.emit('maxReconnectAttemptsReached');
        }
      };

      this.socket.onerror = (error) => {
        console.error('PumpChatClient: WebSocket error', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('PumpChatClient: Connection error', error);
      this.emit('error', error);
    }
  }

  // Handle incoming WebSocket messages
  handleMessage(data) {
    try {
      // Handle socket.io protocol
      if (data.startsWith('0')) {
        // Connection handshake
        console.log('PumpChatClient: Handshake received');
        return;
      }

      if (data.startsWith('40')) {
        // Connected to namespace
        console.log('PumpChatClient: Connected to namespace');
        return;
      }

      if (data.startsWith('42')) {
        // Event message
        const eventData = JSON.parse(data.substring(2));
        const [eventType, payload] = eventData;

        switch (eventType) {
          case 'message':
            this.handleChatMessage(payload);
            break;
          case 'messageHistory':
            this.handleMessageHistory(payload);
            break;
          case 'userLeft':
            this.emit('userLeft', payload);
            break;
          default:
            console.log('PumpChatClient: Unknown event type:', eventType);
        }
      }

    } catch (error) {
      console.error('PumpChatClient: Message parsing error', error);
      this.emit('error', error);
    }
  }

  // Handle individual chat messages
  handleChatMessage(messageData) {
    const message = {
      id: messageData.id,
      roomId: messageData.roomId,
      username: messageData.username,
      userAddress: messageData.userAddress,
      message: messageData.message,
      profile_image: messageData.profile_image,
      timestamp: messageData.timestamp,
      messageType: messageData.messageType || 'text',
      expiresAt: messageData.expiresAt
    };

    // Add to message history
    this.messages.push(message);
    if (this.messages.length > this.messageHistoryLimit) {
      this.messages.shift();
    }

    this.emit('message', message);
  }

  // Handle message history
  handleMessageHistory(messages) {
    if (Array.isArray(messages)) {
      this.messages = messages.slice(-this.messageHistoryLimit);
      this.emit('messageHistory', messages);
    }
  }

  // Join a chat room
  joinRoom(roomId) {
    if (!this.isConnected) {
      console.error('PumpChatClient: Not connected');
      return false;
    }

    try {
      const joinMessage = `42["joinRoom","${roomId}"]`;
      this.socket.send(joinMessage);
      console.log(`PumpChatClient: Joined room ${roomId}`);
      return true;
    } catch (error) {
      console.error('PumpChatClient: Error joining room', error);
      this.emit('error', error);
      return false;
    }
  }

  // Send a message to the current room
  sendMessage(message) {
    if (!this.isConnected) {
      console.error('PumpChatClient: Not connected');
      return false;
    }

    if (!this.roomId) {
      console.error('PumpChatClient: No room ID set');
      return false;
    }

    try {
      const messageData = {
        roomId: this.roomId,
        message: message.trim(),
        timestamp: new Date().toISOString()
      };

      const sendMessage = `42["sendMessage",${JSON.stringify(messageData)}]`;
      this.socket.send(sendMessage);
      console.log(`PumpChatClient: Sent message: "${message}"`);
      return true;
    } catch (error) {
      console.error('PumpChatClient: Error sending message', error);
      this.emit('error', error);
      return false;
    }
  }

  // Get stored messages
  getMessages(limit) {
    if (limit && limit > 0) {
      return this.messages.slice(-limit);
    }
    return [...this.messages];
  }

  // Get the latest message
  getLatestMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  // Check if connected and active
  isActive() {
    return this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  // Disconnect from chat
  disconnect() {
    if (this.socket) {
      this.isConnected = false;
      this.socket.close();
      this.socket = null;
      console.log('PumpChatClient: Disconnected');
    }
  }

  // Set room ID dynamically
  setRoomId(roomId) {
    this.roomId = roomId;
    if (this.isConnected) {
      this.joinRoom(roomId);
    }
  }
}

// Export for use in content script
window.PumpChatClient = PumpChatClient;