// Temerarius Chat Application - UI Management

class TemerariusUI {
    constructor() {
        this.messagesContainer = null;
        this.autoScroll = true;
        this.lastMessageCount = 0;
        
        this.init();
    }

    init() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.bindUIEvents();
        this.startUIUpdateLoop();
        console.log('Temerarius UI initialized');
    }

    bindUIEvents() {
        // Settings modal
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeSettings = document.getElementById('closeSettings');
        
        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', () => {
                settingsModal.classList.remove('hidden');
                this.loadSettingsModal();
            });
        }
        
        if (closeSettings && settingsModal) {
            closeSettings.addEventListener('click', () => {
                settingsModal.classList.add('hidden');
            });
            
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.classList.add('hidden');
                }
            });
        }

        // Settings controls
        const newColorSelect = document.getElementById('newColorSelect');
        const soundToggle = document.getElementById('soundToggle');
        const clearChatBtn = document.getElementById('clearChatBtn');
        
        if (newColorSelect) {
            newColorSelect.addEventListener('change', (e) => {
                this.changeUserColor(e.target.value);
            });
        }
        
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.toggleSound(e.target.checked);
            });
        }
        
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                this.clearChat();
            });
        }

        // Emoji button (placeholder for future emoji picker)
        const emojiBtn = document.getElementById('emojiBtn');
        if (emojiBtn) {
            emojiBtn.addEventListener('click', () => {
                this.showEmojiTooltip();
            });
        }

        // Messages container scroll
        if (this.messagesContainer) {
            this.messagesContainer.addEventListener('scroll', () => {
                this.handleScroll();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    startUIUpdateLoop() {
        // Update UI every 100ms for smooth animations
        setInterval(() => {
            this.updateMessagesUI();
            this.updateActivityIndicators();
        }, 100);
    }

    updateMessagesUI() {
        if (!window.temerariusChat || !this.messagesContainer) return;
        
        const messages = window.temerariusChat.messages;
        
        // Only update if message count changed
        if (messages.length === this.lastMessageCount) return;
        
        this.renderMessages(messages);
        this.lastMessageCount = messages.length;
    }

    renderMessages(messages) {
        if (!this.messagesContainer) return;
        
        // Remove welcome message if it exists
        const welcomeMsg = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg && messages.length > 0) {
            welcomeMsg.remove();
        }
        
        // Get currently displayed messages
        const displayedMessages = Array.from(this.messagesContainer.querySelectorAll('.message, .system-message'))
            .map(el => el.dataset.messageId);
        
        // Find new messages to add
        const newMessages = messages.filter(msg => !displayedMessages.includes(msg.id.toString()));
        
        // Add new messages
        newMessages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            this.messagesContainer.appendChild(messageEl);
        });
        
        // Auto-scroll if user is at bottom
        if (this.autoScroll && newMessages.length > 0) {
            this.scrollToBottom();
        }
        
        // Limit message history to prevent memory issues
        this.limitMessageHistory();
    }

    createMessageElement(message) {
        const messageEl = document.createElement('div');
        messageEl.dataset.messageId = message.id;
        
        if (message.type === 'system') {
            messageEl.className = 'system-message';
            messageEl.innerHTML = `
                <i class="fas fa-info-circle"></i>
                ${this.escapeHtml(message.text)}
            `;
        } else {
            const isOwn = window.temerariusChat.currentUser && 
                         message.userId === window.temerariusChat.currentUser.id;
            
            messageEl.className = `message ${isOwn ? 'own' : ''}`;
            messageEl.innerHTML = `
                <div class="message-avatar" style="background-color: ${message.color}">
                    ${message.username.charAt(0).toUpperCase()}
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author" style="color: ${message.color}">
                            ${this.escapeHtml(message.username)}
                        </span>
                        <span class="message-time">
                            ${this.formatTime(message.timestamp)}
                        </span>
                    </div>
                    <div class="message-text">
                        ${this.formatMessageText(message.text)}
                    </div>
                </div>
            `;
        }
        
        return messageEl;
    }

    formatMessageText(text) {
        // Escape HTML
        let formatted = this.escapeHtml(text);
        
        // Convert URLs to links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: var(--primary-color); text-decoration: underline;">$1</a>'
        );
        
        // Convert simple emojis
        const emojiMap = {
            ':)': '😊',
            ':D': '😃',
            ':(': '😢',
            ':P': '😛',
            ';)': '😉',
            '<3': '❤️',
            '</3': '💔',
            ':heart:': '❤️',
            ':fire:': '🔥',
            ':star:': '⭐',
            ':thumbs_up:': '👍',
            ':thumbs_down:': '👎'
        };
        
        Object.entries(emojiMap).forEach(([key, emoji]) => {
            formatted = formatted.replace(new RegExp(this.escapeRegex(key), 'g'), emoji);
        });
        
        return formatted;
    }

    limitMessageHistory() {
        const messageElements = this.messagesContainer.querySelectorAll('.message, .system-message');
        const maxMessages = 500;
        
        if (messageElements.length > maxMessages) {
            const toRemove = messageElements.length - maxMessages;
            for (let i = 0; i < toRemove; i++) {
                messageElements[i].remove();
            }
        }
    }

    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    handleScroll() {
        if (!this.messagesContainer) return;
        
        const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        
        this.autoScroll = isAtBottom;
    }

    updateActivityIndicators() {
        // Update user status indicators
        const userItems = document.querySelectorAll('.user-item');
        userItems.forEach(item => {
            const status = item.querySelector('.user-status');
            if (status) {
                const statusText = status.textContent.trim();
                status.className = `user-status status-${statusText}`;
                
                // Add status dots
                let dot = status.querySelector('.status-dot');
                if (!dot) {
                    dot = document.createElement('span');
                    dot.className = 'status-dot';
                    status.prepend(dot);
                }
                
                dot.style.backgroundColor = this.getStatusColor(statusText);
            }
        });
        
        // Update typing indicator animation
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator && typingIndicator.textContent) {
            typingIndicator.classList.add('typing-animation');
        } else if (typingIndicator) {
            typingIndicator.classList.remove('typing-animation');
        }
    }

    getStatusColor(status) {
        switch (status) {
            case 'online': return 'var(--success-color)';
            case 'idle': return 'var(--warning-color)';
            case 'away': return 'var(--danger-color)';
            default: return 'var(--muted-text)';
        }
    }

    // Settings Modal Methods
    loadSettingsModal() {
        if (!window.temerariusChat) return;
        
        const settings = window.temerariusChat.settings;
        const currentUser = window.temerariusChat.currentUser;
        
        // Load current color
        const colorSelect = document.getElementById('newColorSelect');
        if (colorSelect && currentUser) {
            colorSelect.value = currentUser.color;
        }
        
        // Load sound setting
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.checked = settings.soundNotifications;
        }
    }

    changeUserColor(newColor) {
        if (!window.temerariusChat || !window.temerariusChat.currentUser) return;
        
        // Update user color
        window.temerariusChat.currentUser.color = newColor;
        window.temerariusChat.saveUser(window.temerariusChat.currentUser);
        
        // Update UI theme
        document.documentElement.style.setProperty('--primary-color', newColor);
        
        // Add system message
        window.temerariusChat.addSystemMessage(
            `${window.temerariusChat.currentUser.username} changed their color`
        );
        
        console.log('User color changed to:', newColor);
    }

    toggleSound(enabled) {
        if (!window.temerariusChat) return;
        
        window.temerariusChat.settings.soundNotifications = enabled;
        window.temerariusChat.saveSettings();
        
        console.log('Sound notifications:', enabled ? 'enabled' : 'disabled');
    }

    clearChat() {
        if (!window.temerariusChat) return;
        
        if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
            window.temerariusChat.clearChatHistory();
            
            // Clear UI
            if (this.messagesContainer) {
                this.messagesContainer.innerHTML = `
                    <div class="welcome-message">
                        <i class="fas fa-rocket"></i>
                        <h3>Welcome to Temerarius!</h3>
                        <p>Start chatting with people from around the world</p>
                    </div>
                `;
            }
            
            // Close modal
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.add('hidden');
            }
            
            console.log('Chat history cleared');
        }
    }

    showEmojiTooltip() {
        const emojiBtn = document.getElementById('emojiBtn');
        if (!emojiBtn) return;
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'emoji-tooltip';
        tooltip.innerHTML = `
            <div class="emoji-grid">
                <span class="emoji" data-emoji="😊">😊</span>
                <span class="emoji" data-emoji="😃">😃</span>
                <span class="emoji" data-emoji="😢">😢</span>
                <span class="emoji" data-emoji="😛">😛</span>
                <span class="emoji" data-emoji="😉">😉</span>
                <span class="emoji" data-emoji="❤️">❤️</span>
                <span class="emoji" data-emoji="🔥">🔥</span>
                <span class="emoji" data-emoji="⭐">⭐</span>
                <span class="emoji" data-emoji="👍">👍</span>
                <span class="emoji" data-emoji="👎">👎</span>
            </div>
        `;
        
        // Position tooltip
        const rect = emojiBtn.getBoundingClientRect();
        tooltip.style.position = 'absolute';
        tooltip.style.bottom = '60px';
        tooltip.style.left = '10px';
        tooltip.style.background = 'var(--dark-surface)';
        tooltip.style.border = '1px solid var(--border-color)';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '0.5rem';
        tooltip.style.boxShadow = 'var(--shadow-lg)';
        tooltip.style.zIndex = '1000';
        
        // Add tooltip to DOM
        emojiBtn.parentElement.appendChild(tooltip);
        
        // Handle emoji clicks
        tooltip.addEventListener('click', (e) => {
            if (e.target.classList.contains('emoji')) {
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    messageInput.value += e.target.dataset.emoji;
                    messageInput.focus();
                }
                tooltip.remove();
            }
        });
        
        // Remove tooltip when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function removeTooltip(e) {
                if (!tooltip.contains(e.target) && e.target !== emojiBtn) {
                    tooltip.remove();
                    document.removeEventListener('click', removeTooltip);
                }
            });
        }, 100);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to send message
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const messageForm = document.getElementById('messageForm');
            if (messageForm) {
                messageForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal:not(.hidden)');
            modals.forEach(modal => modal.classList.add('hidden'));
        }
        
        // Ctrl/Cmd + K to focus message input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.focus();
            }
        }
    }

    handleResize() {
        // Adjust layout for mobile
        const sidebar = document.querySelector('.sidebar');
        const chatContent = document.querySelector('.chat-content');
        
        if (window.innerWidth <= 768) {
            if (sidebar) sidebar.style.display = 'none';
            if (chatContent) chatContent.style.width = '100%';
        } else {
            if (sidebar) sidebar.style.display = '';
            if (chatContent) chatContent.style.width = '';
        }
    }

    // Utility methods
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Add CSS for emoji tooltip and animations
const additionalStyles = `
    .emoji-tooltip {
        animation: fadeIn 0.2s ease;
    }
    
    .emoji-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.5rem;
    }
    
    .emoji {
        padding: 0.25rem;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.2s ease;
        text-align: center;
        font-size: 1.2rem;
    }
    
    .emoji:hover {
        background-color: var(--dark-surface-hover);
    }
    
    .typing-animation {
        animation: pulse 1.5s infinite;
    }
    
    .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 0.25rem;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.temerariusUI = new TemerariusUI();
});