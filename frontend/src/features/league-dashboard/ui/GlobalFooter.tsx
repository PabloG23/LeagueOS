
import { Facebook, Instagram, Twitter, MapPin, Phone } from 'lucide-react';
import { useTenantSettings } from '../../tenant/context/TenantSettingsContext';

export const GlobalFooter = () => {
    const { settings } = useTenantSettings();

    return (
        <footer className={`${settings.footerBackgroundClass} text-slate-300 py-16 mt-20`}>
            <div className="container mx-auto max-w-7xl px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Identity */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-white font-bold text-xl uppercase tracking-tighter">
                            {/* Simple dynamic name rendering, could enhance later if needed */}
                            {settings.name}
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                            {settings.slogan}
                        </p>
                        <div className="pt-4 text-xs text-slate-500">
                            &copy; {new Date().getFullYear()} {settings.name} A.C.
                        </div>
                    </div>

                    {/* Contact & Location */}
                    <div className="space-y-4">
                        <h4 className="text-white font-semibold uppercase tracking-wider text-sm">Contacto</h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 group">
                                <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 group-hover:text-white transition-colors" />
                                <span
                                    className="text-sm leading-relaxed group-hover:text-white transition-colors"
                                    dangerouslySetInnerHTML={{ __html: settings.footerAddress }}
                                />
                            </div>
                            <div className="flex items-center gap-3 group">
                                <Phone className="w-5 h-5 text-blue-500 shrink-0 group-hover:text-white transition-colors" />
                                <span className="text-sm group-hover:text-white transition-colors">
                                    {settings.footerPhone}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Social */}
                    <div className="space-y-4">
                        <h4 className="text-white font-semibold uppercase tracking-wider text-sm">Síguenos</h4>
                        <div className="flex gap-4">
                            {settings.facebookUrl && (
                                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300 group">
                                    <Facebook className="w-5 h-5" />
                                </a>
                            )}
                            {settings.instagramUrl && (
                                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all duration-300 group">
                                    <Instagram className="w-5 h-5" />
                                </a>
                            )}
                            {settings.twitterUrl && (
                                <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all duration-300 group">
                                    <Twitter className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};
