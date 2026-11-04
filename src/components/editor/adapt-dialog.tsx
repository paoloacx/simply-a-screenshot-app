"use client";

import * as React from "react";
import { ArrowRight, Check, Layers, Sparkles, Smartphone, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEVICE_LABEL } from "@/lib/constants";
import { t as tr } from "@/lib/i18n";
import { adaptSlidesForDevice, findPrimaryCustomizedDevice, getCustomizedDevices, isStarterDeck, type AdaptOptions } from "@/lib/adapt-slides";
import type { Device, Orientation, Slide } from "@/lib/types";

type AdaptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDevice: Device;
  currentOrientation: Orientation;
  slidesByDevice: Record<Device, Slide[]>;
  onApplyAdaptation: (sourceDevice: Device, targetDevice: Device, options: AdaptOptions) => void;
  initialSourceDevice?: Device;
  initialTargetDevice?: Device;
};

export function AdaptDialog({
  open,
  onOpenChange,
  currentDevice,
  currentOrientation,
  slidesByDevice,
  onApplyAdaptation,
  initialSourceDevice,
  initialTargetDevice,
}: AdaptDialogProps) {
  const primaryCustom = React.useMemo(() => {
    return findPrimaryCustomizedDevice(slidesByDevice, currentDevice);
  }, [slidesByDevice, currentDevice]);

  const availableSources = React.useMemo(() => {
    return getCustomizedDevices(slidesByDevice, currentDevice);
  }, [slidesByDevice, currentDevice]);

  // Dispositivo origen por defecto: el dispositivo con diseño personalizado o el indicado
  const defaultSource = initialSourceDevice || primaryCustom || availableSources[0]?.device || currentDevice;
  const [sourceDevice, setSourceDevice] = React.useState<Device>(defaultSource);
  const [targetDevice, setTargetDevice] = React.useState<Device>(initialTargetDevice || currentDevice);

  // Opciones de preservación
  const [preserveCopy, setPreserveCopy] = React.useState(true);
  const [preserveColors, setPreserveColors] = React.useState(true);
  const [preserveScreenshots, setPreserveScreenshots] = React.useState(true);
  const [preserveFloatingElements, setPreserveFloatingElements] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      if (initialSourceDevice) {
        setSourceDevice(initialSourceDevice);
      } else if (primaryCustom) {
        setSourceDevice(primaryCustom);
      } else if (availableSources.length > 0 && (!sourceDevice || sourceDevice === currentDevice)) {
        setSourceDevice(availableSources[0].device);
      }
      setTargetDevice(initialTargetDevice || currentDevice);
    }
  }, [open, initialSourceDevice, initialTargetDevice, currentDevice, primaryCustom, availableSources]);

  const sourceSlides = slidesByDevice[sourceDevice] || [];
  const targetSlides = slidesByDevice[targetDevice] || [];
  const targetHasEdits = !isStarterDeck(targetSlides);

  const handleConfirm = () => {
    onApplyAdaptation(sourceDevice, targetDevice, {
      preserveCopy,
      preserveColors,
      preserveScreenshots,
      preserveFloatingElements,
    });
    onOpenChange(false);
  };

  const allDevices = Object.keys(slidesByDevice) as Device[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {tr("Adaptar diseño entre dispositivos")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {tr("Reutiliza tus textos, traducciones, colores y capturas ajustándolos a las medidas de otro terminal.")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Selector de origen y destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {tr("Copiar diseño desde")}
              </label>
              <Select value={sourceDevice} onValueChange={(v) => setSourceDevice(v as Device)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={tr("Dispositivo origen")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {allDevices
                    .filter((d) => (slidesByDevice[d] || []).length > 0)
                    .map((d) => {
                      const slides = slidesByDevice[d] || [];
                      const isCustom = !isStarterDeck(slides);
                      return (
                        <SelectItem key={d} value={d} className="text-xs">
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span>{tr(DEVICE_LABEL[d] || d)}</span>
                            {isCustom && (
                              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                {tr("Personalizado ({count})", { count: slides.length })}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {tr("{count} pantallas disponibles", { count: sourceSlides.length })}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {tr("Adaptar y aplicar a")}
              </label>
              <Select value={targetDevice} onValueChange={(v) => setTargetDevice(v as Device)}>
                <SelectTrigger className="h-9 text-xs font-medium">
                  <SelectValue placeholder={tr("Dispositivo destino")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {allDevices.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">
                      {tr(DEVICE_LABEL[d] || d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {tr("Se ajustará al marco nativo y resolución de App Store Connect")}
              </p>
            </div>
          </div>

          {/* Opciones de preservación */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tr("Elementos que se transferirán")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveCopy}
                  onChange={(e) => setPreserveCopy(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary accent-primary cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{tr("Textos y traducciones")}</span>
                  <span className="text-[11px] text-muted-foreground">{tr("Titulares, etiquetas y los 5 idiomas")}</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveColors}
                  onChange={(e) => setPreserveColors(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary accent-primary cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{tr("Colores y fondos")}</span>
                  <span className="text-[11px] text-muted-foreground">{tr("Degradados, texturas y contrastes")}</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveScreenshots}
                  onChange={(e) => setPreserveScreenshots(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary accent-primary cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{tr("Capturas de pantalla")}</span>
                  <span className="text-[11px] text-muted-foreground">{tr("Mantiene las imágenes en cada pantalla")}</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveFloatingElements}
                  onChange={(e) => setPreserveFloatingElements(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary accent-primary cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{tr("Elementos flotantes")}</span>
                  <span className="text-[11px] text-muted-foreground">{tr("Reescala stickers y textos extra")}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Información técnica resumida */}
          <div className="rounded-md bg-primary/5 border border-primary/15 p-2.5 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <Wand2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                {tr("Adaptación automática: el marco del terminal se cambiará por el modelo oficial de {device}, conservando tus proporciones, modo sin marco (frameless) y rediseñando la composición sin deformar.", { device: tr(DEVICE_LABEL[targetDevice] || targetDevice) })}
              </span>
            </p>
          </div>

          {targetHasEdits && sourceDevice !== targetDevice && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-700 dark:text-amber-400">
              {tr("Aviso: el dispositivo destino tiene pantallas con modificaciones. Al continuar, serán sustituidas por el diseño adaptado.")}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {tr("Cancelar")}
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={sourceSlides.length === 0}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Adaptar {sourceSlides.length} pantalla{sourceSlides.length !== 1 ? "s" : ""} a {DEVICE_LABEL[targetDevice] || targetDevice}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AdaptPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceDevice: Device;
  targetDevice: Device;
  onConfirmAdapt: () => void;
  onSkipAdapt: () => void;
};

/**
 * Diálogo de confirmación rápida que aparece al cambiar de dispositivo en la barra superior.
 */
export function AdaptPromptDialog({
  open,
  onOpenChange,
  sourceDevice,
  targetDevice,
  onConfirmAdapt,
  onSkipAdapt,
}: AdaptPromptDialogProps) {
  const sourceName = DEVICE_LABEL[sourceDevice] || sourceDevice;
  const targetName = DEVICE_LABEL[targetDevice] || targetDevice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {tr("¿Adaptar diseño a {device}?", { device: tr(targetName) })}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {tr("Hemos detectado tu diseño personalizado en {device}.", { device: tr(sourceName) })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 text-xs text-muted-foreground space-y-2">
          <p>
            {tr("¿Quieres transferir automáticamente todos tus titulares, etiquetas, traducciones, colores de fondo y capturas al nuevo formato de {device}?", { device: tr(targetName) })}
          </p>
          <div className="rounded-md bg-muted/60 p-2.5 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>{tr("Conserva tus 5 idiomas de traducción")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>{tr("Ajusta el marco nativo al nuevo tamaño de pantalla")}</span>
            </div>
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>{tr("Conserva tus colores, degradados y texturas")}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSkipAdapt();
              onOpenChange(false);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {tr("Ver pantallas en blanco")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onConfirmAdapt();
              onOpenChange(false);
            }}
            className="gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {tr("Adaptar diseño (Recomendado)")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
