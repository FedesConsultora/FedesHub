import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FederProfileDrawer from '../components/profile/FederProfileDrawer/FederProfileDrawer';
import ProfileQuickView from '../components/profile/ProfileQuickView/ProfileQuickView';
import { useAuth } from './AuthContext';
import { chatApi } from '../api/chat';
import { useQueryClient } from '@tanstack/react-query';

const ProfilePreviewContext = createContext();

export function ProfilePreviewProvider({ children }) {
    const [activeFederId, setActiveFederId] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [quickViewId, setQuickViewId] = useState(null);
    const [anchorRect, setAnchorRect] = useState(null);

    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const closeQuickView = useCallback(() => {
        setQuickViewId(null);
        setAnchorRect(null);
    }, []);

    const openDrawer = useCallback((federId) => {
        if (!federId) return;
        setActiveFederId(federId);
        setDrawerOpen(true);
        closeQuickView();
    }, [closeQuickView]);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        setTimeout(() => setActiveFederId(null), 300);
    }, []);

    const openProfile = useCallback((federId, rect = null) => {
        if (!federId) return;
        if (rect) {
            setQuickViewId(federId);
            setAnchorRect(rect);
        } else {
            openDrawer(federId);
        }
    }, [openDrawer]);

    // Lógica para abrir/crear DM y navegar
    const handleOpenMessage = useCallback(async (feder) => {
        if (!feder?.user_id) return;
        closeQuickView();

        try {
            // Intentamos crear/obtener el canal DM
            const res = await chatApi.channels.create({
                tipo_codigo: 'dm',
                invited_user_ids: [feder.user_id]
            });

            if (res?.id) {
                // Invalidar canales y candidatos para que aparezcan en el sidebar
                queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
                queryClient.invalidateQueries({ queryKey: ['chat', 'dms'] });

                navigate(`/chat/c/${res.id}`);
            }
        } catch (err) {
            console.error('Error opening DM:', err);
        }
    }, [closeQuickView, navigate, queryClient]);

    const isSelf = activeFederId && user?.feder_id === Number(activeFederId);

    return (
        <ProfilePreviewContext.Provider value={{
            openProfile,
            closeQuickView,
            openDrawer,
            closeDrawer
        }}>
            {children}

            {quickViewId && (
                <ProfileQuickView
                    federId={quickViewId}
                    anchorRect={anchorRect}
                    onClose={closeQuickView}
                    onViewFull={openDrawer}
                    onMessage={handleOpenMessage}
                />
            )}

            {activeFederId && (
                <FederProfileDrawer
                    open={drawerOpen}
                    federId={activeFederId}
                    onClose={closeDrawer}
                    isSelf={isSelf}
                    forceReadOnly={!isSelf}
                />
            )}
        </ProfilePreviewContext.Provider>
    );
}

export const useProfilePreview = () => {
    const context = useContext(ProfilePreviewContext);
    if (!context) {
        throw new Error('useProfilePreview must be used within a ProfilePreviewProvider');
    }
    return context;
};
