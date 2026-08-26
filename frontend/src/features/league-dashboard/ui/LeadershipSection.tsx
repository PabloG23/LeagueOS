
import React from 'react';
import { 
    UserCircle2, 
    Award, 
    FileText, 
    Coins, 
    Sparkles, 
    Users, 
    Scale,
    ExternalLink
} from 'lucide-react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';

export const LeadershipSection: React.FC = () => {
    const { settings } = useTenantSettings();

    // If no board members are defined, don't render the section
    if (!settings?.boardMembers || settings.boardMembers.length === 0) {
        return null;
    }

    const isNuestroDeporte = 
        settings?.themeClass === 'theme-nuestro-deporte' || 
        settings?.tenantId === '11111111-1111-1111-1111-111111111111' ||
        settings?.name?.toLowerCase().includes('nuestro deporte');

    // Standard fallback layout for other tenants (e.g. San Lucas)
    if (!isNuestroDeporte) {
        return (
            <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 col-span-full">
                <div className="flex items-center justify-center mb-8">
                    <h2 className="text-3xl font-bold text-center text-slate-800 tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-sidebar to-primary">
                            Mesa Directiva
                        </span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
                    {settings.boardMembers.map((member, index) => (
                        <div
                            key={index}
                            className="group relative overflow-hidden rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex items-center gap-4"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                <UserCircle2 className="w-6 h-6" strokeWidth={1.5} />
                            </div>
                            <div className="relative min-w-0">
                                <p className="text-sm font-black text-emerald-800 uppercase tracking-wide mb-0.5">
                                    {member.role}
                                </p>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                    {member.name}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // Role categorizations for Nuestro Deporte
    const president = settings.boardMembers.find(m => m.role.toLowerCase().includes('presidente') && !m.role.toLowerCase().includes('vice'));
    const vicePresident = settings.boardMembers.find(m => m.role.toLowerCase().includes('vice'));
    const secretary = settings.boardMembers.find(m => m.role.toLowerCase().includes('secretario'));
    const treasurer = settings.boardMembers.find(m => m.role.toLowerCase().includes('tesorero'));
    const discipline = settings.boardMembers.find(m => m.role.toLowerCase().includes('disciplinaria') || m.role.toLowerCase().includes('comisión'));
    const marketing = settings.boardMembers.find(m => m.role.toLowerCase().includes('marketing'));
    const staff = settings.boardMembers.find(m => m.role.toLowerCase().includes('staff'));

    return (
        <section className="mb-14 animate-in fade-in slide-in-from-bottom-4 duration-700 col-span-full relative select-none">
            {/* Header */}
            <div className="mb-8 pb-4 border-b border-white/10">
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-['Bebas_Neue'] sm:font-sans">
                    Mesa Directiva & Comité Operativo
                </h2>
            </div>

            {/* Bento Grid Glassmorphic */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Presidente (Hero Bento Box - 7 cols) */}
                {president && (
                    <div className="md:col-span-7 rounded-3xl p-7 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-blue-600/10 border border-white/15 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group shadow-lg shadow-black/20 hover:border-amber-400/50 transition-all duration-300">
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Award className="w-3 h-3" />
                                Presidente
                            </span>
                            <span className="text-xs font-bold text-slate-400">Liga Nuestro Deporte</span>
                        </div>
                        <div>
                            <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                                {president.name}
                            </h3>
                            <p className="text-xs text-slate-300 mt-1 font-medium">
                                Representación institucional y liderazgo ejecutivo de la liga.
                            </p>
                        </div>
                    </div>
                )}

                {/* Vicepresidente (5 cols) */}
                {vicePresident && (
                    <div className="md:col-span-5 rounded-3xl p-7 bg-gradient-to-br from-blue-600/15 via-white/[0.04] to-transparent border border-blue-400/30 backdrop-blur-xl flex flex-col justify-between group shadow-lg shadow-black/20 hover:border-blue-400/60 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-black uppercase tracking-widest">
                                Vicepresidencia
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                                {vicePresident.name}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 font-medium">
                                Coordinación y gestión ejecutiva adjunta.
                            </p>
                        </div>
                    </div>
                )}

                {/* Secretario (4 cols) */}
                {secretary && (
                    <div className="md:col-span-4 rounded-3xl p-5 bg-white/[0.04] border border-white/10 hover:border-blue-400/50 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-0.5">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Secretario</span>
                        </div>
                        <h4 className="text-lg font-black text-white">{secretary.name}</h4>
                    </div>
                )}

                {/* Tesorero (4 cols) */}
                {treasurer && (
                    <div className="md:col-span-4 rounded-3xl p-5 bg-white/[0.04] border border-white/10 hover:border-emerald-400/50 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-0.5">
                        <div className="flex items-center gap-2 mb-3">
                            <Coins className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tesorero</span>
                        </div>
                        <h4 className="text-lg font-black text-white">{treasurer.name}</h4>
                    </div>
                )}

                {/* Disciplina (4 cols) */}
                {discipline && (
                    <div className="md:col-span-4 rounded-3xl p-5 bg-white/[0.04] border border-white/10 hover:border-rose-400/50 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-0.5">
                        <div className="flex items-center gap-2 mb-3">
                            <Scale className="w-4 h-4 text-rose-400" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Comisión Disciplinaria</span>
                        </div>
                        <h4 className="text-lg font-black text-white">{discipline.name}</h4>
                    </div>
                )}

                {/* Marketing - MGX Studio con Enlace Interactivo (6 cols) */}
                {marketing && (
                    <a
                        href="https://mgx.studio/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="md:col-span-6 rounded-3xl p-5 bg-white/[0.04] hover:bg-gradient-to-r hover:from-purple-900/30 hover:to-indigo-900/20 border border-white/10 hover:border-purple-400/60 backdrop-blur-xl transition-all duration-300 flex items-center justify-between group/mgx hover:-translate-y-0.5 shadow-sm"
                        title="Visitar MGX Studio (https://mgx.studio/)"
                    >
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5 mb-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                Marketing & Difusión
                            </span>
                            <div className="flex items-center gap-2">
                                <h4 className="text-xl font-black text-white group-hover/mgx:text-purple-300 transition-colors">
                                    {marketing.name}
                                </h4>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-400/20 text-purple-300 flex items-center justify-center group-hover/mgx:bg-purple-600 group-hover/mgx:text-white transition-all shadow-md">
                            <ExternalLink className="w-4 h-4" />
                        </div>
                    </a>
                )}

                {/* Staff (6 cols) */}
                {staff && (
                    <div className="md:col-span-6 rounded-3xl p-5 bg-white/[0.04] border border-white/10 hover:border-cyan-400/50 backdrop-blur-xl transition-all duration-300 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-1">
                                <Users className="w-3.5 h-3.5" />
                                Staff Mesa Directiva
                            </span>
                            <h4 className="text-xl font-black text-white">{staff.name}</h4>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

