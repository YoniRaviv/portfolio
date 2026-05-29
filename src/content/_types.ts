import type { ImageMetadata } from 'astro';

export type SkillLevel = 'daily' | 'fluent' | 'core' | 'shipped' | 'working' | 'occasional' | '2 yr' | '3 yr' | '4 yr' | '5 yr';

export interface Chip {
  name: string;
  level: string;
  hero?: boolean;
}

export interface SkillGroup {
  idx: string;
  label: string;
  blurb: string;
  chips: Chip[];
}

export interface Project {
  idx: string;
  year: string;
  name: string;
  tags: string[];
  desc: string;
  href: string;
  slug: string;
  /** Hero shot shown in the hover thumb (What section). Optional so unreleased
   *  projects can ship without one and gracefully fall back to the placeholder. */
  image?: ImageMetadata;
}

export interface Role {
  range: string;
  company: string;
  title: string;
  city: string;
  current?: boolean;
}

export interface Social {
  kind: string;
  handle: string;
  href: string;
  kicker: string;
}

export interface MetaCell {
  k: string;
  v: string;
  vs: string;
}

export interface NavLink {
  href: string;
  label: string;
  anchor?: string;
  external?: boolean;
}

export interface SiteInfo {
  url: string;
  name: string;
  shortName: string;
  email: string;
  jobTitle: string;
  location: string;
  coords: string;
  twitter: string;
  github: string;
  linkedin: string;
}
