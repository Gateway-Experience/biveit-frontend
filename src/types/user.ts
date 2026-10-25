// Shape of the user object returned by the backend (`/me`, `/user/*`).
// Fields are snake_case: that's the Python backend's convention, and the API hands documents through
// as they're stored rather than renaming at the edge.
export type UserType = 'USER' | 'GUEST';

// The guided tours (see SpotlightTour), as the BE names them (its UserTour).
export type UserTour = 'projects';

export type User = {
  _id: string;
  id?: number; // the BE's primary key
  username: string;
  user_type: UserType;
  first_name?: string | null; // asked for at signup; null on guests and accounts from before that
  last_name?: string | null; // can be '' — not everyone has one
  has_password?: boolean; // false for Google-only accounts: the profile page then sets a first password
  role?: 'ADMIN' | null; // null for a normal user; ADMIN opens the admin dashboard (the BE checks it too)
  profile_picture?: string;
  language?: string; // the language picker's choice ('en' | 'vi'), saved by LanguageSelector
  google_id?: string;
  // App-level data with no column of its own, e.g. `projects_tour_finished_at` (see services/user.hasFinishedTour).
  meta?: Record<string, unknown>;
  social_data?: {
    email?: string;
    [key: string]: unknown;
  };
};
