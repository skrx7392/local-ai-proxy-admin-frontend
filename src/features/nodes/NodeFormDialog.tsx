'use client';

import { Button, Dialog, Field, HStack, Portal, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormField, FormSelect } from '@/components/forms';
import { useHeldValue } from '@/lib/hooks/useHeldValue';

import {
  NodeFormSchema,
  nodeToFormValues,
  type AuthMode,
  type Node,
  type NodeFormInput,
  type NodeFormValues,
} from './schemas';

export interface NodeFormDialogProps {
  isOpen: boolean;
  /** null = create; a node = edit (config-sourced nodes never get here —
   *  the row's Edit action is disabled). */
  editing: Node | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NodeFormValues) => void;
  isSubmitting?: boolean;
  submissionError?: string | undefined;
}

const EMPTY: NodeFormInput = {
  name: '',
  base_url: '',
  backend_type: 'ollama',
  auth_mode: 'keep',
  auth_header: '',
  static_models: '',
  health_path: '',
  timeout_seconds: '',
  enabled: true,
};

const BACKEND_OPTIONS = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'openai_compat', label: 'OpenAI-compatible' },
] as const;

const AUTH_MODE_LABEL: Record<AuthMode, string> = {
  keep: 'Keep current',
  replace: 'Replace',
  clear: 'Clear',
};

/**
 * Create + edit dialog. Edit implements the PUT tri-state for the masked
 * auth secret: the current value is shown masked (display-only) and the
 * Keep / Replace / Clear segmented control decides what goes on the wire —
 * the mask itself is never sent back.
 */
export function NodeFormDialog({
  isOpen,
  editing,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  submissionError,
}: NodeFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<NodeFormInput, unknown, NodeFormValues>({
    resolver: zodResolver(NodeFormSchema),
    mode: 'onTouched',
    defaultValues: EMPTY,
  });

  // Reset / prefill on closed→open transition (same pattern as pricing).
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      reset(editing ? nodeToFormValues(editing) : EMPTY);
    }
  }

  // useWatch (not `watch`) — subscription-based, safe under React Compiler.
  const authMode = (useWatch({ control, name: 'auth_mode' }) ?? 'keep') as AuthMode;
  const enabled = useWatch({ control, name: 'enabled' }) ?? true;

  const submit = handleSubmit((values) => onSubmit(values));

  // The page nulls `editing` in the same update that closes the dialog. Hold
  // it so the entire create/edit form structure (title, auth-mode control,
  // status toggle, submit label) doesn't swap mid-exit-animation. See
  // useHeldValue. The closed→open reset above intentionally keeps reading the
  // raw `editing` prop — at that transition the held value equals it.
  const editingShown = useHeldValue(isOpen, editing);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details: { open: boolean }) => onOpenChange(details.open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="node-form-dialog">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>{editingShown ? 'Edit node' : 'Register node'}</Dialog.Title>
                <Dialog.Description>
                  The gateway probes the node as soon as you save, so health and discovered models
                  are live in the response.
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <FormField
                    name="name"
                    label="Name"
                    register={register}
                    placeholder="e.g. workstation"
                    errorMessage={errors.name?.message}
                    required
                    autoFocus={!editingShown}
                    data-testid="node-name"
                  />
                  <FormField
                    name="base_url"
                    label="Base URL"
                    register={register}
                    placeholder="http://192.0.2.10:11434"
                    helperText="API root without the /v1 segment — the gateway appends it."
                    errorMessage={errors.base_url?.message}
                    required
                    data-testid="node-base-url"
                  />
                  <FormSelect
                    name="backend_type"
                    label="Backend type"
                    control={control}
                    options={BACKEND_OPTIONS}
                    errorMessage={errors.backend_type?.message}
                    data-testid="node-backend-type"
                  />

                  {editingShown ? (
                    <Field.Root invalid={Boolean(errors.auth_header)}>
                      <Field.Label>Authorization header</Field.Label>
                      <Text textStyle="body.sm" color="fg.muted">
                        {editingShown.auth_header
                          ? `Current: ${editingShown.auth_header}`
                          : 'No auth header configured.'}
                      </Text>
                      <HStack gap="1" data-testid="node-auth-mode">
                        {(Object.keys(AUTH_MODE_LABEL) as AuthMode[]).map((mode) => (
                          <Button
                            key={mode}
                            type="button"
                            size="xs"
                            variant={authMode === mode ? 'solid' : 'outline'}
                            onClick={() =>
                              setValue('auth_mode', mode, {
                                shouldValidate: true,
                              })
                            }
                            data-testid={`node-auth-mode-${mode}`}
                          >
                            {AUTH_MODE_LABEL[mode]}
                          </Button>
                        ))}
                      </HStack>
                      {Boolean(errors.auth_header) && (
                        <Field.ErrorText>{errors.auth_header?.message}</Field.ErrorText>
                      )}
                    </Field.Root>
                  ) : null}

                  {(!editingShown || authMode === 'replace') && (
                    <FormField
                      name="auth_header"
                      label={
                        editingShown
                          ? 'New authorization header'
                          : 'Authorization header (optional)'
                      }
                      register={register}
                      type="password"
                      placeholder="Bearer <token>"
                      helperText="Sent verbatim on every request and probe to this node. Stored server-side; reads only return a masked value."
                      errorMessage={errors.auth_header?.message}
                      autoComplete="off"
                      data-testid="node-auth-header"
                    />
                  )}

                  <FormField
                    name="static_models"
                    label="Static models (optional)"
                    register={register}
                    placeholder="gpt-4o-mini, gpt-4o"
                    helperText={
                      editingShown
                        ? 'Comma-separated. Empty switches back to automatic discovery.'
                        : 'Comma-separated. Leave empty for automatic discovery.'
                    }
                    errorMessage={errors.static_models?.message}
                    data-testid="node-static-models"
                  />
                  <FormField
                    name="health_path"
                    label="Health path (optional)"
                    register={register}
                    placeholder="/healthz"
                    helperText="Liveness probe override for static-model nodes without a discovery endpoint."
                    errorMessage={errors.health_path?.message}
                    data-testid="node-health-path"
                  />
                  <FormField
                    name="timeout_seconds"
                    label="Timeout (seconds, optional)"
                    register={register}
                    type="number"
                    placeholder="300"
                    helperText="Per-request budget for this node. Empty = default (5 minutes)."
                    errorMessage={errors.timeout_seconds?.message}
                    data-testid="node-timeout-seconds"
                  />

                  {editingShown ? (
                    <Field.Root>
                      <Field.Label>Status</Field.Label>
                      <HStack gap="1" data-testid="node-enabled-toggle">
                        <Button
                          type="button"
                          size="xs"
                          variant={enabled ? 'solid' : 'outline'}
                          onClick={() => setValue('enabled', true)}
                          data-testid="node-enabled-on"
                        >
                          Enabled
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant={!enabled ? 'solid' : 'outline'}
                          onClick={() => setValue('enabled', false)}
                          data-testid="node-enabled-off"
                        >
                          Disabled
                        </Button>
                      </HStack>
                      <Field.HelperText>
                        Enabling a previously disabled node puts it back into routing after its next
                        successful probe.
                      </Field.HelperText>
                    </Field.Root>
                  ) : null}

                  {submissionError && (
                    <Text
                      role="alert"
                      color="red.500"
                      textStyle="body.sm"
                      data-testid="node-form-error"
                    >
                      {submissionError}
                    </Text>
                  )}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorPalette="accent"
                  loading={isSubmitting}
                  data-testid="node-submit"
                >
                  {editingShown ? 'Save' : 'Register'}
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
