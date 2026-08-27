import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactElement;
    allowedRoles?: ('ROLE_LEAGUE_ADMIN' | 'ROLE_REFEREE' | 'ROLE_TEAM_REP')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const location = useLocation();
    const { leagueSlug } = useParams<{ leagueSlug?: string }>();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(localStorage.getItem('token')));
    const [userRole, setUserRole] = useState<string | null>(() => localStorage.getItem('role'));

    const effectiveSlug = leagueSlug || localStorage.getItem('tenantId') || 'ligaNuestroDeporte';

    // Handle BFCache (Browser Back/Forward Cache) and storage change events
    useEffect(() => {
        const verifyAuth = () => {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role');
            setIsAuthenticated(Boolean(token));
            setUserRole(role);
        };

        const handlePageShow = (e: PageTransitionEvent) => {
            // When navigating back via browser cache
            if (e.persisted) {
                verifyAuth();
            }
        };

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'token' || e.key === 'role') {
                verifyAuth();
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    // 1. If not authenticated, redirect to login replacing history
    if (!isAuthenticated || !localStorage.getItem('token')) {
        return <Navigate to={`/${effectiveSlug}/login`} replace state={{ from: location }} />;
    }

    // 2. If role is not authorized for this specific section, redirect to user's designated home
    if (allowedRoles && allowedRoles.length > 0 && userRole) {
        if (!allowedRoles.includes(userRole as any)) {
            if (userRole === 'ROLE_TEAM_REP') {
                return <Navigate to={`/${effectiveSlug}/team-dashboard`} replace />;
            }
            if (userRole === 'ROLE_REFEREE') {
                return <Navigate to={`/${effectiveSlug}/referee/dashboard`} replace />;
            }
            if (userRole === 'ROLE_LEAGUE_ADMIN') {
                return <Navigate to={`/${effectiveSlug}/admin/teams`} replace />;
            }
            return <Navigate to={`/${effectiveSlug}/login`} replace />;
        }
    }

    return children;
};
