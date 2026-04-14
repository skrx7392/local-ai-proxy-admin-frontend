'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button, Card, Field, Input, Stack, Text } from '@chakra-ui/react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

function sanitizeCallback(raw: string | null): string {
  // Only allow same-origin relative paths. Anything else falls back to '/'.
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallback(searchParams.get('callbackUrl'));
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched' });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    const result = await signIn('credentials', { ...values, redirect: false });
    if (!result || result.error) {
      setServerError('Invalid email or password.');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <Card.Root maxW="400px" width="100%" data-testid="login-card">
      <Card.Body>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack gap="4">
            <Text textStyle="heading.sm">Sign in</Text>
            <Text textStyle="body.sm" color="fg.muted">
              Admin console for local-ai-proxy.
            </Text>

            <Field.Root invalid={Boolean(errors.email)}>
              <Field.Label>Email</Field.Label>
              <Input
                type="email"
                autoComplete="email"
                autoFocus
                data-testid="login-email"
                {...register('email')}
              />
              <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.password)}>
              <Field.Label>Password</Field.Label>
              <Input
                type="password"
                autoComplete="current-password"
                data-testid="login-password"
                {...register('password')}
              />
              <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
            </Field.Root>

            {serverError && (
              <Text color="red.500" data-testid="login-error" textStyle="body.sm">
                {serverError}
              </Text>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              data-testid="login-submit"
              colorPalette="accent"
            >
              Sign in
            </Button>
          </Stack>
        </form>
      </Card.Body>
    </Card.Root>
  );
}
