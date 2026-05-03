import { useEffect, useState } from 'react';

const KEY = 'eventpark_cookie_consent';

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch { /* ignore */ }
  }, []);
  if (!show) return null;
  return (
    <div role="region" aria-label="Cookie consent" className="fixed bottom-0 inset-x-0 bg-gray-900 text-white p-4 z-40" data-testid="cookie-banner">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm">We use cookies to make EventPark work. By continuing you agree to our cookie use.</p>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => { localStorage.setItem(KEY, 'declined'); setShow(false); }}>Decline</button>
          <button type="button" className="btn-primary" onClick={() => { localStorage.setItem(KEY, 'accepted'); setShow(false); }}>Accept</button>
        </div>
      </div>
    </div>
  );
}
