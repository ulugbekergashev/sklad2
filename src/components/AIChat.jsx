import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, Sparkles } from 'lucide-react';

export default function AIChat({ token }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Salom! Men SKLAD AI assistentiman. Ombor bilan bog\'liq savollaringizni bering yoki buyruq yuboring. Masalan: "Olma bormi?" yoki "Dilshodga 5 ta olma 10mingdan sotdim"', action: false },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch('/api/ai/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message: userMsg }),
            });
            const data = await res.json();

            let responseText = data.message || 'Javob olishda xatolik';
            const isAction = data.action && data.action !== 'info';

            if (isAction && data.executed) {
                responseText += '\n\n✅ Amaliyot muvaffaqiyatli bajarildi!';
            }

            setMessages(prev => [...prev, { role: 'ai', text: responseText, action: isAction }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Serverga ulanishda xatolik yuz berdi.', action: false }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            <button className="ai-chat-toggle" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X size={24} /> : <Sparkles size={24} />}
            </button>

            {isOpen && (
                <div className="ai-chat-window">
                    <div className="ai-chat-header">
                        <div className="ai-chat-header-title">
                            <Bot size={20} />
                            <span>AI Assistent</span>
                            <div className="ai-chat-header-dot" />
                        </div>
                    </div>

                    <div className="ai-chat-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`ai-chat-message ${msg.role} ${msg.action ? 'action' : ''}`}>
                                {msg.text}
                            </div>
                        ))}
                        {loading && (
                            <div className="ai-chat-message ai">
                                <span style={{ opacity: 0.6 }}>Javob tayyorlanmoqda...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="ai-chat-input-area">
                        <input
                            type="text"
                            placeholder="Buyruq yoki savol yozing..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <button className="ai-chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
