export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-primary-600 focus:px-3 focus:py-2 focus:rounded focus:shadow"
      data-testid="skip-link"
    >
      Skip to main content
    </a>
  );
}
