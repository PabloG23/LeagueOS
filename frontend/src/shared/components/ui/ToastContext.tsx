import { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    showConfirm: (message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        message: string;
        onConfirm: () => void;
        confirmText: string;
        cancelText: string;
    } | null>(null);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const showConfirm = (message: string, onConfirm: () => void, confirmText = 'Aceptar', cancelText = 'Cancelar') => {
        setConfirmDialog({
            isOpen: true,
            message,
            onConfirm,
            confirmText,
            cancelText
        });
    };

    const closeConfirm = () => {
        setConfirmDialog(null);
    };

    const handleConfirm = () => {
        if (confirmDialog) {
            confirmDialog.onConfirm();
            closeConfirm();
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showConfirm }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-top-2 fade-in duration-300 min-w-[300px] border ${
                            toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
                            toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
                            'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                    >
                        <div className="shrink-0">
                            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                        </div>
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmDialog && confirmDialog.isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 pb-0 flex justify-between items-start">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mb-4">
                                <Info className="w-6 h-6 text-blue-500" />
                            </div>
                            <button
                                onClick={closeConfirm}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 pb-6 mt-2">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                Confirmar Acción
                            </h3>
                            <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                                {confirmDialog.message}
                            </p>
                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    onClick={closeConfirm}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    {confirmDialog.cancelText}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 rounded-lg transition-colors"
                                >
                                    {confirmDialog.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
