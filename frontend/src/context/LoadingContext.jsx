import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
    const [loadingCount, setLoadingCount] = useState(0);
    const location = useLocation();

    const [routeLoading, setRouteLoading] = useState(false);

    const showLoader = useCallback(() => setLoadingCount(prev => prev + 1), []);
    const hideLoader = useCallback(() => setLoadingCount(prev => Math.max(0, prev - 1)), []);

    const isLoading = loadingCount > 0 || routeLoading;

    // Trigger loader on location (route) changes
    useEffect(() => {
        setRouteLoading(true);
        const timer = setTimeout(() => {
            setRouteLoading(false);
        }, 800);

        return () => {
            clearTimeout(timer);
            setRouteLoading(false);
            // Fail-safe: clear any potential stuck loaders when LEAVING a route
            setLoadingCount(0);
        };
    }, [location.pathname]);

    return (
        <LoadingContext.Provider value={{ isLoading, showLoader, hideLoader }}>
            {children}
        </LoadingContext.Provider>
    );
}

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
