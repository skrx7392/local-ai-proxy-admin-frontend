'use client';

import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Link as ChakraLink,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms';
import { ApiError } from '@/lib/api/errors';
import {
  useKeyDetail,
  useUpdateKeyRateLimit,
  useUpdateKeySessionLimit,
} from '@/features/keys/hooks';
import {
  UpdateRateLimitFormSchema,
  UpdateSessionLimitFormSchema,
  type UpdateRateLimitFormInput,
  type UpdateRateLimitFormValues,
  type UpdateSessionLimitFormInput,
  type UpdateSessionLimitFormValues,
} from '@/features/keys/schemas';

export default function KeyDetailPage() {
  const params = useParams<{ id: string }>();
  const parsedId = Number(params?.id);
  const id = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;

  const detail = useKeyDetail(id);

  if (id === null) {
    return (
      <Container maxW="4xl" paddingBlock="8" paddingInline="6">
        <Text color="fg.muted">Invalid key ID.</Text>
      </Container>
    );
  }

  if (detail.isLoading) {
    return (
      <Container maxW="4xl" paddingBlock="8" paddingInline="6">
        <HStack>
          <Spinner size="sm" />
          <Text color="fg.muted">Loading key…</Text>
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
            {is404 ? 'Key not found' : 'Failed to load key'}
          </Heading>
          <Text color="fg.muted">
            {detail.error instanceof Error
              ? detail.error.message
              : 'Unknown error.'}
          </Text>
          <ChakraLink asChild>
            <NextLink href="/keys">Back to keys</NextLink>
          </ChakraLink>
        </Stack>
      </Container>
    );
  }

  const key = detail.data;
  if (!key) return null;

  return (
    <Container maxW="4xl" paddingBlock="8" paddingInline="6">
      <Stack gap="6">
        <Box>
          <ChakraLink
            asChild
            color="fg.muted"
            textStyle="body.sm"
            data-testid="key-detail-back"
          >
            <NextLink href="/keys">← Back to keys</NextLink>
          </ChakraLink>
          <Heading textStyle="heading.md" marginTop="2">
            {key.name}
          </Heading>
          <Text
            fontFamily="mono"
            fontSize="xs"
            color="fg.muted"
            marginTop="1"
            data-testid="key-detail-prefix"
          >
            {key.key_prefix}…
          </Text>
        </Box>

        <Box
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="lg"
          padding="6"
        >
          <Stack gap="4">
            <Heading textStyle="heading.sm">Details</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              <Field label="Key ID">
                <Text data-testid="key-detail-id">{key.id}</Text>
              </Field>
              <Field label="Status">
                <Badge
                  colorPalette={key.revoked ? 'gray' : 'green'}
                  data-testid="key-detail-status"
                >
                  {key.revoked ? 'Revoked' : 'Active'}
                </Badge>
              </Field>
              <Field label="Owner user">
                <Text>{key.user_id ?? '—'}</Text>
              </Field>
              <Field label="Account">
                <Text>{key.account_id ?? '—'}</Text>
              </Field>
              <Field label="Rate limit">
                <Text data-testid="key-detail-rate-limit">
                  {key.rate_limit.toLocaleString()} req/min
                </Text>
              </Field>
              <Field label="Session limit">
                <Text data-testid="key-detail-session-limit">
                  {key.session_token_limit === null
                    ? 'Unlimited'
                    : `${key.session_token_limit.toLocaleString()} tokens`}
                </Text>
              </Field>
              <Field label="Created">
                <Text>{new Date(key.created_at).toLocaleString()}</Text>
              </Field>
            </SimpleGrid>
          </Stack>
        </Box>

        <RateLimitForm
          id={id}
          currentRateLimit={key.rate_limit}
          revoked={key.revoked}
        />

        <SessionLimitForm
          id={id}
          currentLimit={key.session_token_limit}
          revoked={key.revoked}
        />
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

function RateLimitForm({
  id,
  currentRateLimit,
  revoked,
}: {
  id: number;
  currentRateLimit: number;
  revoked: boolean;
}) {
  const mutation = useUpdateKeyRateLimit(id);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateRateLimitFormInput, unknown, UpdateRateLimitFormValues>({
    resolver: zodResolver(UpdateRateLimitFormSchema),
    mode: 'onTouched',
    defaultValues: { rate_limit: String(currentRateLimit) },
  });

  // Keep the form in sync when detail re-fetches (e.g. after successful mutate).
  useEffect(() => {
    reset({ rate_limit: String(currentRateLimit) });
  }, [currentRateLimit, reset]);

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    setSuccessMessage(null);
    mutation.mutate(values, {
      onSuccess: () => setSuccessMessage('Rate limit updated.'),
      onError: (err) => {
        setSubmitError(
          err instanceof ApiError ? err.message : 'Failed to update rate limit.',
        );
      },
    });
  });

  return (
    <Box
      as="form"
      onSubmit={onSubmit}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      padding="6"
      data-testid="key-rate-limit-form"
    >
      <Stack gap="4">
        <Box>
          <Heading textStyle="heading.sm">Rate limit</Heading>
          <Text color="fg.muted" textStyle="body.sm">
            Requests per minute. Positive integer, max 10,000.
          </Text>
        </Box>
        <FormField<UpdateRateLimitFormInput>
          name="rate_limit"
          label="Requests per minute"
          type="number"
          register={register}
          errorMessage={errors.rate_limit?.message}
          disabled={revoked || mutation.isPending}
          data-testid="key-rate-limit-input"
        />
        {submitError && (
          <Text
            role="alert"
            color="red.500"
            textStyle="body.sm"
            data-testid="key-rate-limit-error"
          >
            {submitError}
          </Text>
        )}
        {successMessage && !submitError && (
          <Text
            color="green.600"
            textStyle="body.sm"
            data-testid="key-rate-limit-success"
          >
            {successMessage}
          </Text>
        )}
        <HStack justify="flex-end">
          <Button
            type="submit"
            colorPalette="accent"
            loading={mutation.isPending}
            disabled={revoked || !isDirty}
            data-testid="key-rate-limit-submit"
          >
            Save rate limit
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}

function SessionLimitForm({
  id,
  currentLimit,
  revoked,
}: {
  id: number;
  currentLimit: number | null;
  revoked: boolean;
}) {
  const mutation = useUpdateKeySessionLimit(id);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateSessionLimitFormInput, unknown, UpdateSessionLimitFormValues>({
    resolver: zodResolver(UpdateSessionLimitFormSchema),
    mode: 'onTouched',
    defaultValues: { limit: currentLimit === null ? '' : String(currentLimit) },
  });

  useEffect(() => {
    reset({ limit: currentLimit === null ? '' : String(currentLimit) });
  }, [currentLimit, reset]);

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    setSuccessMessage(null);
    mutation.mutate(values, {
      onSuccess: () =>
        setSuccessMessage(
          values.limit === null
            ? 'Session limit cleared.'
            : 'Session limit updated.',
        ),
      onError: (err) => {
        setSubmitError(
          err instanceof ApiError
            ? err.message
            : 'Failed to update session limit.',
        );
      },
    });
  });

  return (
    <Box
      as="form"
      onSubmit={onSubmit}
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      padding="6"
      data-testid="key-session-limit-form"
    >
      <Stack gap="4">
        <Box>
          <Heading textStyle="heading.sm">Session token limit</Heading>
          <Text color="fg.muted" textStyle="body.sm">
            Max tokens per session. Leave blank to remove the limit.
          </Text>
        </Box>
        <FormField<UpdateSessionLimitFormInput>
          name="limit"
          label="Token limit"
          type="number"
          register={register}
          placeholder="Unlimited"
          errorMessage={errors.limit?.message}
          disabled={revoked || mutation.isPending}
          data-testid="key-session-limit-input"
        />
        {submitError && (
          <Text
            role="alert"
            color="red.500"
            textStyle="body.sm"
            data-testid="key-session-limit-error"
          >
            {submitError}
          </Text>
        )}
        {successMessage && !submitError && (
          <Text
            color="green.600"
            textStyle="body.sm"
            data-testid="key-session-limit-success"
          >
            {successMessage}
          </Text>
        )}
        <HStack justify="flex-end">
          <Button
            type="submit"
            colorPalette="accent"
            loading={mutation.isPending}
            disabled={revoked || !isDirty}
            data-testid="key-session-limit-submit"
          >
            Save session limit
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}
