import { useState } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { Shield, Lock, User } from 'lucide-react';

export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Extract slug from URL to preserve tenant context
    const matchLeague = matchPath("/:leagueSlug/*", location.pathname);
    const leagueSlug = matchLeague?.params.leagueSlug || 'ligaMexiquense';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            const data = await response.json();

            // Store Auth Data
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('role', data.role);
            if (data.teamId) {
                localStorage.setItem('teamId', data.teamId);
            }

            // Determine slug from Tenant ID (Trust backend over URL)
            let targetSlug = 'ligaMexiquense';
            if (data.tenantId === '22222222-2222-2222-2222-222222222222') {
                targetSlug = 'ligaSanLucas';
            } else if (data.tenantId === '11111111-1111-1111-1111-111111111111') {
                targetSlug = 'ligaMexiquense';
            } else {
                // Fallback to URL or default
                targetSlug = leagueSlug;
            }

            // Redirect based on role and current tenant
            if (data.role === 'ROLE_TEAM_REP') {
                navigate(`/${targetSlug}/team-dashboard`);
            } else if (data.role === 'ROLE_LEAGUE_ADMIN') {
                navigate(`/${targetSlug}/admin/teams`);
            } else {
                navigate(`/${targetSlug}`);
            }

        } catch (err: any) {
            setError(err.message || 'Credenciales inválidas');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            {/* Left Column - Brand Experience (40%) */}
            <div className="w-full md:w-[40%] bg-slate-900 relative hidden md:flex flex-col items-center justify-center p-12 overflow-hidden">
                {/* Dynamic Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-950 z-0" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-10 z-0 mix-blend-overlay" />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                    <div className="relative">
                        <img
                            src="/league_logo_new.png"
                            alt="Logo de LeagueOS"
                            className="h-64 w-auto object-contain mix-blend-screen opacity-90 drop-shadow-[0_0_40px_rgba(59,130,246,0.5)]"
                        />
                    </div>

                    <div className="space-y-4 max-w-sm">
                        <p className="text-slate-400 text-lg leading-relaxed font-light tracking-wide border-t border-slate-800 pt-6">
                            El Sistema Operativo para Ligas Deportivas Profesionales
                        </p>
                    </div>
                </div>

                {/* Footer Tagline */}
                <div className="absolute bottom-8 text-slate-500 text-sm font-medium tracking-wider uppercase">
                    Potenciando el Deporte
                </div>
            </div>

            {/* Right Column - Login Form (60%) */}
            <div className="w-full md:w-[60%] bg-white flex flex-col items-center justify-center p-8 md:p-12 relative">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo (Visible only on small screens) */}
                    <div className="md:hidden flex flex-col items-center mb-8">
                        <img src="/league_logo_new.png" alt="LeagueOS" className="h-16 w-auto" />
                    </div>

                    <div className="space-y-2 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                            Bienvenido.
                        </h2>
                        <p className="text-slate-500">
                            Ingresa tus credenciales para acceder
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2 animate-shake">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Usuario</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                        placeholder="ej. admin"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-sm font-semibold text-slate-700">Contraseña</label>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Iniciando...
                                </span>
                            ) : (
                                'Ingresar a la Plataforma'
                            )}
                        </button>
                    </form>

                    <div className="pt-4 text-center">
                        <p className="text-slate-400 text-sm">
                            &copy; {new Date().getFullYear()} LeagueOS. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
