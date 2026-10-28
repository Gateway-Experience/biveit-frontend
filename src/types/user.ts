// Shape of the user object returned by the backend (`/me`, `/user/*`).
// Fields are snake_case: that's the Python backend's convention, and the API hands documents through
// as they're stored rather than renaming at the edge.
export type UserType = 'USER' | 'GUEST';

// The flows the FE walks a user through step by step, as the BE names them (its UserJourney).
export type UserJourney = 'projects_intro' | 'welcome';

// One step a user took through a journey (the BE's user_journey_steps row). Which steps there are is up to
// the journey; a journey's latest step is where the user is in it now.
export type UserJourneyStep = {
  id: number;
  journey: UserJourney;
  step: string; // e.g. 'finished'
  data: Record<string, unknown>; // whatever the step keeps
  created_at: string;
};

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
  // App-level data with no column of its own.
  meta?: Record<string, unknown>;
  social_data?: {
    email?: string;
    [key: string]: unknown;
  };
};
