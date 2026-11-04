"use client";

import * as React from "react";
import { Coffee, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { KOFI_PANEL_URL } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Ko-fi's official tip panel, embedded in an app dialog with our own close
 * button. The panel is third-party content; no API key is involved.
 */
export function KofiDialog({ open, onOpenChange }: Props) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(88vh,820px)] max-w-[560px] flex-col gap-0 overflow-hidden p-0 [&>button]:hidden">
        <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Coffee className="h-4 w-4 text-primary" />
            {t("Support on Ko-fi")}
          </DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={t("Close")}
              title={t("Close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          {t("Support the app through Ko-fi.")}
        </DialogDescription>
        <iframe
          src={KOFI_PANEL_URL}
          title="Ko-fi"
          className="min-h-0 w-full flex-1 border-0 bg-[#f9f9f9]"
        />
      </DialogContent>
    </Dialog>
  );
}
