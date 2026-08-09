import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Start exit animation slightly before it is unmounted by the Context
    const timer = setTimeout(() => {
      setIsClosing(true);
    }, 3600); // 400ms before the 4000ms unmount
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 400); // Wait for exit animation
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="toast-icon success" />;
      case 'error': return <AlertCircle size={20} className="toast-icon error" />;
      default: return <Info size={20} className="toast-icon info" />;
    }
  };

  return (
    <div className={`toast-item ${type} ${isClosing ? 'toast-exit' : 'toast-enter'}`}>
      <div className="toast-content">
        {getIcon()}
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={handleClose}>
        <X size={16} />
      </button>
    </div>
  );
};
