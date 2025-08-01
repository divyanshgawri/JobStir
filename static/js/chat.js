// static/js/chat.js
document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();

        if (message === '') {
            return;
        }

        // Display user's message
        appendMessage(message, 'user-message');
        userInput.value = '';

        // Show loading indicator
        const loadingIndicator = appendMessage('...', 'loading-message');
        
        try {
            // Send message to the backend
            const response = await fetch('/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            });

            // Remove loading indicator
            chatBox.removeChild(loadingIndicator);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get a response.');
            }

            const data = await response.json();
            // Display bot's response
            appendMessage(data.response, 'bot-message');

        } catch (error) {
            console.error('Error:', error);
            // Remove loading indicator on error too
            if (chatBox.contains(loadingIndicator)) {
                chatBox.removeChild(loadingIndicator);
            }
            appendMessage(`Sorry, something went wrong: ${error.message}`, 'bot-message');
        }
    });

    function appendMessage(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', className);
        
        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);

        chatBox.appendChild(messageDiv);
        // Scroll to the bottom
        chatBox.scrollTop = chatBox.scrollHeight;
        
        return messageDiv; // Return the element for potential removal (loading indicator)
    }
});