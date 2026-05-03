import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function UpdatePrompt() {
  const { t } = useTranslation();
  const [, setReady] = useState(false);

  useEffect(() => {
    const handler = () => {
      toast(
        (toastObj) => (
          <div className="flex items-center gap-3">
            <span className="text-sm">{t('pwa.updateAvailable')}</span>
            <button
              onClick={() => {
                window.__pwaUpdate?.(true);
                toast.dismiss(toastObj.id);
              }}
              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 font-medium whitespace-nowrap"
            >
              {t('pwa.reload')}
            </button>
          </div>
        ),
        { duration: Infinity, position: 'bottom-center' }
      );
      setReady(true);
    };

    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, [t]);

  return null; // renders nothing — uses toast
}
