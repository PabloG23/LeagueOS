import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

// TIEMPOS DE PRODUCCIÓN: 15 minutos de inactividad con aviso de 60 segundos
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos de inactividad total
const WARNING_THRESHOLD_MS = 14 * 60 * 1000; // Aviso a los 14 minutos (60s de cuenta regresiva)
const STORAGE_KEY = 'leagueos_last_activity';

export const SessionTimeoutManager: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showWarning, setShowWarning] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(60);
    
    // Refs to avoid unnecessary effect re-runs
    const showWarningRef = useRef(false);
    const lastActivityRef = useRef<number>(Date.now());
    const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Keep showWarningRef synchronized with state
    useEffect(() => {
        showWarningRef.current = showWarning;
    }, [showWarning]);

    // Get current league slug or default for redirect
    const matchLeague = matchPath("/:leagueSlug/*", location.pathname);
    const leagueSlug = matchLeague?.params.leagueSlug || localStorage.getItem('tenantId') || 'ligaNuestroDeporte';

    // Verify if there is an active session
    const hasActiveSession = Boolean(localStorage.getItem('token'));

    const handleLogout = useCallback((reason: 'timeout' | 'manual' = 'timeout') => {
        setShowWarning(false);
        showWarningRef.current = false;
        localStorage.clear();
        sessionStorage.clear();

        // Redirect to login preserving the current league slug context
        const currentPath = window.location.pathname;
        const slugMatch = currentPath.match(/^\/([^\/]+)/);
        const currentSlug = slugMatch ? slugMatch[1] : 'ligaNuestroDeporte';

        // Avoid infinite redirect loop if already on login/landing
        const isAuthOrPublicPage = currentPath.includes('/login') ||
            currentPath.includes('/register') ||
            currentPath === '/' ||
            currentPath.startsWith('/landing') ||
            currentPath.startsWith('/about') ||
            currentPath.startsWith('/leagueos');

        if (!isAuthOrPublicPage) {
            navigate(`/${currentSlug}/login?reason=${reason}`, { replace: true });
        }
    }, [navigate]);

    const resetActivity = useCallback(() => {
        const now = Date.now();
        lastActivityRef.current = now;
        try {
            localStorage.setItem(STORAGE_KEY, now.toString());
        } catch {}
        setShowWarning(false);
        showWarningRef.current = false;
        setSecondsRemaining(Math.ceil((INACTIVITY_TIMEOUT_MS - WARNING_THRESHOLD_MS) / 1000));
    }, []);

    // Throttled activity tracker (at most once every 1.5s)
    const handleUserActivity = useCallback(() => {
        if (!hasActiveSession) return;

        // If warning is already active, ignore mouse moves/scroll so user can interact with modal
        if (showWarningRef.current) return;

        if (!throttleTimerRef.current) {
            const now = Date.now();
            lastActivityRef.current = now;
            try {
                localStorage.setItem(STORAGE_KEY, now.toString());
            } catch {}

            throttleTimerRef.current = setTimeout(() => {
                throttleTimerRef.current = null;
            }, 1500);
        }
    }, [hasActiveSession]);

    // Multi-tab synchronization
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                const updatedTime = parseInt(e.newValue, 10);
                if (!isNaN(updatedTime)) {
                    lastActivityRef.current = updatedTime;
                    if (showWarningRef.current) {
                        setShowWarning(false);
                        showWarningRef.current = false;
                    }
                }
            } else if (e.key === 'token' && !e.newValue) {
                setShowWarning(false);
                showWarningRef.current = false;
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Main activity listener & countdown ticker (Stable, runs only based on auth state)
    useEffect(() => {
        if (!hasActiveSession) {
            setShowWarning(false);
            showWarningRef.current = false;
            return;
        }

        // Initialize last activity if not set
        const storedTime = localStorage.getItem(STORAGE_KEY);
        const parsedStoredTime = storedTime ? parseInt(storedTime, 10) : NaN;
        if (!isNaN(parsedStoredTime) && Date.now() - parsedStoredTime < INACTIVITY_TIMEOUT_MS) {
            lastActivityRef.current = parsedStoredTime;
        } else {
            const now = Date.now();
            lastActivityRef.current = now;
            try {
                localStorage.setItem(STORAGE_KEY, now.toString());
            } catch {}
        }

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach((evt) => {
            window.addEventListener(evt, handleUserActivity, { passive: true });
        });

        // 1-second interval ticker
        const intervalId = setInterval(() => {
            const token = localStorage.getItem('token');
            if (!token) {
                setShowWarning(false);
                showWarningRef.current = false;
                return;
            }

            // Sync with other tabs if another tab had activity
            try {
                const latestStored = localStorage.getItem(STORAGE_KEY);
                if (latestStored) {
                    const parsed = parseInt(latestStored, 10);
                    if (!isNaN(parsed) && parsed > lastActivityRef.current) {
                        lastActivityRef.current = parsed;
                    }
                }
            } catch {}

            const idleDuration = Date.now() - lastActivityRef.current;

            if (idleDuration >= INACTIVITY_TIMEOUT_MS) {
                // Timeout reached
                clearInterval(intervalId);
                handleLogout('timeout');
            } else if (idleDuration >= WARNING_THRESHOLD_MS) {
                // Warning threshold reached
                if (!showWarningRef.current) {
                    setShowWarning(true);
                    showWarningRef.current = true;
                }
                const remaining = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - idleDuration) / 1000));
                setSecondsRemaining(remaining);
            } else {
                if (showWarningRef.current) {
                    setShowWarning(false);
                    showWarningRef.current = false;
                }
            }
        }, 1000);

        return () => {
            events.forEach((evt) => {
                window.removeEventListener(evt, handleUserActivity);
            });
            clearInterval(intervalId);
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
            }
        };
    }, [hasActiveSession, handleUserActivity, handleLogout]);

    if (!showWarning || !hasActiveSession) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-white relative overflow-hidden transform transition-all scale-100">
                {/* Background ambient glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Warning Icon Badge */}
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        <ShieldAlert className="w-8 h-8 text-amber-400 animate-pulse" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-100 mb-2">
                        ¿Sigues ahí?
                    </h3>

                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                        Tu sesión está a punto de cerrarse debido a inactividad por motivos de seguridad.
                    </p>

                    {/* Countdown Display Card */}
                    <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-6 flex items-center justify-center gap-3">
                        <Clock className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-medium text-slate-400">
                            Cierre de sesión automático en:
                        </span>
                        <span className="font-mono text-lg font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                            {secondsRemaining}s
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <button
                            type="button"
                            onClick={resetActivity}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Continuar conectado</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleLogout('manual')}
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 font-medium text-sm transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
