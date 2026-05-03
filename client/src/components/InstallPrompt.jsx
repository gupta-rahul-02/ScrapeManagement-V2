import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DevicePhoneMobileIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setDismissed(true);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 mb-2">
      <div className="flex items-center gap-2 text-sm text-indigo-800 dark:text-indigo-300">
        <DevicePhoneMobileIcon className="h-5 w-5 flex-shrink-0" />
        <span>{t('pwa.installPrompt')}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 font-medium"
        >
          {t('pwa.installApp')}
        </button>
        <button onClick={() => setDismissed(true)}>
          <XMarkIcon className="h-4 w-4 text-indigo-400 hover:text-indigo-600" />
        </button>
      </div>
    </div>
  );
}
