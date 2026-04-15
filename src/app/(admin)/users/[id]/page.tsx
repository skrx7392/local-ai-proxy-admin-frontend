'use client';

import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Link as ChakraLink,
  Separator,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ApiError } from '@/lib/api/errors';
import {
  useActiveAdminCount,
  useChangeUserRole,
  useUserDetail,
} from '@/features/users/hooks';
import type { UserRole } from '@/features/users/schemas';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const parsedId = Number(params?.id);
  const id = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;

  const detail = useUserDetail(id);
  const adminCount = useActiveAdminCount();
  const changeRole = useChangeUserRole(id ?? 0);

  const [roleError, setRoleError] = useState<string | null>(null);

  if (id === null) {
    return (
      <Container maxW="4xl" paddingBlock="8" paddingInline="6">
        <Text color="fg.muted">Invalid user ID.</Text>
      </Container>
    );
  }

  if (detail.isLoading) {
    return (
      <Container maxW="4xl" paddingBlock="8" paddingInline="6">
        <HStack>
          <Spinner size="sm" />
          <Text color="fg.muted">Loading user…</Text>
        </HStack>
      </Container>
    );
  }

  if (detail.isError) {
    const is404 =
      detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <Container maxW="4xl" paddingBlock="8" paddingInline="6">
        <Stack gap="3">
          <Heading textStyle="heading.md">
            {is404 ? 'User not found' : 'Failed to load user'}
          </Heading>
          <Text color="fg.muted">
            {detail.error instanceof Error
              ? detail.error.message
              : 'Unknown error.'}
          </Text>
          <ChakraLink asChild>
            <NextLink href="/users">Back to users</NextLink>
          </ChakraLink>
        </Stack>
      </Container>
    );
  }

  const user = detail.data;
  if (!user) return null;

  const isLastActiveAdmin =
    user.role === 'admin' &&
    user.is_active &&
    adminCount.data !== undefined &&
    adminCount.data <= 1;

  function handleRoleChange(next: UserRole): void {
    if (!user || next === user.role) return;
    setRoleError(null);
    changeRole.mutate(next, {
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'last_admin') {
          setRoleError(
            'Cannot remove the last active admin. Promote another user first.',
          );
          return;
        }
        setRoleError(
          error instanceof ApiError
            ? error.message
            : 'Failed to change role.',
        );
      },
    });
  }

  return (
    <Container maxW="4xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <Box>
          <ChakraLink
            asChild
            color="fg.muted"
            textStyle="body.sm"
            data-testid="user-detail-back"
          >
            <NextLink href="/users">← Back to users</NextLink>
          </ChakraLink>
          <Heading textStyle="heading.md" marginTop="2">
            {user.email}
          </Heading>
          {user.name && (
            <Text color="fg.muted" textStyle="body.sm">
              {user.name}
            </Text>
          )}
        </Box>

        <Box
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="lg"
          padding="6"
        >
          <Stack gap="4">
            <Heading textStyle="heading.sm">Profile</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              <Field label="User ID">
                <Text data-testid="user-detail-id">{user.id}</Text>
              </Field>
              <Field label="Status">
                <Badge
                  colorPalette={user.is_active ? 'green' : 'gray'}
                  data-testid="user-detail-status"
                >
                  {user.is_active ? 'Active' : 'Deactivated'}
                </Badge>
              </Field>
              <Field label="Role">
                <Badge
                  colorPalette={user.role === 'admin' ? 'purple' : 'gray'}
                  data-testid="user-detail-role"
                >
                  {user.role}
                </Badge>
              </Field>
              <Field label="Account">
                <Text data-testid="user-detail-account">
                  {user.account_id ?? '—'}
                </Text>
              </Field>
              <Field label="Created">
                <Text>{new Date(user.created_at).toLocaleString()}</Text>
              </Field>
              <Field label="Updated">
                <Text>{new Date(user.updated_at).toLocaleString()}</Text>
              </Field>
            </SimpleGrid>
          </Stack>
        </Box>

        <Box
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="lg"
          padding="6"
        >
          <Stack gap="4">
            <Box>
              <Heading textStyle="heading.sm">Role</Heading>
              <Text color="fg.muted" textStyle="body.sm">
                Admins can manage all users, keys, and billing. User is
                everything else.
              </Text>
            </Box>

            <HStack gap="2" data-testid="user-role-toggle">
              {(['admin', 'user'] as const).map((value) => {
                const isCurrent = value === user.role;
                const disableDemote =
                  value === 'user' && isLastActiveAdmin;
                return (
                  <Button
                    key={value}
                    size="sm"
                    variant={isCurrent ? 'solid' : 'outline'}
                    colorPalette={value === 'admin' ? 'purple' : 'gray'}
                    onClick={() => handleRoleChange(value)}
                    loading={changeRole.isPending && !isCurrent}
                    disabled={
                      isCurrent || changeRole.isPending || disableDemote
                    }
                    data-testid={`user-role-set-${value}`}
                  >
                    {value === 'admin' ? 'Admin' : 'User'}
                  </Button>
                );
              })}
            </HStack>

            {isLastActiveAdmin && (
              <Text
                color="fg.muted"
                textStyle="body.sm"
                data-testid="user-role-last-admin-hint"
              >
                This is the last active admin. Promote another user before
                demoting this one.
              </Text>
            )}
            {roleError && (
              <Text
                role="alert"
                color="red.500"
                textStyle="body.sm"
                data-testid="user-role-error"
              >
                {roleError}
              </Text>
            )}
          </Stack>
        </Box>

        <Separator />
      </Stack>
    </Container>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="1">
      <Text color="fg.muted" textStyle="body.xs" textTransform="uppercase">
        {label}
      </Text>
      {children}
    </Stack>
  );
}
