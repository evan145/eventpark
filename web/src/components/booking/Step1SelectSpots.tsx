interface Props {
  available: number;
  unitPrice: number;
  spots: number;
  onChange: (n: number) => void;
  onContinue: () => void;
}

export default function Step1SelectSpots({ available, unitPrice, spots, onChange, onContinue }: Props) {
  const total = (spots * unitPrice).toFixed(2);
  const dec = () => onChange(Math.max(1, spots - 1));
  const inc = () => onChange(Math.min(available, spots + 1));
  const valid = spots >= 1 && spots <= available;
  return (
    <section aria-labelledby="step1-heading" data-testid="step-1">
      <h2 id="step1-heading" className="text-xl font-semibold mb-4">How many spots?</h2>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-secondary" onClick={dec} aria-label="Decrease spots" disabled={spots <= 1}>−</button>
        <span data-testid="spots-value" className="text-2xl font-semibold w-10 text-center">{spots}</span>
        <button type="button" className="btn-secondary" onClick={inc} aria-label="Increase spots" disabled={spots >= available}>+</button>
        <span className="text-sm text-gray-600">/ {available} available</span>
      </div>
      <p className="mt-3 text-sm">Unit price: ${unitPrice.toFixed(2)}</p>
      <p className="mt-1 text-lg font-semibold" data-testid="step1-total">Total: ${total}</p>
      <button type="button" className="btn-primary mt-4" onClick={onContinue} disabled={!valid}>Continue</button>
    </section>
  );
}
