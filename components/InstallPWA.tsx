import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        // Robust standalone detection
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            window.matchMedia('(display-mode: minimal-ui)').matches ||
            (window.navigator as any).standalone === true ||
            document.referrer.includes('android-app://');

        if (isStandalone) {
            console.log("App is running in standalone mode (Install button hidden)");
            return;
        }

        const handleBeforeInstallPrompt = (e: any) => {
            // Prevenir que Chrome muestre el prompt automáticamente
            e.preventDefault();
            setDeferredPrompt(e);

            // Double check standalone status just in case
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                setIsInstallable(true);
            }
            console.log('App is installable event fired');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Mostrar el prompt de instalación
        deferredPrompt.prompt();

        // Esperar a que el usuario responda
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Limpiar
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    // ... (previous logic)

    const handleDismiss = () => {
        setIsInstallable(false);
    };

    if (!isInstallable) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 animate-bounce">
            <button
                onClick={() => setIsInstallable(false)}
                className="bg-black/50 text-white rounded-full p-1 hover:bg-black/80"
                title="Ocultar"
            >
                <div className="h-4 w-4 flex items-center justify-center font-bold">×</div>
            </button>
            <button
                onClick={handleInstallClick}
                className="bg-[#76ff03] text-black font-bold py-3 px-6 rounded-full shadow-lg hover:bg-[#64dd17] transition-all transform hover:scale-105 flex items-center gap-2 font-urban"
            >
                <Download size={20} />
                INSTALAR APP
            </button>
        </div>
    );
};

export default InstallPWA;
