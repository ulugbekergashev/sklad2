import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react';
import { apiPost } from '../api';

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Salom! Men sizning sun\'iy intellekt yordamchingizman. Menga ombor bo\'yicha buyruq bering (masalan: "Ali akaga 500 kg sement chiqim qil, 3 million qarzga yoz").' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const res = await apiPost('/ai/command', { message: userMsg });
            setMessages(prev => [...prev, {
                role: 'ai',
                text: res.message,
                success: res.success,
                action: res.action
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'ai',
                text: `Xatolik: ${err.message}`,
                success: false
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ai-assistant-container">
            {/* AI Toggle Button */}
            <button
                className={`ai-toggle-btn ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Sparkles size={24} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="ai-chat-window animate-in">
                    <div className="ai-chat-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Bot size={20} />
                            <strong style={{ fontSize: '1rem' }}>AI Yordamchi</strong>
                        </div>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 4 }}>Gemini 2.0</span>
                    </div>

                    <div className="ai-chat-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`ai-message-wrapper ${msg.role}`}>
                                {msg.role === 'ai' && (
                                    <div className="ai-avatar"><Bot size={16} /></div>
                                )}
                                <div className={`ai-message ${msg.role} ${msg.success === false ? 'error' : ''}`}>
                                    {msg.text.split('\n').map((line, j) => (
                                        <div key={j}>{line}</div>
                                    ))}
                                    {msg.action && msg.action !== 'info' && msg.action !== 'error' && (
                                        <div className="ai-action-badge">Bajarildi: {msg.action}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="ai-message-wrapper ai">
                                <div className="ai-avatar"><Bot size={16} /></div>
                                <div className="ai-message ai" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Loader2 size={14} className="spin" /> O'ylanmoqda...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="ai-chat-input" onSubmit={handleSend}>
                        <input
                            type="text"
                            placeholder="Buyruq yozing..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                        />
                        <button type="submit" disabled={!input.trim() || isLoading}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}

            <style>{`
                .ai-assistant-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }
                .ai-toggle-btn {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .ai-toggle-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
                }
                .ai-toggle-btn.open {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                    box-shadow: 0 2px 8px var(--shadow);
                }
                .ai-chat-window {
                    width: 380px;
                    height: 540px;
                    max-height: calc(100vh - 100px);
                    background: var(--bg-primary);
                    border-radius: 16px;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
                    border: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    margin-bottom: 16px;
                }
                .ai-chat-header {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .ai-chat-messages {
                    flex: 1;
                    padding: 16px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .ai-message-wrapper {
                    display: flex;
                    gap: 10px;
                    max-width: 85%;
                }
                .ai-message-wrapper.user {
                    align-self: flex-end;
                    flex-direction: row-reverse;
                }
                .ai-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .ai-message {
                    padding: 12px 14px;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    line-height: 1.5;
                }
                .ai-message.ai {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                    border-top-left-radius: 4px;
                }
                .ai-message.user {
                    background: #6366f1;
                    color: white;
                    border-top-right-radius: 4px;
                }
                .ai-message.error {
                    background: var(--warning-bg);
                    color: var(--warning);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .ai-action-badge {
                    display: inline-block;
                    margin-top: 8px;
                    padding: 4px 8px;
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .ai-chat-input {
                    padding: 12px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    gap: 8px;
                    background: var(--bg-secondary);
                }
                .ai-chat-input input {
                    flex: 1;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    padding: 10px 16px;
                    color: var(--text-primary);
                    outline: none;
                    transition: border-color 0.2s;
                }
                .ai-chat-input input:focus {
                    border-color: #6366f1;
                }
                .ai-chat-input button {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #6366f1;
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .ai-chat-input button:hover:not(:disabled) {
                    background: #4f46e5;
                }
                .ai-chat-input button:disabled {
                    background: var(--border-color);
                    color: var(--text-secondary);
                    cursor: not-allowed;
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
