import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-auto" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-gray-600">
        <div>© {new Date().getFullYear()} EventPark</div>
        <nav aria-label="Footer">
          <ul className="flex gap-4">
            <li><Link to="/terms">Terms</Link></li>
            <li><Link to="/privacy">Privacy</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/terms#cancellation">Cancellation Policy</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
