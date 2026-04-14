'use client';

import {
  Box,
  Button,
  Dialog,
  HStack,
  IconButton,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export interface OneTimeSecretDialogProps {
  isOpen: boolean;
  /**
   * The plaintext secret to display. When it's present, the dialog is
   * "armed" — the user must acknowledge saving it before it closes.
   */
  secret: string | null;
  /** Heading, e.g. "API key created". */
  title: string;
  /** Sub-copy, e.g. "Copy this key now. You won't be able to see it again." */
  description: string;
  onClose: () => void;
}

/**
 * Blocking modal for surfacing one-time secrets (API keys, registration
 * tokens). Deliberately NOT dismissable via backdrop or Escape — the
 * secret is unrecoverable, so we force an explicit "I've saved it"
 * acknowledgement before closing.
 */
export function OneTimeSecretDialog({
  isOpen,
  secret,
  title,
  description,
  onClose,
}: OneTimeSecretDialogProps) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset local state whenever a fresh secret lands — otherwise a second
  // key creation would pre-check the "I've saved it" box. Using the
  // "reset state on prop change" pattern (React docs) rather than a
  // useEffect: tracking the prior secret in state and comparing during
  // render avoids a double render and the set-state-in-effect lint.
  const [lastSecret, setLastSecret] = useState(secret);
  if (secret !== lastSecret) {
    setLastSecret(secret);
    setCopied(false);
    setAcknowledged(false);
  }

  async function handleCopy(): Promise<void> {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      // Clipboard blocked (e.g. no HTTPS in local dev) — the value is
      // still visible in the DOM for the user to select manually.
    }
  }

  return (
    <Dialog.Root
      open={isOpen}
      // Ignore all open-change events except our explicit close — this is
      // what makes the dialog truly blocking.
      onOpenChange={() => {}}
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="one-time-secret-dialog">
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap="3">
                <HStack
                  gap="2"
                  padding="3"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  borderRadius="md"
                  background="bg.muted"
                >
                  <Box
                    flex="1"
                    fontFamily="mono"
                    fontSize="sm"
                    wordBreak="break-all"
                    data-testid="one-time-secret-value"
                  >
                    {secret ?? ''}
                  </Box>
                  <IconButton
                    aria-label={copied ? 'Copied' : 'Copy to clipboard'}
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    data-testid="one-time-secret-copy"
                    disabled={!secret}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </IconButton>
                </HStack>
                <HStack as="label" gap="2" cursor="pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    data-testid="one-time-secret-ack"
                  />
                  <Text textStyle="body.sm">
                    I&apos;ve saved this somewhere safe.
                  </Text>
                </HStack>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                colorPalette="accent"
                onClick={onClose}
                disabled={!acknowledged}
                data-testid="one-time-secret-done"
              >
                Done
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
