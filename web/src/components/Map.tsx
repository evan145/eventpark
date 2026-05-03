import { useEffect, useState, type ComponentType } from 'react';
import type { SpotSummary, EventDetail } from '../types';

interface Props {
  spots: SpotSummary[];
  venue?: Pick<EventDetail, 'latitude' | 'longitude' | 'venue_name'>;
}

interface LeafletExports {
  MapContainer: ComponentType<Record<string, unknown>>;
  TileLayer: ComponentType<Record<string, unknown>>;
  Marker: ComponentType<Record<string, unknown>>;
  Popup: ComponentType<Record<string, unknown>>;
  L: typeof import('leaflet');
}

export default function Map({ spots, venue }: Props) {
  const [mod, setMod] = useState<LeafletExports | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import('react-leaflet'), import('leaflet')])
      .then(([rl, L]) => {
        if (cancelled) return;
        setMod({
          MapContainer: rl.MapContainer as ComponentType<Record<string, unknown>>,
          TileLayer: rl.TileLayer as ComponentType<Record<string, unknown>>,
          Marker: rl.Marker as ComponentType<Record<string, unknown>>,
          Popup: rl.Popup as ComponentType<Record<string, unknown>>,
          L: L.default ?? L,
        });
      })
      .catch(() => setError('Map failed to load'));
    return () => { cancelled = true; };
  }, []);

  if (error) return <div role="alert">{error}</div>;
  if (!mod) return <div data-testid="map-loading" aria-busy="true">Loading map…</div>;

  const { MapContainer, TileLayer, Marker, Popup } = mod;

  const lats = spots.map((s) => s.latitude);
  const lngs = spots.map((s) => s.longitude);
  if (venue) { lats.push(venue.latitude); lngs.push(venue.longitude); }
  const center: [number, number] =
    lats.length > 0
      ? [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2]
      : [43.0731, -89.4012];

  return (
    <div data-testid="map-view" className="h-96 w-full rounded overflow-hidden">
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {venue && (
          <Marker position={[venue.latitude, venue.longitude]} data-testid="venue-pin">
            <Popup>
              <strong>Venue: {venue.venue_name}</strong>
            </Popup>
          </Marker>
        )}
        {spots.map((s) => (
          <Marker key={s.event_listing_id} position={[s.latitude, s.longitude]} data-testid={`spot-pin-${s.listing_id}`}>
            <Popup>
              <div>${s.price_per_spot.toFixed(2)}</div>
              <a href={`/listings/${s.listing_id}`}>Book</a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
