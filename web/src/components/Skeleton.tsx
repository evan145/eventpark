interface Props {
  className?: string;
  count?: number;
}

export default function Skeleton({ className = 'h-4 w-full', count = 1 }: Props) {
  if (count > 1) {
    return (
      <div data-testid="skeleton-group">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`animate-pulse bg-gray-200 rounded ${className} mb-2`} data-testid="skeleton" aria-hidden />
        ))}
      </div>
    );
  }
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} data-testid="skeleton" aria-hidden />;
}
