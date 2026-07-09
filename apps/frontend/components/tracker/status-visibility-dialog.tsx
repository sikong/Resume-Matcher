'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { useTranslations } from '@/lib/i18n';
import { APPLICATION_STATUS_ORDER, type ApplicationStatus } from '@/lib/api/tracker';

interface StatusVisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenStatuses: Set<ApplicationStatus>;
  onStatusVisibilityChange: (status: ApplicationStatus, visible: boolean) => void;
}

export function StatusVisibilityDialog({
  open,
  onOpenChange,
  hiddenStatuses,
  onStatusVisibilityChange,
}: StatusVisibilityDialogProps) {
  const { t } = useTranslations();
  const visibleCount = APPLICATION_STATUS_ORDER.filter(
    (status) => !hiddenStatuses.has(status)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <div className="border-b border-black p-6 pr-12">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-bold uppercase tracking-tight">
              {t('tracker.manage.title')}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="grid gap-2 p-6">
          {APPLICATION_STATUS_ORDER.map((status) => {
            const checked = !hiddenStatuses.has(status);
            const isLastVisible = checked && visibleCount <= 1;

            return (
              <ToggleSwitch
                key={status}
                checked={checked}
                onCheckedChange={(nextChecked) => onStatusVisibilityChange(status, nextChecked)}
                label={t(`tracker.columns.${status}`)}
                description={
                  isLastVisible
                    ? t('tracker.manage.lastVisible')
                    : checked
                      ? t('tracker.manage.visible')
                      : t('tracker.manage.hidden')
                }
                disabled={isLastVisible}
              />
            );
          })}
        </div>

        <DialogFooter className="border-t border-black p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
