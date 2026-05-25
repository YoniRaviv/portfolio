import type { SectionKey, SectionRig } from '../types';
import { heroDesktop, heroMobile } from './hero';
import { whoDesktop, whoMobile } from './who';
import { whatDesktop, whatMobile } from './what';
import { whereDesktop, whereMobile } from './where';
import { howDesktop, howMobile } from './how';
import { contactDesktop, contactMobile } from './contact';

export { HERO_RIG, HERO_RIG_MOBILE } from './hero';

export const SECTION_RIGS_DESKTOP: Record<SectionKey, SectionRig> = {
  hero: heroDesktop,
  who: whoDesktop,
  what: whatDesktop,
  where: whereDesktop,
  how: howDesktop,
  contact: contactDesktop,
};

export const SECTION_RIGS_MOBILE: Record<SectionKey, SectionRig> = {
  hero: heroMobile,
  who: whoMobile,
  what: whatMobile,
  where: whereMobile,
  how: howMobile,
  contact: contactMobile,
};
