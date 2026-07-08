'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import {
  Alert,
  Box,
  Button,
  Card,
  Field,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

import { accentSolid } from '@/theme';

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
  // Set by the expiry paths (TopBar countdown, apiFetch 401, middleware) so
  // the user knows why they were signed out.
  const sessionExpired = searchParams.get('expired') === '1';
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched' });

  // Merge react-hook-form's ref with a local one so the show/hide toggle can
  // restore focus + caret position without clobbering RHF's registration.
  const { ref: registerPasswordRef, ...passwordField } = register('password');
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const togglePassword = () => {
    const el = passwordRef.current;
    const selectionStart = el?.selectionStart ?? null;
    const selectionEnd = el?.selectionEnd ?? null;
    setShowPassword((prev) => !prev);
    if (!el) return;
    // Keep focus on the field (the button's onMouseDown preventDefault stops
    // it from stealing focus in the first place; this covers keyboard toggles
    // and is a no-op when focus never left).
    el.focus();
    if (selectionStart !== null && selectionEnd !== null) {
      // Defer past the type flip, which can reset the caret in some browsers.
      requestAnimationFrame(() => {
        try {
          el.setSelectionRange(selectionStart, selectionEnd);
        } catch {
          // text/password support selection; guard anyway for safety.
        }
      });
    }
  };

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
            <Stack gap="2">
              {/* Typographic brand lockup — a small gradient mark + the app's
                  wordmark ("local-ai admin", the casing used app-wide in the
                  top bar, drawer and 404). No image asset required. */}
              <HStack gap="2" data-testid="login-brand">
                <Box
                  aria-hidden="true"
                  boxSize="6"
                  borderRadius="md"
                  backgroundImage={accentSolid}
                  boxShadow="e1"
                  flexShrink="0"
                />
                <Text
                  fontFamily="mono"
                  fontWeight="semibold"
                  letterSpacing="wide"
                  color="fg.default"
                >
                  local-ai admin
                </Text>
              </HStack>
              <Text textStyle="heading.sm">Sign in</Text>
              <Text textStyle="body.sm" color="fg.muted">
                Enter your credentials to continue.
              </Text>
            </Stack>

            {sessionExpired && (
              <Alert.Root status="warning" data-testid="login-expired">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description textStyle="body.sm">
                    Your session has expired. Sign in again to continue.
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

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
              <InputGroup
                endElement={
                  <IconButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    data-testid="login-password-toggle"
                    // Prevent the button from stealing focus from the field so
                    // the caret position is preserved through the toggle.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={togglePassword}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                }
              >
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  data-testid="login-password"
                  {...passwordField}
                  ref={(el) => {
                    registerPasswordRef(el);
                    passwordRef.current = el;
                  }}
                />
              </InputGroup>
              <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
            </Field.Root>

            {serverError && (
              <Alert.Root status="error" role="alert" data-testid="login-error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description textStyle="body.sm">
                    {serverError}
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
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
