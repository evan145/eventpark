export default function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2 py-1 rounded"
      data-testid="verified-badge"
      aria-label="Verified host"
    >
      <span aria-hidden>✓</span> Verified
    </span>
  );
}
