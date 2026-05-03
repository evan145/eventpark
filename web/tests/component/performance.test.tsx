import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../src');

function read(file: string): string {
  return fs.readFileSync(path.join(SRC, file), 'utf8');
}

describe('Performance / code splitting', () => {
  it('routes use React.lazy for page modules', () => {
    const code = read('routes.tsx');
    expect(code).toMatch(/lazy\(\s*\(\)\s*=>\s*import\(/);
  });

  it('Map component is dynamically imported in EventDetail', () => {
    const code = read('pages/EventDetail.tsx');
    expect(code).toMatch(/lazy\(/);
    expect(code).toMatch(/Map/);
  });

  it('Stripe is loaded lazily in Step3Payment', () => {
    const code = read('components/booking/Step3Payment.tsx');
    expect(code).toMatch(/lazy\(/);
  });
});
