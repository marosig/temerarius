// Temerarius Chat Application - Core Chat Functionality

class TemerariusChat {
    constructor() {
        this.currentUser = null;
        this.messages = this.loadMessages();
        this.users = new Map();
        this.typingUsers = new Set();
        this.settings = this.loadSettings();
        this.lastActivity = Date.now();
        this.activityChecker = null;
        this.lastDisplayedMessageId = 0; // Track last displayed message for new users
        
        // Simulate real-time by polling every 500ms
        this.messagePoller = null;
        this.userPoller = null;
        this.typingPoller = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.startActivityMonitoring();
        console.log('Temerarius Chat initialized');
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Message form
        const messageForm = document.getElementById('messageForm');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => this.sendMessage(e));
        }

        // Message input typing
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', () => this.handleTyping());
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(e);
                }
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Window visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentUser) {
                this.updateUserStatus('online');
            }
        });

        // Before unload
        window.addEventListener('beforeunload', () => {
            if (this.currentUser) {
                this.updateUserStatus('offline');
            }
        });
    }

    handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('usernameInput').value.trim();
        const color = document.getElementById('colorSelect').value;
        
        if (!username) return;

        this.currentUser = {
            id: this.generateUserId(),
            username: username,
            color: color,
            joinedAt: Date.now(),
            status: 'online',
            lastSeen: Date.now()
        };

        // For new users, set lastDisplayedMessageId to current latest message
        // This ensures they start with an empty chat box
        const currentMessages = this.loadMessages();
        if (currentMessages.length > 0) {
            this.lastDisplayedMessageId = Math.max(...currentMessages.map(m => m.id || 0));
        }

        // Save user to storage
        this.saveUser(this.currentUser);
        
        // Add system message
        this.addSystemMessage(`${username} joined the chat`);
        
        // Switch to chat interface
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('chatInterface').classList.remove('hidden');
        
        // Clear messages container for new user (empty chat box)
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // Update UI theme
        document.documentElement.style.setProperty('--primary-color', color);
        
        // Start real-time simulation
        this.startRealTimeSimulation();
        
        // Focus message input
        document.getElementById('messageInput').focus();
        
        console.log('User logged in:', this.currentUser);
    }

    sendMessage(e) {
        e.preventDefault();
        
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text || !this.currentUser) return;

        const message = {
            id: this.generateMessageId(),
            userId: this.currentUser.id,
            username: this.currentUser.username,
            color: this.currentUser.color,
            text: text,
            timestamp: Date.now(),
            type: 'user'
        };

        // Add message to storage
        this.messages.push(message);
        this.saveMessages();
        
        // Clear input
        input.value = '';
        
        // Stop typing indicator
        this.stopTyping();
        
        // Update activity
        this.updateActivity();
        
        console.log('Message sent:', message);
    }

    addSystemMessage(text) {
        const message = {
            id: this.generateMessageId(),
            text: text,
            timestamp: Date.now(),
            type: 'system'
        };

        this.messages.push(message);
        this.saveMessages();
        
        console.log('System message added:', message);
    }

    handleTyping() {
        if (!this.currentUser) return;
        
        // Add current user to typing
        this.typingUsers.add(this.currentUser.username);
        this.saveTypingUsers();
        
        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Set timeout to stop typing
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 2000);
    }

    stopTyping() {
        if (!this.currentUser) return;
        
        this.typingUsers.delete(this.currentUser.username);
        this.saveTypingUsers();
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
    }

    updateUserStatus(status) {
        if (!this.currentUser) return;
        
        this.currentUser.status = status;
        this.currentUser.lastSeen = Date.now();
        this.saveUser(this.currentUser);
    }

    updateActivity() {
        this.lastActivity = Date.now();
        if (this.currentUser) {
            this.updateUserStatus('online');
        }
    }

    startActivityMonitoring() {
        // Check for user activity every 30 seconds
        this.activityChecker = setInterval(() => {
            const now = Date.now();
            const timeSinceActivity = now - this.lastActivity;
            
            if (this.currentUser) {
                if (timeSinceActivity > 300000) { // 5 minutes = away
                    this.updateUserStatus('away');
                } else if (timeSinceActivity > 60000) { // 1 minute = idle
                    this.updateUserStatus('idle');
                } else {
                    this.updateUserStatus('online');
                }
            }
        }, 30000);
    }

    startRealTimeSimulation() {
        // Poll for new messages every 500ms
        this.messagePoller = setInterval(() => {
            this.checkForNewMessages();
        }, 500);
        
        // Poll for user updates every 2 seconds
        this.userPoller = setInterval(() => {
            this.updateUsersList();
        }, 2000);
        
        // Poll for typing indicators every 1 second
        this.typingPoller = setInterval(() => {
            this.updateTypingIndicator();
        }, 1000);
        
        // Initial updates
        this.checkForNewMessages();
        this.updateUsersList();
    }

    stopRealTimeSimulation() {
        if (this.messagePoller) {
            clearInterval(this.messagePoller);
            this.messagePoller = null;
        }
        if (this.userPoller) {
            clearInterval(this.userPoller);
            this.userPoller = null;
        }
        if (this.typingPoller) {
            clearInterval(this.typingPoller);
            this.typingPoller = null;
        }
    }

    checkForNewMessages() {
        const storedMessages = this.loadMessages();
        
        // Find new messages based on lastDisplayedMessageId
        const newMessages = storedMessages.filter(msg => 
            msg.id > this.lastDisplayedMessageId && 
            (!this.currentUser || msg.userId !== this.currentUser.id)
        );
        
        if (newMessages.length > 0) {
            this.messages = storedMessages;
            this.lastDisplayedMessageId = Math.max(...storedMessages.map(m => m.id || 0));
            
            newMessages.forEach(msg => {
                if (this.settings.soundNotifications) {
                    this.playNotificationSound();
                }
            });
        }
    }

    getLastDisplayedMessageId() {
        return this.lastDisplayedMessageId;
    }

    updateUsersList() {
        const storedUsers = this.loadAllUsers();
        const usersList = document.getElementById('usersList');
        const onlineCount = document.getElementById('onlineCount');
        
        if (!usersList || !onlineCount) return;
        
        // Filter active users (seen in last 10 minutes)
        const now = Date.now();
        const activeUsers = storedUsers.filter(user => 
            now - user.lastSeen < 600000
        );
        
        // Sort by status and name
        activeUsers.sort((a, b) => {
            const statusOrder = { online: 0, idle: 1, away: 2, offline: 3 };
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            return statusDiff || a.username.localeCompare(b.username);
        });
        
        // Update users list
        usersList.innerHTML = activeUsers.map(user => `
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-avatar" style="background-color: ${user.color}">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <span class="user-name">${user.username}</span>
                <span class="user-status status-${user.status}">
                    ${user.status}
                </span>
            </div>
        `).join('');
        
        // Update online count
        const onlineUsers = activeUsers.filter(u => u.status === 'online');
        onlineCount.textContent = `${onlineUsers.length} online`;
        
        this.users = new Map(activeUsers.map(user => [user.id, user]));
    }

    updateTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (!indicator) return;
        
        const typingUsers = this.loadTypingUsers();
        const otherTypingUsers = Array.from(typingUsers).filter(username => 
            !this.currentUser || username !== this.currentUser.username
        );
        
        if (otherTypingUsers.length === 0) {
            indicator.textContent = '';
        } else if (otherTypingUsers.length === 1) {
            indicator.textContent = `${otherTypingUsers[0]} is typing...`;
        } else if (otherTypingUsers.length === 2) {
            indicator.textContent = `${otherTypingUsers.join(' and ')} are typing...`;
        } else {
            indicator.textContent = `${otherTypingUsers.slice(0, -1).join(', ')} and ${otherTypingUsers[otherTypingUsers.length - 1]} are typing...`;
        }
    }

    playNotificationSound() {
        if (!this.settings.soundNotifications) return;
        
        // Create a simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            console.log('Could not play notification sound:', e);
        }
    }

    logout() {
        if (this.currentUser) {
            // Mark user as logged out and remove from storage
            this.removeUserFromStorage(this.currentUser.id);
            
            // Add system message about logout
            this.addSystemMessage(`${this.currentUser.username} logged out`);
        }
        
        this.stopRealTimeSimulation();
        this.stopTyping();
        
        if (this.activityChecker) {
            clearInterval(this.activityChecker);
        }
        
        // Clear current user reference
        this.currentUser = null;
        this.lastDisplayedMessageId = 0;
        
        // Switch back to login screen
        document.getElementById('chatInterface').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        
        // Clear login form
        document.getElementById('usernameInput').value = '';
        
        // Clear messages container
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        console.log('User logged out and data cleared');
    }

    // Updated method to completely remove user from storage
    removeUserFromStorage(userId) {
        if (!userId) return;
        
        // Remove user from users storage completely
        const users = this.loadAllUsers().filter(u => u.id !== userId);
        localStorage.setItem('temerarius_users', JSON.stringify(users));
        
        // Remove user from typing users
        if (this.currentUser) {
            this.typingUsers.delete(this.currentUser.username);
            this.saveTypingUsers();
        }
        
        // Clear user's local message history (optional - you can remove this if you want to keep messages)
        this.messages = [];
        this.saveMessages();
        
        console.log('User completely removed from storage for user ID:', userId);
    }

    // Storage methods
    saveMessages() {
        localStorage.setItem('temerarius_messages', JSON.stringify(this.messages));
    }

    loadMessages() {
        const stored = localStorage.getItem('temerarius_messages');
        return stored ? JSON.parse(stored) : [];
    }

    saveUser(user) {
        const users = this.loadAllUsers().filter(u => u.id !== user.id);
        users.push(user);
        localStorage.setItem('temerarius_users', JSON.stringify(users));
    }

    loadAllUsers() {
        const stored = localStorage.getItem('temerarius_users');
        return stored ? JSON.parse(stored) : [];
    }

    saveTypingUsers() {
        localStorage.setItem('temerarius_typing', JSON.stringify(Array.from(this.typingUsers)));
    }

    loadTypingUsers() {
        const stored = localStorage.getItem('temerarius_typing');
        return new Set(stored ? JSON.parse(stored) : []);
    }

    saveSettings() {
        localStorage.setItem('temerarius_settings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const stored = localStorage.getItem('temerarius_settings');
        return stored ? JSON.parse(stored) : {
            soundNotifications: true,
            theme: 'dark'
        };
    }

    clearChatHistory() {
        this.messages = [];
        this.saveMessages();
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        console.log('Chat history cleared');
    }

    // Utility methods
    generateUserId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    generateMessageId() {
        return Date.now() + Math.random();
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.temerariusChat = new TemerariusChat();
});