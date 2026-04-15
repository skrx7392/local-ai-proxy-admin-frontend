import {
  BarChart3,
  Coins,
  DollarSign,
  Home,
  Key,
  Link as LinkIcon,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /**
   * Optional second key of a `g <x>` chord. Keep only the two FE H bindings
   * (`g u`, `g k`) live; others are declarative metadata for future use by
   * SideNav/search but are NOT registered as shortcuts.
   */
  shortcut?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/usage', label: 'Usage', icon: BarChart3 },
  { href: '/keys', label: 'Keys', icon: Key, shortcut: 'k' },
  { href: '/users', label: 'Users', icon: Users, shortcut: 'u' },
  { href: '/accounts', label: 'Accounts', icon: Coins },
  { href: '/pricing', label: 'Pricing', icon: DollarSign },
  {
    href: '/registration-tokens',
    label: 'Registration tokens',
    icon: LinkIcon,
  },
  { href: '/registrations', label: 'Registrations', icon: UserPlus },
  { href: '/config', label: 'Config', icon: Settings },
];

/** Items that participate in the `g <x>` chord. */
export const GOTO_SHORTCUTS = NAV_ITEMS.filter(
  (item): item is NavItem & { shortcut: string } =>
    typeof item.shortcut === 'string',
);
