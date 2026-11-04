"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronUp, Globe, Info, Languages, Loader2, Sparkles } from "lucide-react";
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
  ALL_SUPPORTED_LANGUAGES,
  BASE_LANGUAGE,
  DEFAULT_TRANSLATION_PACK,
  getLanguageInfo,
  type TranslationLanguage,
} from "@/lib/translation-languages";
import { extractTranslatableTexts, executeAutoTranslation } from "@/lib/auto-translate";
import type { Device, ProjectState, Slide } from "@/lib/types";
import { DEVICE_LABEL } from "@/lib/constants";
import { t as tr } from "@/lib/i18n";
import { toast } from "sonner";

interface TranslateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectState;
  onProjectUpdate: (nextProject: ProjectState) => void;
}

export function TranslateDialog({
  open,
  onOpenChange,
  project,
  onProjectUpdate,
}: TranslateDialogProps) {
  // Idiomas seleccionados para traducir (por defecto los 5 solicitados)
  const [selectedLangCodes, setSelectedLangCodes] = React.useState<string[]>(
    DEFAULT_TRANSLATION_PACK.map((l) => l.code),
  );
  // Mostrar idiomas adicionales (italiano, portugués, japonés, etc.)
  const [showMoreLangs, setShowMoreLangs] = React.useState(false);
  // Ámbito: todo el proyecto o solo el dispositivo actual
  const [deviceOnly, setDeviceOnly] = React.useState(false);
  // Estado de carga y progreso
  const [loading, setLoading] = React.useState(false);
  const [progressStatus, setProgressStatus] = React.useState("");
  // Ver detalles de textos a traducir
  const [showDetails, setShowDetails] = React.useState(false);

  // Recolectar pantallas a traducir según el ámbito seleccionado
  const targetDevices = React.useMemo(() => {
    return deviceOnly
      ? [project.device]
      : (Object.keys(project.slidesByDevice) as Device[]);
  }, [deviceOnly, project.device, project.slidesByDevice]);

  const targetSlides = React.useMemo(() => {
    const slides: Slide[] = [];
    for (const d of targetDevices) {
      slides.push(...(project.slidesByDevice[d] || []));
    }
    return slides;
  }, [targetDevices, project.slidesByDevice]);

  // Textos detectados
  const { uniqueTexts, totalOccurrences } = React.useMemo(() => {
    return extractTranslatableTexts(targetSlides, project.locale);
  }, [targetSlides, project.locale]);

  const otherLanguages = React.useMemo(() => {
    const defaultCodes = new Set([BASE_LANGUAGE.code, ...DEFAULT_TRANSLATION_PACK.map((l) => l.code)]);
    return ALL_SUPPORTED_LANGUAGES.filter((l) => !defaultCodes.has(l.code));
  }, []);

  const toggleLanguage = (code: string) => {
    if (code === BASE_LANGUAGE.code) return; // Español es siempre base
    setSelectedLangCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleSelectDefaultPack = () => {
    setSelectedLangCodes(DEFAULT_TRANSLATION_PACK.map((l) => l.code));
  };

  const handleSelectAll = () => {
    setSelectedLangCodes(
      ALL_SUPPORTED_LANGUAGES.filter((l) => l.code !== BASE_LANGUAGE.code).map((l) => l.code),
    );
  };

  const handleDeselectAll = () => {
    setSelectedLangCodes([]);
  };

  const handleTranslate = async () => {
    if (selectedLangCodes.length === 0) {
      toast.error(tr("Selecciona al menos un idioma de destino"));
      return;
    }
    if (uniqueTexts.length === 0) {
      toast.error(tr("No se encontraron textos para traducir"));
      return;
    }

    setLoading(true);
    setProgressStatus(tr("Iniciando traducción..."));

    try {
      const { nextState, result } = await executeAutoTranslation(project, {
        targetLangs: selectedLangCodes,
        deviceOnly,
        onProgress: (status) => setProgressStatus(status),
      });

      onProjectUpdate(nextState);
      toast.success(
        tr("Traducción completada: {phrases} frases traducidas a {languages} idiomas.", { phrases: uniqueTexts.length, languages: selectedLangCodes.length }),
      );
      onOpenChange(false);
    } catch (err) {
      console.error("Error al traducir:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : tr("Ocurrió un error al realizar las traducciones"),
      );
    } finally {
      setLoading(false);
      setProgressStatus("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Languages className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">{tr("Traducción automática")}</DialogTitle>
              <DialogDescription className="text-xs">
                {tr("Traduce automáticamente los textos de tus capturas al paquete de 5 idiomas de la App Store.")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Idioma base de referencia */}
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{BASE_LANGUAGE.flag}</span>
                <div>
                  <p className="text-xs font-semibold">{tr("Idioma base: {language}", { language: BASE_LANGUAGE.name })}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {tr("Los textos en español se usarán como fuente para todas las traducciones.")}
                  </p>
                </div>
              </div>
              <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                Base
              </span>
            </div>
          </div>

          {/* Paquete de 5 idiomas solicitados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold">
                  {tr("Paquete estándar App Store (5 idiomas)")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectDefaultPack}
                  className="text-primary hover:underline"
                >
                  {tr("Paquete 5")}
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {tr("Desmarcar")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_TRANSLATION_PACK.map((lang) => {
                const isSelected = selectedLangCodes.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    disabled={loading}
                    className={`flex items-center justify-between rounded-md border p-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 font-medium text-foreground"
                        : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{lang.flag}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{lang.name}</span>
                          <span className="text-[10px] uppercase font-mono opacity-60">
                            ({lang.code})
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {lang.nativeName}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Otros idiomas opcionales */}
          <div className="space-y-2 border-t pt-2">
            <button
              type="button"
              onClick={() => setShowMoreLangs((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                {tr("Más idiomas de App Store (opcional)")}
              </span>
              {showMoreLangs ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {showMoreLangs && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {otherLanguages.map((lang) => {
                  const isSelected = selectedLangCodes.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleLanguage(lang.code)}
                      disabled={loading}
                      className={`flex items-center justify-between rounded-md border p-2 text-left text-xs transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5 font-medium text-foreground"
                          : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{lang.flag}</span>
                        <div>
                          <span>{lang.name}</span>
                          <span className="ml-1 text-[10px] uppercase opacity-60">
                            ({lang.code})
                          </span>
                        </div>
                      </div>
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ámbito de aplicación */}
          <div className="space-y-1.5 border-t pt-2">
            <span className="text-xs font-semibold">{tr("Ámbito")}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeviceOnly(false)}
                disabled={loading}
                className={`flex-1 rounded-md border p-2 text-left text-xs transition-colors ${
                  !deviceOnly
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="font-medium">{tr("Todo el proyecto")}</div>
                <div className="text-[10px] text-muted-foreground">
                  {tr("Traduce todos los dispositivos ({count} formatos)", { count: Object.keys(project.slidesByDevice).length })}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeviceOnly(true)}
                disabled={loading}
                className={`flex-1 rounded-md border p-2 text-left text-xs transition-colors ${
                  deviceOnly
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="font-medium">{tr("Solo dispositivo actual")}</div>
                <div className="text-[10px] text-muted-foreground">
                  {DEVICE_LABEL[project.device] || project.device}
                </div>
              </button>
            </div>
          </div>

          {/* Resumen de textos a traducir */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  {tr("{texts} textos únicos detectados en {screens} capturas.", { texts: uniqueTexts.length, screens: targetSlides.length })}
                </span>
              </div>
              {uniqueTexts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="text-[11px] text-primary hover:underline"
                >
                  {showDetails ? tr("Ocultar lista") : tr("Ver frases")}
                </button>
              )}
            </div>

            {showDetails && uniqueTexts.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-1 rounded border bg-background p-2 text-[11px] font-mono">
                {uniqueTexts.map((txt, i) => (
                  <div key={i} className="truncate text-muted-foreground">
                    • {txt.replace(/\n/g, " ↵ ")}
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              {tr("Se generarán un total de {count} textos traducidos. Al descargar el ZIP, cada idioma tendrá su propia carpeta organizada.", { count: uniqueTexts.length * selectedLangCodes.length })}
            </p>
          </div>

          {/* Estado de carga */}
          {loading && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="text-xs">
                <p className="font-medium text-foreground">{progressStatus}</p>
                <p className="text-[11px] text-muted-foreground">
                  {tr("Por favor espera un momento, esto tomará unos segundos...")}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tr("Cancelar")}
          </Button>
          <Button
            type="button"
            onClick={handleTranslate}
            disabled={loading || selectedLangCodes.length === 0 || uniqueTexts.length === 0}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tr("Traduciendo...")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {selectedLangCodes.length === 1
                  ? tr("Traducir a 1 idioma")
                  : tr("Traducir a {count} idiomas", { count: selectedLangCodes.length })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
