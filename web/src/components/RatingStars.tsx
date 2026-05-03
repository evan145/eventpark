export default function RatingStars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span aria-label={`Rating ${value.toFixed(1)} out of 5`} data-testid="rating-stars" className="text-yellow-500">
      {'★'.repeat(rounded)}{'☆'.repeat(Math.max(0, 5 - rounded))}
      <span className="sr-only"> {value.toFixed(1)}</span>
    </span>
  );
}
