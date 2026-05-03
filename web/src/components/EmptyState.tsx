import type { ReactNode } from 'react';

interface Props {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, message, icon, action }: Props) {
  return (
    <div className="text-center py-12 px-4" data-testid="empty-state" role="status">
      <div className="mx-auto mb-4 text-4xl text-gray-400" aria-hidden>{icon ?? '∅'}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {message && <p className="text-gray-600">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
