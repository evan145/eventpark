import type { HostEarnings } from '../../types';

export default function EarningsWidget({ data }: { data: HostEarnings }) {
  return (
    <section aria-label="Earnings" className="card p-4" data-testid="earnings-widget">
      <h2 className="text-lg font-semibold mb-2">Earnings</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs uppercase text-gray-500">Lifetime total</div>
          <div className="text-2xl font-bold" data-testid="earnings-total">${data.total_earned.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Pending payout</div>
          <div className="text-2xl font-bold" data-testid="earnings-pending">${data.pending.toFixed(2)}</div>
        </div>
      </div>
    </section>
  );
}
