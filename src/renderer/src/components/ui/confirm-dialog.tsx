import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog'
import { buttonVariants } from './button'

/**
 * Confirmation dialog built on AlertDialog: configurable title / description / confirm label /
 * confirm variant, with fixed Cancel + Confirm buttons. Radix closes it after confirm; onConfirm
 * only performs the action. Use primary for non-destructive, danger for irreversible actions.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmVariant = 'primary',
  cancelText = 'Cancel',
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description: React.ReactNode
  confirmText: string
  confirmVariant?: 'primary' | 'brand' | 'danger'
  cancelText?: string
  onConfirm: () => void
}): React.JSX.Element {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction className={buttonVariants({ variant: confirmVariant })} onClick={onConfirm}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
