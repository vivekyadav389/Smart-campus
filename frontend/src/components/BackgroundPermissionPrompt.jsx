import { useState, useEffect } from 'react';
import { Bell, ShieldCheck, Zap, X } from 'lucide-react';

const BackgroundPermissionPrompt = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [status, setStatus] = useState({
        notifications: 'default',
        persistent: false
    });

    useEffect(() => {
        const checkPermissions = async () => {
            const permissions = {
                notifications: 'Notification' in window ? Notification.permission : 'not-supported',
                persistent: 'storage' in navigator && 'persist' in navigator.storage ? await navigator.storage.persisted() : false
            };
            
            setStatus(permissions);

            // Show if anything important is missing and not already dismissed for this session
            const isDismissed = sessionStorage.getItem('sc_background_prompt_dismissed');
            if (!isDismissed && (permissions.notifications !== 'granted' || !permissions.persistent)) {
                setIsVisible(true);
            }
        };

        checkPermissions();
    }, []);

    const requestAll = async () => {
        // 1. Request Notifications
        if ('Notification' in window) {
            const res = await Notification.requestPermission();
            setStatus(prev => ({ ...prev, notifications: res }));
        }

        // 2. Request Persistent Storage (helps prevent browser from killing the background session)
        if ('storage' in navigator && 'persist' in navigator.storage) {
            const persisted = await navigator.storage.persist();
            setStatus(prev => ({ ...prev, persistent: persisted }));
        }

        // If at least one was granted, we consider it done for now
        setIsVisible(false);
    };

    const dismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('sc_background_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="background-permission-banner animate-slide-up">
            <div className="banner-content">
                <div className="banner-icon">
                    <Zap size={24} className="text-primary" />
                </div>
                <div className="banner-text">
                    <h4>Enable Background Tracking</h4>
                    <p>Allow notifications and persistent storage to ensure your attendance is tracked even when the app is minimized.</p>
                </div>
                <div className="banner-actions">
                    <button onClick={dismiss} className="btn-close">
                        <X size={20} />
                    </button>
                    <button onClick={requestAll} className="btn btn-primary">
                       <ShieldCheck size={16} /> Enable Now
                    </button>
                </div>
            </div>

            <style>{`
                .background-permission-banner {
                    position: fixed;
                    bottom: 2rem;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 90%;
                    max-width: 600px;
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(37, 99, 235, 0.2);
                    border-radius: 1.25rem;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    padding: 1.25rem;
                    z-index: 9999;
                }
                
                .banner-content {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }
                
                .banner-icon {
                    background: rgba(37, 99, 235, 0.1);
                    padding: 0.75rem;
                    border-radius: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .banner-text {
                    flex: 1;
                }
                
                .banner-text h4 {
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                    color: var(--color-text-primary);
                }
                
                .banner-text p {
                    font-size: 0.875rem;
                    color: var(--color-text-secondary);
                    line-height: 1.4;
                }
                
                .banner-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .btn-close {
                    background: none;
                    border: none;
                    color: var(--color-text-secondary);
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                
                .btn-close:hover {
                    background: rgba(0, 0, 0, 0.05);
                }

                @media (max-width: 640px) {
                    .banner-content {
                        flex-direction: column;
                        text-align: center;
                        gap: 0.75rem;
                    }
                    .banner-actions {
                        width: 100%;
                        justify-content: center;
                    }
                    .btn-close {
                        position: absolute;
                        top: 0.5rem;
                        right: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default BackgroundPermissionPrompt;
