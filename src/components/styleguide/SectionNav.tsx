'use client';

import { Box, Stack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

export interface SectionNavItem {
  id: string;
  label: string;
}

export interface SectionNavProps {
  items: SectionNavItem[];
}

/**
 * Sticky left-side nav for the styleguide. Uses IntersectionObserver to
 * highlight the currently-visible section. Each click is a native hash link
 * so deep-linking works without JS (Back/Forward buttons restore position).
 */
export function SectionNav({ items }: SectionNavProps) {
  const firstId = items[0]?.id ?? '';
  const [active, setActive] = useState<string>(firstId);

  useEffect(() => {
    // Guard: jsdom in vitest may lack IntersectionObserver; we only wire up
    // when the real browser provides it.
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport among the
        // currently-intersecting candidates.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0];
        if (top?.target.id) {
          setActive(top.target.id);
        }
      },
      {
        // Trigger when the section crosses the top third of the viewport.
        rootMargin: '-10% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    const observed: Element[] = [];
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    }

    return () => {
      for (const el of observed) observer.unobserve(el);
      observer.disconnect();
    };
  }, [items]);

  return (
    <Box
      as="nav"
      aria-label="Styleguide sections"
      data-testid="section-nav"
      position="sticky"
      top="24"
      alignSelf="flex-start"
      width="220px"
      flexShrink="0"
      maxH="calc(100vh - 96px)"
      overflowY="auto"
      padding="4"
      borderRadius="lg"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border.glass"
      background="bg.glass.sidebar"
      backdropFilter="blur(18px) saturate(1.2)"
      boxShadow="e0"
    >
      <Text
        textStyle="caption"
        color="fg.subtle"
        textTransform="uppercase"
        letterSpacing="0.08em"
        marginBottom="3"
      >
        Sections
      </Text>
      <Stack as="ul" gap="0.5" listStyleType="none">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <Box as="li" key={item.id}>
              <Box
                as="a"
                href={`#${item.id}`}
                data-nav-item={item.id}
                data-active={isActive ? 'true' : 'false'}
                display="block"
                paddingInline="3"
                paddingBlock="2"
                borderRadius="sm"
                textStyle="body.sm"
                color={isActive ? 'accent.emphasis' : 'fg.muted'}
                background={isActive ? 'accent.muted' : 'transparent'}
                fontWeight={isActive ? 'semibold' : 'regular'}
                _hover={{ background: 'bg.glass.subtle', color: 'fg.default' }}
                transition="background-color 140ms, color 140ms"
              >
                {item.label}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
