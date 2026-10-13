import type { Project } from 'src/types/project';

// Intentions: stand-in for `/projects` until the backend endpoint exists. Timestamps are relative to
// page load so "edited x ago" always looks realistic. Swap to `[]` to see the empty state.
const _HOUR_MS = 3600 * 1000;
const _hoursAgo = (hours: number) => new Date(Date.now() - hours * _HOUR_MS).toISOString();

const mockProjects: Project[] = [
  {
    _id: 'p_01',
    name: 'Bean & Brew',
    description: 'Landing page for a neighborhood coffee roaster, with a menu, opening hours and a map.',
    status: 'PUBLISHED',
    created_at: _hoursAgo(24 * 9),
    updated_at: _hoursAgo(2),
  },
  {
    _id: 'p_02',
    name: 'Portfolio — Linh Tran',
    description: 'Minimal photography portfolio with a masonry gallery and a contact form.',
    status: 'DRAFT',
    created_at: _hoursAgo(24 * 3),
    updated_at: _hoursAgo(20),
  },
  {
    _id: 'p_03',
    name: 'Saigon Run Club',
    description: 'Event schedule, route maps and a sign-up page for weekly community runs.',
    status: 'PUBLISHED',
    created_at: _hoursAgo(24 * 30),
    updated_at: _hoursAgo(24 * 4),
  },
  {
    _id: 'p_04',
    name: 'Untitled project',
    status: 'DRAFT',
    created_at: _hoursAgo(24 * 45),
    updated_at: _hoursAgo(24 * 40),
  },
];

export default mockProjects;
