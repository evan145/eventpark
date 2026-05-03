import { useQuery } from '@tanstack/react-query';
import { adminRevenue } from '../../api/admin';
import Skeleton from '../Skeleton';

export default function RevenueDashboard() {
  const q = useQuery({ queryKey: ['admin', 'revenue'], queryFn: adminRevenue });
  if (q.isLoading) return <Skeleton count={3} className="h-12 w-full" />;
  if (q.isError) return <button className="btn-secondary" onClick={() => q.refetch()}>Retry</button>;
  const r = q.data!;
  return (
    <section data-testid="revenue-dashboard" className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card p-4"><div className="text-xs uppercase text-gray-500">Bookings</div><div className="text-2xl font-bold">{r.total_bookings}</div></div>
      <div className="card p-4"><div className="text-xs uppercase text-gray-500">Gross</div><div className="text-2xl font-bold">${r.total_gross.toFixed(2)}</div></div>
      <div className="card p-4"><div className="text-xs uppercase text-gray-500">Commission</div><div className="text-2xl font-bold">${r.total_commission.toFixed(2)}</div></div>
      <div className="card p-4"><div className="text-xs uppercase text-gray-500">Net</div><div className="text-2xl font-bold">${r.net_commission.toFixed(2)}</div></div>
    </section>
  );
}
