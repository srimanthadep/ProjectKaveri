import React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'destructive';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Purpose-built replacement for window.confirm(). Renders on top of the
 * existing Dialog primitive so confirmations match the rest of the product
 * instead of the browser's native, unstyled prompt.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title={title} description={description} maxWidth="sm">
      <div className="flex items-center justify-end gap-3 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'destructive' ? 'destructive' : 'primary'}
          size="sm"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
