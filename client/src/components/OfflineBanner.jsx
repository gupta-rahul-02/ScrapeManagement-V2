import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiIcon } from '@heroicons/react/24/outline';

export default function OfflineBanner() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="bg-amber-500 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
      <WifiIcon className="h-4 w-4" />
      {t('pwa.offline')}
    </div>
  );
}
