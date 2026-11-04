"use client";

import * as React from "react";
import { Code2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_VERSION, CONTACT_EMAIL, REPOSITORY_URL } from "@/lib/config";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AppInfoDialog({ open, onOpenChange }: Props) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <div className="relative overflow-hidden border-b px-6 pb-5 pt-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex items-start gap-4 pr-6">
            <div aria-hidden className="relative h-14 w-14 shrink-0">
              <div className="absolute left-0 top-3 h-10 w-7 -rotate-6 rounded-md border border-white/20 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-md" />
              <div className="absolute left-3 top-1.5 h-10 w-7 rotate-3 rounded-md border border-white/20 bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-md" />
              <div className="absolute left-6 top-0 h-11 w-8 rotate-6 rounded-md border border-white/30 bg-gradient-to-br from-blue-400 to-indigo-600 shadow-lg" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">
                Simply a screenshot app
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("Un pequeño editor para preparar capturas de App Store y Google Play.")}
              </DialogDescription>
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Versión {version}", { version: APP_VERSION })}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 p-5">
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-3 rounded-lg border bg-card/50 p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Code2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t("Repositorio")}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {t("Código fuente, versiones y notas de cada release.")}
              </span>
              <span className="mt-1 block truncate text-[11px] text-primary/80">
                github.com/paoloacx/simply-a-screenshot-app
              </span>
            </span>
          </a>

          <a
            href={`mailto:${CONTACT_EMAIL}`}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-3 rounded-lg border bg-card/50 p-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t("Sugerencias")}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {t("Escríbeme y cuéntame qué mejorarías.")}
              </span>
              <span className="mt-1 block truncate text-[11px] text-primary/80">
                {CONTACT_EMAIL}
              </span>
            </span>
          </a>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3">
          <span className="text-[11px] text-muted-foreground">{t("Hecho por Mirlo Apps.")}</span>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("Cerrar")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
