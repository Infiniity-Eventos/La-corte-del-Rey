import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            // Prevenir que Chrome muestre el prompt automáticamente si se desea controlar
            e.preventDefault();
            // Guardar el evento para dispararlo después
            setDeferredPrompt(e);
            setIsInstallable(true);
            console.log('App is installable!');
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

    if (!isInstallable) return null;

    return (
        <button
            onClick={handleInstallClick}
            className="fixed bottom-4 right-4 z-50 bg-[#76ff03] text-black font-bold py-3 px-6 rounded-full shadow-lg hover:bg-[#64dd17] transition-all transform hover:scale-105 flex items-center gap-2 font-urban animate-bounce"
        >
            <Download size={20} />
            INSTALAR APP
        </button>
    );
};

export default InstallPWA;
