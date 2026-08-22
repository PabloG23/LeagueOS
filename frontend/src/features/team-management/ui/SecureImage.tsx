import React, { useState, useEffect } from 'react';
import { leagueApi } from '../../../shared/api/league-api';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    srcKey: string | undefined;
    fallbackSrc?: string;
}

// In-memory cache for signed URLs to prevent reloading / flickering across re-renders
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const pendingRequests = new Map<string, Promise<string>>();

export const invalidateSecureImageCache = (key?: string) => {
    if (key) {
        signedUrlCache.delete(key);
        pendingRequests.delete(key);
        try { sessionStorage.removeItem(`r2_signed_${key}`); } catch (_) {}
    } else {
        signedUrlCache.clear();
        pendingRequests.clear();
    }
};

const isValidSignedUrl = (url?: string): boolean => {
    if (!url) return false;
    if (url.includes('dummy-account-id') || url.includes('dummy-access-key')) return false;
    return true;
};

const getResolvedUrl = (srcKey: string | undefined, fallbackSrc?: string): string | undefined => {
    if (!srcKey) return fallbackSrc;
    if (srcKey.startsWith('http://') || srcKey.startsWith('https://') || srcKey.startsWith('data:')) {
        return isValidSignedUrl(srcKey) ? srcKey : fallbackSrc;
    }
    const cached = signedUrlCache.get(srcKey);
    if (cached && Date.now() < cached.expiresAt && isValidSignedUrl(cached.url)) {
        return cached.url;
    }
    try {
        const stored = sessionStorage.getItem(`r2_signed_${srcKey}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.expiresAt && Date.now() < parsed.expiresAt && isValidSignedUrl(parsed.url)) {
                signedUrlCache.set(srcKey, parsed);
                return parsed.url;
            } else {
                sessionStorage.removeItem(`r2_signed_${srcKey}`);
            }
        }
    } catch (_) {}
    return undefined;
};

export const SecureImage: React.FC<SecureImageProps> = ({ srcKey, fallbackSrc, className, alt, onError, ...props }) => {
    const [url, setUrl] = useState<string | undefined>(() => getResolvedUrl(srcKey, fallbackSrc));
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        if (!srcKey) {
            setUrl(fallbackSrc);
            setError(false);
            return;
        }

        if (srcKey.startsWith('http://') || srcKey.startsWith('https://') || srcKey.startsWith('data:')) {
            if (isValidSignedUrl(srcKey)) {
                setUrl(srcKey);
                setError(false);
            } else {
                setUrl(fallbackSrc);
                setError(true);
            }
            return;
        }

        // Check cache first
        const resolved = getResolvedUrl(srcKey, fallbackSrc);
        if (resolved && resolved !== fallbackSrc) {
            setUrl(resolved);
            setError(false);
            return;
        }

        // Deduplicate in-flight requests for the same image
        let requestPromise = pendingRequests.get(srcKey);
        if (!requestPromise) {
            requestPromise = leagueApi.getSignedUrl(srcKey)
                .then(response => {
                    const signedUrl = response.data.url;
                    if (isValidSignedUrl(signedUrl)) {
                        const cacheEntry = {
                            url: signedUrl,
                            expiresAt: Date.now() + 50 * 60 * 1000 // Cache for 50 mins
                        };
                        signedUrlCache.set(srcKey, cacheEntry);
                        try {
                            sessionStorage.setItem(`r2_signed_${srcKey}`, JSON.stringify(cacheEntry));
                        } catch (_) {}
                    }
                    pendingRequests.delete(srcKey);
                    return signedUrl;
                })
                .catch(err => {
                    pendingRequests.delete(srcKey);
                    throw err;
                });
            pendingRequests.set(srcKey, requestPromise);
        }

        requestPromise
            .then(signedUrl => {
                if (isMounted) {
                    if (isValidSignedUrl(signedUrl)) {
                        setUrl(signedUrl);
                        setError(false);
                    } else {
                        setError(true);
                        setUrl(fallbackSrc);
                    }
                }
            })
            .catch(e => {
                console.error("Failed to fetch signed URL for", srcKey, e);
                if (isMounted) {
                    setError(true);
                    setUrl(fallbackSrc);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [srcKey, fallbackSrc]);

    return (
        <img 
            src={error ? fallbackSrc : (url || fallbackSrc)} 
            alt={alt || "Image"} 
            className={className} 
            onError={(e) => {
                if (srcKey) {
                    signedUrlCache.delete(srcKey);
                    try { sessionStorage.removeItem(`r2_signed_${srcKey}`); } catch (_) {}
                }
                if (!error) {
                    setError(true);
                    setUrl(fallbackSrc);
                }
                onError?.(e);
            }} 
            {...props} 
        />
    );
};
