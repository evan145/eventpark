import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listEvents } from '../../api/events';
import { adminCreateEvent, adminDeleteEvent } from '../../api/admin';
import Modal from '../Modal';
import { useToast } from '../Toast';
import Skeleton from '../Skeleton';

export default function EventsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', venue_name: '', venue_address: '', event_date: '', event_time: '' });

  const q = useQuery({ queryKey: ['events'], queryFn: () => listEvents() });

  const create = useMutation({
    mutationFn: adminCreateEvent,
    onSuccess: () => {
      toast.push('Event created', 'success');
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['events'] });
    },
    onError: () => toast.push('Could not create event', 'error'),
  });

  const del = useMutation({
    mutationFn: (id: number) => adminDeleteEvent(id),
    onSuccess: () => {
      toast.push('Event deleted', 'success');
      qc.invalidateQueries({ queryKey: ['events'] });
    },
    onError: () => toast.push('Could not delete event', 'error'),
  });

  if (q.isLoading) return <Skeleton count={3} className="h-12 w-full" />;
  if (q.isError) return <button className="btn-secondary" onClick={() => q.refetch()}>Retry</button>;

  return (
    <div data-testid="events-tab">
      <button type="button" className="btn-primary mb-3" onClick={() => setCreating(true)}>New event</button>
      <ul className="space-y-2">
        {(q.data ?? []).map((e) => (
          <li key={e.id} className="card p-3 flex justify-between items-center">
            <div>
              <div className="font-semibold">{e.name}</div>
              <div className="text-sm text-gray-600">{e.venue_name} · {e.event_date}</div>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setConfirming(e.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <Modal open={confirming !== null} onClose={() => setConfirming(null)} title="Delete event?">
        <p>This will remove the event and any linked listings.</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirming(null)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => { if (confirming != null) { del.mutate(confirming); setConfirming(null); } }}>
            Delete
          </button>
        </div>
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)} title="New event">
        <div className="space-y-2">
          <label htmlFor="ev-name">Name</label>
          <input id="ev-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <label htmlFor="ev-venue">Venue</label>
          <input id="ev-venue" value={draft.venue_name} onChange={(e) => setDraft({ ...draft, venue_name: e.target.value })} />
          <label htmlFor="ev-addr">Venue address</label>
          <input id="ev-addr" value={draft.venue_address} onChange={(e) => setDraft({ ...draft, venue_address: e.target.value })} />
          <label htmlFor="ev-date">Date</label>
          <input id="ev-date" type="date" value={draft.event_date} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} />
          <label htmlFor="ev-time">Time</label>
          <input id="ev-time" type="time" value={draft.event_time} onChange={(e) => setDraft({ ...draft, event_time: e.target.value })} />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => create.mutate(draft)}>Create</button>
        </div>
      </Modal>
    </div>
  );
}
