"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  Check,
  CircleDot,
  Palette as PaletteIcon,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cleanHexColor } from "@/lib/clean-hex-color";
import { relativeLuminance } from "@/lib/contrast";
import { t as tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  BackgroundStyle,
  GradientIntensity,
  GradientShape,
  Palette,
  Slide,
  SlidePattern,
  Theme,
} from "@/lib/types";

type Props = {
  slide: Slide;
  theme: Theme;
  onChange: (patch: Partial<Slide>) => void;
  palette?: Palette;
  onUpdatePalette?: (patch: Partial<Palette>) => void;
};

const PATTERN_OPTIONS: { id: SlidePattern; label: string; hint: string }[] = [
  { id: "none", label: "Sin textura (Liso)", hint: "Color plano y uniforme" },
  { id: "dots", label: "Patrón de Puntos", hint: "Matriz de puntos redondos y limpios" },
  { id: "linen", label: "Lino Textil", hint: "Trama de tela tejida continua" },
  { id: "lines", label: "Líneas Suaves", hint: "Líneas horizontales finas y tupidas" },
  { id: "crosses", label: "Patrón de Cruces (+)", hint: "Crucecitas modernas en cuadrícula" },
  { id: "grid", label: "Cuadrícula Completa", hint: "Retícula uniforme en toda la pantalla" },
];

