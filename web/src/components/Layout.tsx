import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import SkipLink from './SkipLink';
import OfflineBanner from './OfflineBanner';
import CookieBanner from './CookieBanner';
import { usePageView } from '../hooks/useAnalytics';

export default function Layout() {
  usePageView();
  return (
    <div className="min-h-screen flex flex-col">
      <SkipLink />
      <OfflineBanner />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
