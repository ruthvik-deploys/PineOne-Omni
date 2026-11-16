import { createContext, useContext } from 'react';

/**
 * The profile, held by the app shell (app-tabs.tsx) so it outlives route
 * changes. A page opened from it slides in from the right over the profile,
 * which stays put underneath; that page's Back slides it out to the right
 * again, back onto the profile — the profile's own open / close, one level in.
 */
export type ProfileNav = {
  /** Slide the profile in (Overview's avatar). */
  open: () => void;
  /** Slide the profile out. */
  close: () => void;
  /** Push a page from the profile: it comes in from the right, over the profile. */
  openPage: (href: string) => void;
  /** The page opened from the profile, while it's showing; its Back returns to the profile. */
  page: string | null;
  /** Slide the page out to the right, back onto the profile. */
  back: () => void;
};

export const ProfileNavContext = createContext<ProfileNav>({
  open: () => {},
  close: () => {},
  openPage: () => {},
  page: null,
  back: () => {},
});

export function useProfileNav() {
  return useContext(ProfileNavContext);
}
