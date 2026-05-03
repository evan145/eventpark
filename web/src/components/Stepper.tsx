interface Props {
  steps: string[];
  current: number;
}

export default function Stepper({ steps, current }: Props) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isCurrent = stepNum === current;
        const isDone = stepNum < current;
        return (
          <li key={label} className="flex items-center" aria-current={isCurrent ? 'step' : undefined}>
            <span
              className={`inline-flex items-center justify-center rounded-full w-8 h-8 text-sm font-semibold ${
                isCurrent ? 'bg-primary-600 text-white' : isDone ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {stepNum}
            </span>
            <span className="ml-2 text-sm">{label}</span>
            {idx < steps.length - 1 && <span className="mx-3 text-gray-300" aria-hidden>—</span>}
          </li>
        );
      })}
    </ol>
  );
}
