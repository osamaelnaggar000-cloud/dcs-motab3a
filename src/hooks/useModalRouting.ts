import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useModalStore } from '../store/useModalStore';

export const useModalRouting = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { activeModal, openModal, closeModal } = useModalStore();

    // Determine currently open modal from URL
    const searchParams = new URLSearchParams(location.search);
    const activeModalInUrl = searchParams.get('modal') as any;

    // Sync Store -> URL (Handles App Buttons opening modals)
    useEffect(() => {
        if (activeModal !== activeModalInUrl) {
            const newParams = new URLSearchParams(location.search);
            if (activeModal) {
                newParams.set('modal', activeModal);
            } else {
                newParams.delete('modal');
            }
            const searchString = newParams.toString();
            navigate(`${location.pathname}${searchString ? '?' + searchString : ''}`);
        }
    }, [activeModal]);

    // Sync URL -> Store (Handles Browser Back/Forward buttons)
    useEffect(() => {
        if (activeModalInUrl !== activeModal) {
            if (activeModalInUrl) {
                openModal(activeModalInUrl);
            } else {
                closeModal();
            }
        }
    }, [activeModalInUrl]);
};