export function BackgroundControls({ slide, theme, onChange, onUpdatePalette }: Props) {
  const isCustom = Boolean(slide.backgroundColor);
  const activeColor = cleanHexColor(slide.backgroundColor) || (slide.inverted ? theme.bgAlt : theme.bg) || "#FFFFFF";
  const [customDraft, setCustomDraft] = React.useState(activeColor);

  React.useEffect(() => {
    setCustomDraft(activeColor);
  }, [activeColor]);

  const currentBgStyle: BackgroundStyle = slide.backgroundStyle || (slide.backgroundColor ? "solid" : "solid");
  const currentPattern: SlidePattern = slide.backgroundPattern || "none";
  const currentOpacity = typeof slide.patternOpacity === "number" ? slide.patternOpacity : 100;

  // Determinar qué color de la paleta está activo en esta diapositiva
  const isBaseActive = !isCustom && !slide.inverted;
  const isSecondaryActive = !isCustom && Boolean(slide.inverted);
  const isExtraActive = isCustom && slide.backgroundColor?.toUpperCase() === theme.accent.toUpperCase();

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      {/* 1. Paleta armónica de 3 colores del proyecto */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <PaletteIcon className="h-3.5 w-3.5 text-primary" />
            {tr("Paleta de 3 Colores")}
          </Label>
          <span className="text-[10px] text-muted-foreground">{tr("Base · Secundario · Extra")}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-md border bg-background/60 p-1.5">
          {/* Color Base */}
          <div className="flex flex-col gap-1 items-center text-center">
            <label
              className="group relative flex h-7 w-full cursor-pointer items-center justify-center rounded border border-black/15 shadow-2xs transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: theme.bg }}
              title={`Color Base (fondo principal): ${theme.bg}. Clic para editar.`}
            >
              <input
                type="color"
                value={theme.bg}
                onChange={(e) => onUpdatePalette?.({ base: e.target.value.toUpperCase() })}
                className="sr-only"
                aria-label="Color Base del proyecto"
              />
              <span
                className={cn(
                  "text-[9px] font-bold select-none",
                  (relativeLuminance(theme.bg) ?? 1) < 0.18 ? "text-white" : "text-black"
                )}
              >
                Base
              </span>
            </label>
            <span className="font-mono text-[9px] text-muted-foreground uppercase">{theme.bg}</span>
          </div>

          {/* Color Secundario */}
          <div className="flex flex-col gap-1 items-center text-center">
            <label
              className="group relative flex h-7 w-full cursor-pointer items-center justify-center rounded border border-black/15 shadow-2xs transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: theme.bgAlt }}
              title={`Color Secundario (degradado / invertido): ${theme.bgAlt}. Clic para editar.`}
            >
              <input
                type="color"
                value={theme.bgAlt}
                onChange={(e) => onUpdatePalette?.({ secondary: e.target.value.toUpperCase() })}
                className="sr-only"
                aria-label="Color Secundario del proyecto"
              />
              <span
                className={cn(
                  "text-[9px] font-bold select-none",
                  (relativeLuminance(theme.bgAlt) ?? 1) < 0.18 ? "text-white" : "text-black"
                )}
              >
                {tr("Secundario")}
              </span>
            </label>
            <span className="font-mono text-[9px] text-muted-foreground uppercase">{theme.bgAlt}</span>
          </div>

          {/* Color Extra (Acento) */}
          <div className="flex flex-col gap-1 items-center text-center">
            <label
              className="group relative flex h-7 w-full cursor-pointer items-center justify-center rounded border border-black/15 shadow-2xs transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: theme.accent }}
              title={`Color Extra (acento, etiqueta, destellos): ${theme.accent}. Clic para editar.`}
            >
              <input
                type="color"
                value={theme.accent}
                onChange={(e) => onUpdatePalette?.({ extra: e.target.value.toUpperCase() })}
                className="sr-only"
                aria-label="Color Extra del proyecto"
              />
              <span
                className={cn(
                  "text-[9px] font-bold select-none",
                  (relativeLuminance(theme.accent) ?? 1) < 0.18 ? "text-white" : "text-black"
                )}
              >
                Extra
              </span>
            </label>
            <span className="font-mono text-[9px] text-muted-foreground uppercase">{theme.accent}</span>
          </div>
        </div>
      </div>

      {/* 2. Color para ESTA pantalla */}
      <div className="space-y-1.5 pt-1 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground font-medium">{tr("Color de esta captura")}</Label>
          <span className="font-mono text-[10px] text-muted-foreground uppercase">{activeColor}</span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <Button
            type="button"
            variant={isBaseActive ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px] px-1 font-medium gap-1"
            onClick={() => onChange({ inverted: false, backgroundColor: undefined })}
            title="Usar Color Base como fondo principal"
          >
            <span className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: theme.bg }} />
            {tr("Color Base")}
          </Button>

          <Button
            type="button"
            variant={isSecondaryActive ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px] px-1 font-medium gap-1"
            onClick={() => onChange({ inverted: true, backgroundColor: undefined })}
            title="Usar Color Secundario (modo invertido)"
          >
            <span className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: theme.bgAlt }} />
            {tr("Secundario")}
          </Button>

          <Button
            type="button"
            variant={isExtraActive ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px] px-1 font-medium gap-1"
            onClick={() => onChange({ inverted: false, backgroundColor: theme.accent })}
            title="Usar Color Extra / Acento como fondo"
          >
            <span className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: theme.accent }} />
            {tr("Color Extra")}
          </Button>
        </div>

        {/* Color personalizado opcional */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <input
            type="color"
            value={activeColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value.toUpperCase(), inverted: false })}
            className="h-6 w-7 cursor-pointer rounded border bg-transparent p-0.5 shrink-0"
            aria-label="Color personalizado para esta pantalla"
            title="Elegir otro color personalizado para esta captura"
          />
          <Input
            value={isCustom ? slide.backgroundColor || "" : ""}
            placeholder="Color libre (#HEX)"
            onChange={(e) => {
              const hex = cleanHexColor(e.target.value.toUpperCase());
              if (hex) onChange({ backgroundColor: hex, inverted: false });
              else if (!e.target.value.trim()) onChange({ backgroundColor: undefined });
            }}
            className="h-6 font-mono text-[11px] uppercase flex-1"
          />
          {isCustom && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
              onClick={() => onChange({ backgroundColor: undefined })}
              title="Quitar color personalizado y volver al tema"
            >
              {tr("Restablecer")}
            </Button>
          )}
        </div>
      </div>

      {/* 3. Modo de Fondo: Liso vs Degradado vs Destellos */}
      <div className="space-y-1.5 pt-1 border-t">
        <Label className="text-[11px] text-muted-foreground font-medium">{tr("Estilo de fondo")}</Label>
        <div className="grid grid-cols-3 gap-1">
          <Button
            type="button"
            variant={currentBgStyle === "solid" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px] px-1.5 font-medium"
            onClick={() => onChange({ backgroundStyle: "solid" })}
            title="Color plano sin degradados ni luces"
          >
            {tr("Liso (Sólido)")}
          </Button>
          <Button
            type="button"
            variant={currentBgStyle === "gradient" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px] px-1.5 font-medium"
            onClick={() => onChange({ backgroundStyle: "gradient" })}
            title="Degradado suave entre Base y Secundario"
          >
            {tr("Degradado")}
          </Button>
          <Button
            type="button"
            variant={currentBgStyle === "blobs" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px] px-1.5 font-medium"
            onClick={() => onChange({ backgroundStyle: "blobs" })}
            title="Fondo con esferas de luz en Color Extra"
          >
            {tr("Con destellos")}
          </Button>
        </div>
      </div>

      {/* Ajustes avanzados de forma e intensidad de degradado */}
      {currentBgStyle === "gradient" && (
        <div className="space-y-2 rounded-md bg-muted/40 p-2.5 border">
          {/* Forma / Dirección */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground font-medium">
              {tr("Forma / Dirección del degradado")}
            </Label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: "diagonal", label: "Diagonal", icon: ArrowDownRight },
                { id: "vertical", label: "Vertical", icon: ArrowDown },
                { id: "horizontal", label: "Horizontal", icon: ArrowRight },
                { id: "radial", label: "Radial", icon: CircleDot },
              ].map((item) => {
                const isSelected = (slide.gradientShape || "diagonal") === item.id;
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[10px] px-1 font-normal flex flex-col gap-0.5 items-center justify-center py-0"
                    onClick={() => onChange({ gradientShape: item.id as GradientShape })}
                    title={`Degradado ${item.label}`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{tr(item.label)}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Intensidad */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground font-medium">
              {tr("Intensidad del contraste")}
            </Label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "subtle", label: "Suave" },
                { id: "medium", label: "Medio" },
                { id: "intense", label: "Intenso" },
              ].map((item) => {
                const isSelected = (slide.gradientIntensity || "medium") === item.id;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-[10px] px-1 font-medium"
                    onClick={() => onChange({ gradientIntensity: item.id as GradientIntensity })}
                  >
                    {tr(item.label)}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Segundo color del degradado */}
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground font-medium">
                {tr("Segundo color (por defecto: Secundario)")}
              </Label>
              {slide.gradientColor2 && (
                <button
                  type="button"
                  onClick={() => onChange({ gradientColor2: undefined })}
                  className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                  title="Quitar color personalizado y usar Color Secundario de la paleta"
                >
                  <X className="h-2.5 w-2.5" />
                  Restablecer
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={slide.gradientColor2 || theme.bgAlt}
                onChange={(e) => onChange({ gradientColor2: e.target.value.toUpperCase() })}
                className="h-6 w-7 cursor-pointer rounded border bg-transparent p-0.5 shrink-0"
                aria-label="Segundo color del degradado"
              />
              <Input
                value={slide.gradientColor2 || ""}
                onChange={(e) => {
                  const hex = cleanHexColor(e.target.value.toUpperCase());
                  if (hex) onChange({ gradientColor2: hex });
                  else if (!e.target.value.trim()) onChange({ gradientColor2: undefined });
                }}
                placeholder={`Color Secundario (${theme.bgAlt})`}
                className="h-6 font-mono text-xs uppercase"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Textura / Patrón de Fondo */}
      <div className="space-y-1.5 pt-1 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground font-medium">
            {tr("Textura de fondo")}
          </Label>
          {currentPattern !== "none" && (
            <button
              type="button"
              onClick={() => onChange({ backgroundPattern: "none" })}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5"
              title="Quitar textura"
            >
              <X className="h-2.5 w-2.5" /> {tr("Quitar")}
            </button>
          )}
        </div>

        <Select
          value={currentPattern}
          onValueChange={(val) => onChange({ backgroundPattern: val as SlidePattern })}
        >
          <SelectTrigger className="h-7 text-xs" aria-label="Textura de fondo">
            <SelectValue placeholder={tr("Sin textura (Liso)")} />
          </SelectTrigger>
          <SelectContent>
            {PATTERN_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                <div className="flex flex-col">
                  <span>{tr(opt.label)}</span>
                  <span className="text-[10px] text-muted-foreground">{tr(opt.hint)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentPattern !== "none" && (
          <div className="space-y-1 rounded bg-muted/40 p-2 border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium">{tr("Opacidad de la textura")}</span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {currentOpacity}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={currentOpacity}
              onChange={(e) => onChange({ patternOpacity: Number(e.target.value) })}
              className="h-1.5 w-full cursor-pointer accent-primary"
              aria-label="Opacidad de la textura"
            />
          </div>
        )}
      </div>
    </div>
  );
}
