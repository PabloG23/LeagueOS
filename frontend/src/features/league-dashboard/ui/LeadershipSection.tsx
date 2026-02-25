
import { User, Users } from 'lucide-react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';

export const LeadershipSection = () => {
    const { settings } = useTenantSettings();

    // If no board members are defined, don't render the section
    if (!settings?.boardMembers || settings.boardMembers.length === 0) {
        return null;
    }

    return (
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 col-span-full">
            <div className="flex items-center justify-center mb-8">
                <div className="bg-primary/5 p-3 rounded-full mb-4 hidden">
                    <Users className="w-8 h-8 text-primary" />
                </div>
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
                            <User className="w-6 h-6" />
                        </div>

                        <div className="relative min-w-0">
                            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-0.5">
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
};
