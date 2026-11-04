"use client";

import * as React from "react";
import { ArrowRight, Images, Languages, Layers, Ruler, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OnboardingDialog({ open, onOpenChange }: Props) {
  const { t } = useI18n();

  const features = [
    {
      icon: Images,
      title: t("Arrastra tus capturas"),
      body: t("Suelta un PNG o JPG sobre cualquier pantalla y la app lo coloca en el marco oficial del dispositivo."),
    },
    {
      icon: Languages,
      title: t("Traducción automática"),
      body: t("Traduce los textos a los 5 idiomas de la App Store, revísalos uno a uno y exporta todos juntos."),
    },
    {
      icon: Ruler,
      title: t("Los tamaños de Apple"),
      body: t("iPhone 6.9″, iPad 13″, Watch, TV y Mac, más los banners de cabecera y resultados de búsqueda, con las medidas exactas."),
    },
    {
      icon: Layers,
      title: t("Un proyecto, todos los soportes"),
      body: t("Trabaja iPhone, iPad, Watch, Mac, Android y los creativos de la App Store en el mismo proyecto y exporta solo lo que elijas."),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <div className="relative overflow-hidden border-b px-7 pb-7 pt-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-6 pr-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <Layers className="h-3.5 w-3.5" />
                {t("Bienvenido")}
              </div>
              <DialogTitle className="mt-3 text-2xl font-semibold tracking-tight sm:text-[28px]">
                {t("Capturas listas para la App Store.")}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t("Diseña, traduce y exporta las capturas de tu app en un solo sitio, con los tamaños que pide Apple.")}
              </DialogDescription>
            </div>
            <div aria-hidden className="relative hidden h-20 w-24 shrink-0 sm:block">
              <div className="absolute left-0 top-4 h-14 w-9 -rotate-6 rounded-lg border border-white/20 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg" />
              <div className="absolute left-4 top-2 h-14 w-9 rotate-3 rounded-lg border border-white/20 bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg" />
              <div className="absolute left-8 top-0 h-16 w-10 rotate-6 rounded-lg border border-white/30 bg-gradient-to-br from-blue-400 to-indigo-600 shadow-xl" />
            </div>
          </div>
        </div>

        <div className="px-7 py-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-lg border bg-card/50 p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{t("Tus proyectos y capturas se quedan en tu Mac. Sin cuenta y sin nube.")}</span>
          </div>
        </div>

        <div className="flex flex-col-reverse items-start justify-between gap-3 border-t px-7 py-4 sm:flex-row sm:items-center">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("Puedes volver a abrir esta guía desde el botón de ayuda de la barra superior.")}
          </p>
          <Button size="sm" className="shrink-0 gap-1.5" onClick={() => onOpenChange(false)}>
            {t("Empezar a diseñar")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
