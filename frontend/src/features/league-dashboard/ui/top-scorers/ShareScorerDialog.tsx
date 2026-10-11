import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Facebook, Instagram, Loader2, MessageCircle, Share2, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { LeaderVariant } from './LeaderParts';
import {
    ScorerShareCardData,
    buildShareFileName,
    canShareImageFiles,
    downloadBlob,
    generateScorerShareCard,
    shareImageFile,
} from './scorerShareCard';

/* ------------------------------------------------------------------ */
/* Trigger button shown inside the leader card                         */
/* ------------------------------------------------------------------ */

interface ShareLeaderButtonProps {
    variant: LeaderVariant;
    onClick: () => void;
}

export const ShareLeaderButton = ({ variant, onClick }: ShareLeaderButtonProps) => (
    <button
        type="button"
        id="top-scorer-share-button"
        onClick={e => {
            e.stopPropagation();
            onClick();
        }}
        className={cn(
            'mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-200',
            'hover:scale-105 active:scale-95 shadow-lg',
            variant === 'fut'
                ? 'text-white bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] shadow-pink-900/40 hover:shadow-pink-600/40'
                : 'text-slate-900 bg-gradient-to-r from-amber-300 to-yellow-400 shadow-amber-900/30'
        )}
        title="Compartir en redes sociales"
    >
        <Instagram className="w-3.5 h-3.5" />
        Compartir
    </button>
);

/* ------------------------------------------------------------------ */
/* Share dialog                                                        */
/* ------------------------------------------------------------------ */

interface ShareScorerDialogProps {
    data: ScorerShareCardData | null;
    onClose: () => void;
}

export const ShareScorerDialog = ({ data, onClose }: ShareScorerDialogProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const open = !!data;

    // Generate the image every time the dialog opens for a player
    useEffect(() => {
        if (!data) return;
        let cancelled = false;
        let url: string | null = null;

        setFile(null);
        setPreviewUrl(null);
        setError(null);

        generateScorerShareCard(data)
            .then(blob => {
                if (cancelled) return;
                url = URL.createObjectURL(blob);
                setFile(new File([blob], buildShareFileName(data.playerName), { type: 'image/png' }));
                setPreviewUrl(url);
            })
            .catch(err => {
                console.error('[ShareScorer] Error generating image', err);
                if (!cancelled) setError('No pudimos generar la imagen. Intenta de nuevo.');
            });

        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [data]);

    // Close with Escape + lock page scroll
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    const nativeShareAvailable = useMemo(() => (file ? canShareImageFiles(file) : false), [file]);

    if (!data) return null;

    const fullShareUrl = data.leagueUrl.startsWith('http') ? data.leagueUrl : `https://${data.leagueUrl}`;
    const shareText = `${data.isCoLeader ? 'Co-líder' : 'Líder'} de goleo de ${data.leagueName}: ${data.playerName} (${data.teamName}) con ${data.goals} ${data.goals === 1 ? 'gol' : 'goles'} ⚽🔥`;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(fullShareUrl);

    const handleNativeShare = async () => {
        if (!file) return;
        try {
            await shareImageFile(file);
        } catch (err) {
            console.error('[ShareScorer] Native share failed', err);
            downloadBlob(file, file.name);
        }
    };

    const socialLinks = [
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, className: 'bg-[#25D366]/15 text-[#4ADE80] border-[#25D366]/40 hover:bg-[#25D366]/25' },
        { id: 'facebook', label: 'Facebook', icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, className: 'bg-[#1877F2]/15 text-[#60A5FA] border-[#1877F2]/40 hover:bg-[#1877F2]/25' },
    ];

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-scorer-title"
        >
            <div
                className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-b from-[#121c44] to-[#070b1f] text-white shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h2 id="share-scorer-title" className="flex items-center gap-2 font-['Bebas_Neue'] text-xl tracking-wider">
                        <Share2 className="w-4 h-4 text-amber-400" />
                        Compartir líder de goleo
                    </h2>
                    <button
                        id="share-scorer-close"
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Preview */}
                <div className="p-4">
                    <div className="relative mx-auto w-full max-w-[220px] aspect-[9/16] rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-inner flex items-center justify-center">
                        {previewUrl ? (
                            <img src={previewUrl} alt={`Tarjeta de ${data.playerName}`} className="w-full h-full object-cover" />
                        ) : error ? (
                            <p className="px-4 text-center text-xs text-red-300">{error}</p>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-[11px] font-semibold">Generando imagen…</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 space-y-2">
                        {nativeShareAvailable && (
                            <button
                                id="share-scorer-instagram"
                                type="button"
                                disabled={!file}
                                onClick={handleNativeShare}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] shadow-lg shadow-pink-900/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                <Instagram className="w-4 h-4" />
                                Compartir en Instagram
                            </button>
                        )}

                        <button
                            id="share-scorer-download"
                            type="button"
                            disabled={!file}
                            onClick={() => file && downloadBlob(file, file.name)}
                            className={cn(
                                'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 active:scale-[0.98]',
                                nativeShareAvailable
                                    ? 'bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10'
                                    : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-900/30'
                            )}
                        >
                            <Download className="w-4 h-4" />
                            Descargar imagen
                        </button>

                        {!nativeShareAvailable && (
                            <p className="text-[11px] leading-snug text-slate-400 text-center px-2">
                                Instagram solo permite publicar desde la app. Descarga la imagen y súbela a tu historia, o abre esta página desde tu celular para compartir directo.
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-2.5 pt-2">
                            {socialLinks.map(({ id, label, icon: Icon, href, className }) => (
                                <a
                                    key={id}
                                    id={`share-scorer-${id}`}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn('flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]', className)}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{label}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
