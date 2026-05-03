import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="alert" className="bg-yellow-100 text-yellow-900 text-sm text-center py-2" data-testid="offline-banner">
      You are offline. Some features may not work.
    </div>
  );
}
