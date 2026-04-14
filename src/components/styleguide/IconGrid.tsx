'use client';

import { Box, HStack, Stack, Text } from '@chakra-ui/react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  EyeOff,
  Filter,
  Info,
  Key,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  TrendingDown,
  TrendingUp,
  Trash2,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';

interface IconEntry {
  name: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

const ICONS: IconEntry[] = [
  { name: 'Key', Icon: Key },
  { name: 'Users', Icon: Users },
  { name: 'Activity', Icon: Activity },
  { name: 'BarChart3', Icon: BarChart3 },
  { name: 'Shield', Icon: Shield },
  { name: 'Search', Icon: Search },
  { name: 'Plus', Icon: Plus },
  { name: 'Check', Icon: Check },
  { name: 'X', Icon: X },
  { name: 'Settings', Icon: Settings },
  { name: 'TrendingUp', Icon: TrendingUp },
  { name: 'TrendingDown', Icon: TrendingDown },
  { name: 'AlertTriangle', Icon: AlertTriangle },
  { name: 'Info', Icon: Info },
  { name: 'CheckCircle', Icon: CheckCircle },
  { name: 'XCircle', Icon: XCircle },
  { name: 'Eye', Icon: Eye },
  { name: 'EyeOff', Icon: EyeOff },
  { name: 'Copy', Icon: Copy },
  { name: 'Trash2', Icon: Trash2 },
  { name: 'Pencil', Icon: Pencil },
  { name: 'Filter', Icon: Filter },
  { name: 'ChevronDown', Icon: ChevronDown },
  { name: 'ChevronRight', Icon: ChevronRight },
  { name: 'RefreshCw', Icon: RefreshCw },
  { name: 'MoreHorizontal', Icon: MoreHorizontal },
  { name: 'Bell', Icon: Bell },
  { name: 'LogOut', Icon: LogOut },
  { name: 'Download', Icon: Download },
  { name: 'Calendar', Icon: Calendar },
  { name: 'Clock', Icon: Clock },
  { name: 'Zap', Icon: Zap },
];

const CANONICAL_SIZES = [14, 16, 20, 24, 48] as const;

/**
 * Grid of icons (one per cell) + a dedicated row showing the five canonical
 * sizes applied to a single pivot icon, so size scaling is legible.
 */
export function IconGrid() {
  return (
    <Stack gap="6">
      <Stack gap="2">
        <Text textStyle="heading.sm">Catalog</Text>
        <Box
          display="grid"
          gridTemplateColumns="repeat(auto-fill, minmax(96px, 1fr))"
          gap="3"
        >
          {ICONS.map(({ name, Icon }) => (
            <Stack
              key={name}
              align="center"
              gap="2"
              padding="3"
              borderRadius="md"
              borderWidth="1px"
              borderStyle="solid"
              borderColor="border.subtle"
              background="bg.glass.subtle"
            >
              <Icon size={20} strokeWidth={1.75} />
              <Text textStyle="caption" color="fg.muted" textAlign="center">
                {name}
              </Text>
            </Stack>
          ))}
        </Box>
      </Stack>

      <Stack gap="2">
        <Text textStyle="heading.sm">Canonical sizes</Text>
        <HStack gap="6" align="flex-end" wrap="wrap">
          {CANONICAL_SIZES.map((size) => (
            <Stack key={size} align="center" gap="2">
              <Key size={size} strokeWidth={1.75} />
              <Text textStyle="caption" color="fg.muted">
                {size}px
              </Text>
            </Stack>
          ))}
        </HStack>
      </Stack>
    </Stack>
  );
}
