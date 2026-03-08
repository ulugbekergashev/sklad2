import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = '' }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`modal ${size ? `modal-${size}` : ''}`}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
