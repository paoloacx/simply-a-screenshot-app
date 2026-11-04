"use client";
import * as React from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Award,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Languages,
  Laptop,
  Lightbulb,
  Maximize2,
  Plus,
  RotateCcw,
  Smartphone,
  RotateCw,
  Tablet,
  Trash2,
  Tv,
  Type,
  Watch,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CANVAS, DEVICE_LABEL, LAYOUT_LABEL, MOCKUP_KINDS, isCreative, layoutHint, layoutLabel } from "@/lib/constants";
import { DUO_COMPANION, duoGeometry, isDuoDevice } from "@/lib/frame-assets";
import { COPY_IDEA_SLOTS, LABEL_CATEGORIES, LABEL_SUGGESTIONS } from "@/lib/copy-ideas";
import { nid } from "@/lib/defaults";
import { img } from "@/lib/image-cache";
import {
  isBuiltInElementId,
  imageElementKey,
  isImageElementId,
  isMockupElementId,
  mockupElementKey,
  toMockupElementId,
  isTextElementId,
  toImageElementId,
  textElementKey,
  toTextElementId,
} from "@/lib/elements";
import { pickText, resolveScreenshot, writeLocalized } from "@/lib/locale";
import { cleanHexColor } from "@/lib/clean-hex-color";
import { relativeLuminance, slideColors } from "@/lib/contrast";
import { t as tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  cleanTypography,
  defaultTextElementFontSize,
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  slideFontScales,
  textElementFontSizeRange,
} from "@/lib/typography";
import type {
  BuiltInElementId,
  Device,
  DeviceElement,
  DeviceShadowStyle,
  ElementId,
  MockupKind,
  ElementTransform,
  ImageElement,
  Orientation,
  Palette,
  Slide,
  SlideLayout,
  SlideTypography,
  TextElement,
  TextShadowStyle,
  Theme,
} from "@/lib/types";
import { BackgroundControls } from "./background-controls";
import { ScreenshotPicker } from "./screenshot-picker";
import { CalloutControls } from "./callout-controls";
import { DUO_FIT_TOLERANCE, captureFits } from "./device-frames";
import { calloutAvailable, getCanvas, getElementTransform, getMockupAspect } from "./slide-canvas";

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appIcon?: string;
  onAppIconChange: (src: string) => void;
  selectedElementId: ElementId | null;
  onChange: (patch: Partial<Slide>) => void;
  /** Patch computed from the slide's latest state (safe after async work). */
  onUpdate: (update: (slide: Slide) => Partial<Slide>) => void;
  onSelectElement: (id: ElementId | null) => void;
  palette?: Palette;
  onUpdatePalette?: (patch: Partial<Palette>) => void;
  onOpenTranslate?: () => void;
};

const ELEMENT_LABEL: Record<BuiltInElementId, string> = {
  caption: "Titular / Subtítulo",
  label: "Etiqueta superior",
  device: "Dispositivo",
  deviceSecondary: "Dispositivo posterior",
  callout: "Lupa de detalle",
};

function TextColorSelector({
  value,
  isAuto,
  autoLabel = "Auto",
  theme,
  onChange,
  onReset,
}: {
  value: string;
  isAuto: boolean;
  autoLabel?: string;
  theme: Theme;
  onChange: (hex: string) => void;
  onReset: () => void;
}) {
  const swatches = [
    { label: "B", name: "Base", color: theme.bg, tooltip: "Color Base de la paleta" },
    { label: "S", name: "Sec.", color: theme.bgAlt, tooltip: "Color Secundario de la paleta" },
    { label: "E", name: "Extra", color: theme.accent, tooltip: "Color Extra / Acento" },
    { label: "W", name: "Blanco", color: "#FFFFFF", tooltip: "Blanco puro" },
    { label: "N", name: "Negro", color: "#0A0A0C", tooltip: "Negro profundo" },
  ];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant={isAuto ? "default" : "outline"}
          className="h-6 px-1.5 text-[10px] font-medium"
          onClick={onReset}
          title={`Usar color automático (${autoLabel})`}
        >
          {autoLabel}
        </Button>
        {swatches.map((s) => {
          const isSelected = !isAuto && value.toUpperCase() === s.color.toUpperCase();
          const dark = (relativeLuminance(s.color) ?? 1) < 0.18;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => onChange(s.color)}
              title={`${s.tooltip} (${s.color})`}
              className={cn(
                "relative h-6 flex-1 rounded border transition-all flex items-center justify-center p-0",
                isSelected
                  ? "ring-2 ring-primary ring-offset-1 border-foreground"
                  : "border-border/70 hover:scale-105"
              )}
              style={{ backgroundColor: s.color }}
            >
              <span
                className={cn(
                  "text-[9px] font-bold tracking-tight select-none",
                  dark ? "text-white" : "text-black"
                )}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-6 w-7 cursor-pointer rounded border bg-transparent p-0.5 shrink-0"
          aria-label={tr("Selector de color personalizado")}
        />
        <Input
          value={isAuto ? "" : value}
          placeholder={isAuto ? `${value} (Automático)` : "#HEX"}
          onChange={(e) => {
            const hex = cleanHexColor(e.target.value.toUpperCase());
            if (hex) onChange(hex);
            else if (!e.target.value.trim()) onReset();
          }}
          className="h-6 font-mono text-[11px] uppercase flex-1"
        />
      </div>
    </div>
  );
}

export function Inspector({
  slide,
  device,
  orientation,
  theme,
  locale,
  appIcon,
  onAppIconChange,
  selectedElementId,
  onChange,
  onUpdate,
  onSelectElement,
  palette,
  onUpdatePalette,
  onOpenTranslate,
}: Props) {
  const isFeatureGraphic = device === "feature-graphic" || slide.layout === "feature-graphic";
  const colors = slideColors(theme, slide);
  const isNoDevice = slide.layout === "no-device";
  const layoutValue = device === "feature-graphic" ? "feature-graphic" : slide.layout;
  const layoutOptions = (Object.keys(LAYOUT_LABEL) as SlideLayout[])
    .filter((layout) => (device === "feature-graphic" ? layout === "feature-graphic" : layout !== "feature-graphic"))
    .map((layout) => [layout, tr(layoutLabel(layout, device))] as const);
  // On iPhone Duo the back device is the other display, so it needs its own capture.
  const companion = isDuoDevice(device) ? DUO_COMPANION[device] : null;
  const localeLabel = slide.label?.[locale] ?? "";
  const localeHeadline = slide.headline?.[locale] ?? "";
  // When the active locale is empty, surface the fallback (typically en) as
  // the placeholder so the user sees what they're translating from.
  const headlineDefault = isFeatureGraphic ? "Tu eslogan aquí." : "Una idea clave\npor captura.";
  const labelPlaceholder = localeLabel ? "FUNCIÓN 01" : pickText(slide.label, locale) || "FUNCIÓN 01";
  const headlinePlaceholder = localeHeadline
    ? headlineDefault
    : pickText(slide.headline, locale) || headlineDefault;

  function setLocaleField(key: "label" | "headline", value: string) {
    onChange({ [key]: writeLocalized(slide[key], locale, value) } as Partial<Slide>);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">{tr("Ajustes de pantalla")}</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">
              {tr("idioma")} · {locale.toUpperCase()}
            </span>
            {onOpenTranslate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onOpenTranslate}
                className="h-5 px-1.5 text-[10px] text-primary hover:text-primary gap-1"
                title={tr("Traducir textos automáticamente")}
              >
                <Languages className="h-3 w-3" />
                <span>{tr("Traducir")}</span>
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{tr(layoutHint(layoutValue, device))}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{tr("Diseño de pantalla")}</Label>
          <Select
            value={layoutValue}
            onValueChange={(layout) => {
              const next = layout as SlideLayout;
              onChange({
                layout: next,
                transforms: undefined,
                screenshotSecondary:
                  next === "two-devices" && !companion
                    ? slide.screenshotSecondary || slide.screenshot
                    : slide.screenshotSecondary,
              });
            }}
          >
            <SelectTrigger aria-label={tr("Diseño de pantalla")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layoutOptions.map(([layout, label]) => (
                <SelectItem key={layout} value={layout}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <BackgroundControls
          slide={isFeatureGraphic ? { ...slide, inverted: slide.inverted ?? true } : slide}
          theme={theme}
          onChange={onChange}
          palette={palette}
          onUpdatePalette={onUpdatePalette}
        />

        {!isFeatureGraphic && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{tr("Etiqueta superior (opcional)")}</Label>
              <div className="flex items-center gap-1.5">
                <LabelIdeasMenu onPick={(preset) => setLocaleField("label", preset)} />
                {Boolean(pickText(slide.label, locale)) && (
                  <button
                    type="button"
                    onClick={() => setLocaleField("label", "")}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    ✕ {tr("Quitar")}
                  </button>
                )}
              </div>
            </div>
            <Textarea
              aria-label={tr("Etiqueta superior")}
              value={localeLabel}
              onChange={(e) => setLocaleField("label", e.target.value)}
              placeholder={tr("Sin etiqueta (deja vacío para ocultar)")}
              rows={2}
              className="resize-none font-medium uppercase text-xs"
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
              <span>{tr("intro = salto de línea (admite 2 líneas)")}</span>
              <span>{tr("o reduce el ancho en el lienzo")}</span>
            </div>
            {Boolean(pickText(slide.label, locale)) && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">{tr("Color de la etiqueta")}</span>
                  {slide.labelColor && (
                    <button
                      type="button"
                      onClick={() => onChange({ labelColor: undefined })}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Restablecer
                    </button>
                  )}
                </div>
                <TextColorSelector
                  value={slide.labelColor || theme.accent}
                  isAuto={!slide.labelColor}
                  autoLabel="Extra"
                  theme={theme}
                  onChange={(c) => onChange({ labelColor: c })}
                  onReset={() => onChange({ labelColor: undefined })}
                />
                <p className="text-[10px] text-muted-foreground pt-0.5">{tr("Pieza independiente: arrástrala en el lienzo para colocarla donde quieras.")}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label className="text-xs">{tr(isFeatureGraphic ? "Eslogan" : "Titular principal")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{tr("intro = salto")}</span>
              {Boolean(pickText(slide.headline, locale)) && (
                <button
                  type="button"
                  onClick={() => setLocaleField("headline", "")}
                  className="text-[10px] text-muted-foreground transition-colors hover:text-destructive"
                >
                  ✕ {tr("Quitar")}
                </button>
              )}
              <CopyIdeasMenu onPick={(formula) => setLocaleField("headline", formula)} />
            </div>
          </div>
          <Textarea
            aria-label={tr(isFeatureGraphic ? "Eslogan" : "Titular principal")}
            value={localeHeadline}
            onChange={(e) => setLocaleField("headline", e.target.value)}
            rows={3}
            placeholder={headlinePlaceholder}
          />
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">{tr("Color del titular")}</span>
              {slide.headlineColor && (
                <button
                  type="button"
                  onClick={() => onChange({ headlineColor: undefined })}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Restablecer
                </button>
              )}
            </div>
            <TextColorSelector
              value={slide.headlineColor || colors.fg}
              isAuto={!slide.headlineColor}
              autoLabel="Auto"
              theme={theme}
              onChange={(c) => onChange({ headlineColor: c })}
              onReset={() => onChange({ headlineColor: undefined })}
            />
          </div>
        </div>

        <TypographySection slide={slide} isFeatureGraphic={isFeatureGraphic} onChange={onChange} />

        {!isFeatureGraphic && !isNoDevice && (
          slide.hideBaseDevice ? (
            <div className="flex items-center justify-between rounded-md border border-dashed border-border/80 bg-muted/20 p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted/50 text-muted-foreground">
                  <Smartphone className="h-4 w-4 opacity-60" />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">{tr("Dispositivo base eliminado")}</div>
                  <div className="text-[11px] text-muted-foreground">{tr("El terminal inicial está oculto en esta pantalla.")}</div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => onChange({ hideBaseDevice: false })}
              >
                <Plus className="h-3.5 w-3.5" />
                Restaurar dispositivo
              </Button>
            </div>
          ) : (
            <div className="space-y-2 rounded-md border bg-muted/20 p-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  {slide.layout === "two-devices" ? "Captura del dispositivo frontal" : "Captura de pantalla (Base)"}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 transition-colors"
                  onClick={() => {
                    onChange({ hideBaseDevice: true });
                    if (selectedElementId === "device") onSelectElement(null);
                  }}
                  title={tr("Eliminar el dispositivo base de esta pantalla")}
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar base
                </Button>
              </div>
              <div className="space-y-1.5">
                <ScreenshotPicker
                  label={tr("Principal")}
                  value={slide.screenshot}
                  locale={locale}
                  onChange={(v) => onChange({ screenshot: v })}
                />
                <CaptureNote device={device} src={resolveScreenshot(slide.screenshot, locale)} />
              </div>

              {/* Sombra del dispositivo / móvil */}
              <div className="space-y-1 pt-1.5 border-t">
                <Label className="text-[11px] text-muted-foreground font-medium">{tr("Sombra del dispositivo")}</Label>
                <Select
                  value={slide.deviceShadow || "apple"}
                  onValueChange={(val) => onChange({ deviceShadow: val as DeviceShadowStyle })}
                >
                  <SelectTrigger className="h-7 text-xs" aria-label={tr("Sombra del dispositivo")}>
                    <SelectValue placeholder={tr("Doble sombra Apple (Realista)")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tr("Sin sombra")}</SelectItem>
                    <SelectItem value="subtle">{tr("Sombra suave de estudio")}</SelectItem>
                    <SelectItem value="medium">{tr("Sombra elevada media")}</SelectItem>
                    <SelectItem value="apple">{tr("Doble sombra Apple (Realista)")}</SelectItem>
                    <SelectItem value="dramatic">{tr("Sombra profunda dramática")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estilo de maqueta del dispositivo */}
              <div className="space-y-1 pt-1.5 border-t">
                <Label className="text-[11px] text-muted-foreground font-medium">{tr("Estilo de terminal / Maqueta")}</Label>
                <Select
                  value={slide.frameless || slide.layout === "frameless" ? "frameless" : "standard"}
                  onValueChange={(val) => {
                    onChange({ frameless: val === "frameless" });
                  }}
                >
                  <SelectTrigger className="h-7 text-xs" aria-label={tr("Estilo de terminal")}>
                    <SelectValue placeholder={tr("Con marco oficial del terminal")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">{tr("Con marco oficial del terminal")}</SelectItem>
                    <SelectItem value="frameless">{tr("Sin móvil (Solo captura redondeada)")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Radio de esquinas para modo sin marco */}
              {(slide.frameless || slide.layout === "frameless") && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <Label className="text-[11px] text-muted-foreground font-medium">{tr("Redondeo de bordes")}</Label>
                    <span className="text-muted-foreground font-mono text-[10px]">{slide.cornerRadius ?? 32}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="56"
                    step="2"
                    value={slide.cornerRadius ?? 32}
                    onChange={(e) => onChange({ cornerRadius: Number(e.target.value) })}
                    className="w-full accent-primary h-1.5 bg-muted rounded cursor-pointer"
                  />
                </div>
              )}
            </div>
          )
        )}

        {slide.layout === "two-devices" && !slide.hideBaseDevice && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              {companion ? `Captura ${DEVICE_LABEL[companion]}` : "Captura dispositivo posterior"}
            </Label>
            <ScreenshotPicker
              label={companion ? DEVICE_LABEL[companion] : "Secundaria (capa posterior)"}
              value={slide.screenshotSecondary || ""}
              locale={locale}
              onChange={(v) => onChange({ screenshotSecondary: v })}
            />
            {companion && (
              <CaptureNote device={companion} src={resolveScreenshot(slide.screenshotSecondary, locale)} />
            )}
          </div>
        )}

        <CalloutControls
          slide={slide}
          device={device}
          orientation={orientation}
          locale={locale}
          available={calloutAvailable(slide, device)}
          onChange={onChange}
          onSelectElement={onSelectElement}
        />

        {!isFeatureGraphic && (
          <ElementTransformControls
            slide={slide}
            defaultTextColor={colors.fg}
            theme={theme}
            colors={colors}
            device={device}
            orientation={orientation}
            locale={locale}
            selectedElementId={selectedElementId}
            onChange={onChange}
            onUpdate={onUpdate}
            onSelectElement={onSelectElement}
          />
        )}

        {isFeatureGraphic && (
          <div className="space-y-1.5">
            <Label className="text-xs">App icon</Label>
            <ScreenshotPicker label="Icon (shared by every banner)" value={appIcon || ""} onChange={onAppIconChange} />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Shows app icon + name + tagline. Leave the icon blank to use the app&apos;s initial. Name is set in the toolbar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// iPhone Duo frames show a capture uncropped only when it came from that display.
function CaptureNote({ device, src }: { device: Device; src: string }) {
  if (!isDuoDevice(device)) return null;
  const { w, h } = CANVAS[device];
  const fits = !src || captureFits(src, duoGeometry(device).screenAspect, DUO_FIT_TOLERANCE);
  return (
    <p className={cn("text-[11px] leading-relaxed", fits ? "text-muted-foreground" : "text-amber-600")}>
      {fits
        ? `Use a ${w} × ${h} capture from the ${DEVICE_LABEL[device].replace(/ \(landscape\)$/, "")} display${device.endsWith("-landscape") ? " in landscape" : ""}.`
        : `This capture isn't ${w} × ${h} (${DEVICE_LABEL[device]}), so it is letterboxed, not cropped. Capture on that display.`}
    </p>
  );
}

function CopyIdeasMenu({ onPick }: { onPick: (formula: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          title="Insertar fórmula de titular en español, luego reemplaza el texto entre [corchetes]"
        >
          <Lightbulb className="h-3 w-3 text-amber-500" />
          {tr("Ideas de titular")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[420px] w-80 overflow-y-auto">
        {COPY_IDEA_SLOTS.map((slot, i) => (
          <React.Fragment key={slot.id}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
              {slot.name}
            </DropdownMenuLabel>
            {slot.ideas.map((idea) => (
              <DropdownMenuItem
                key={idea.formula}
                onSelect={() => onPick(idea.formula)}
                className="flex-col items-start gap-0.5 cursor-pointer"
              >
                <span className="text-xs font-medium">{idea.formula.replace(/\n/g, " / ")}</span>
                <span className="text-[11px] text-muted-foreground">{idea.example}</span>
              </DropdownMenuItem>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LabelIdeasMenu({ onPick }: { onPick: (label: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          title="Insertar etiqueta sugerida en español (admite 1 o 2 líneas)"
        >
          <Lightbulb className="h-3 w-3 text-amber-500" />
          {tr("Ideas etiqueta")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[420px] w-80 overflow-y-auto">
        {LABEL_CATEGORIES.map((cat, i) => {
          const items = LABEL_SUGGESTIONS.filter((s) => s.category === cat.id);
          if (items.length === 0) return null;
          return (
            <React.Fragment key={cat.id}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                {cat.name}
              </DropdownMenuLabel>
              {items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => onPick(item.label)}
                  className="flex-col items-start gap-0.5 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="text-xs font-semibold tracking-wide text-foreground">
                      {item.label.replace(/\n/g, " / ")}
                    </span>
                    {item.label.includes("\n") && (
                      <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-bold text-primary ml-auto">
                        2 líneas
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                </DropdownMenuItem>
              ))}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const BADGE_PRESETS = [
  {
    id: "rating-dark",
    name: "5.0 Rating · Top Rated (Dark)",
    desc: "★★★★★ 5.0 Rating (Frosted dark pill)",
    src: "/badges/rating-pill-dark.svg",
    widthFraction: 0.52,
    heightFraction: 0.11,
  },
  {
    id: "rating-light",
    name: "5.0 Rating · Top Rated (Light)",
    desc: "★★★★★ 5.0 Rating (Studio white pill)",
    src: "/badges/rating-pill-light.svg",
    widthFraction: 0.52,
    heightFraction: 0.11,
  },
  {
    id: "ad-free",
    name: "100% Ad-Free Experience",
    desc: "Pure & uninterrupted experience",
    src: "/badges/ad-free.svg",
    widthFraction: 0.54,
    heightFraction: 0.11,
  },
  {
    id: "privacy-shield",
    name: "100% Private & Secure",
    desc: "Zero tracking · No data collected",
    src: "/badges/privacy-shield.svg",
    widthFraction: 0.56,
    heightFraction: 0.11,
  },
  {
    id: "no-subscription",
    name: "No Subscription · Pay Once",
    desc: "Lifetime access · No recurring fees",
    src: "/badges/no-subscription.svg",
    widthFraction: 0.55,
    heightFraction: 0.11,
  },
  {
    id: "offline-ready",
    name: "Works 100% Offline",
    desc: "No internet connection needed",
    src: "/badges/offline-ready.svg",
    widthFraction: 0.55,
    heightFraction: 0.11,
  },
  {
    id: "indie-crafted",
    name: "Indie Crafted with Care",
    desc: "Built with love by independent creators",
    src: "/badges/indie-crafted.svg",
    widthFraction: 0.53,
    heightFraction: 0.11,
  },
  {
    id: "app-store-en",
    name: "Download on the App Store",
    desc: "Official Apple App Store badge",
    src: "/badges/app-store-en.svg",
    widthFraction: 0.48,
    heightFraction: 0.13,
  },
];

function MockupIcon({ kind, className }: { kind: MockupKind; className?: string }) {
  switch (kind) {
    case "ipad":
      return <Tablet className={className} />;
    case "mac":
      return <Laptop className={className} />;
    case "watchos":
      return <Watch className={className} />;
    case "tvos":
      return <Tv className={className} />;
    case "frameless":
      return <Square className={className} />;
    default:
      return <Smartphone className={className} />;
  }
}

function ElementTransformControls({
  slide,
  defaultTextColor,
  theme,
  colors,
  device,
  orientation,
  locale,
  selectedElementId,
  onChange,
  onUpdate,
  onSelectElement,
}: {
  slide: Slide;
  defaultTextColor: string;
  theme: Theme;
  colors: ReturnType<typeof slideColors>;
  device: Device;
  orientation: Orientation;
  locale: string;
  selectedElementId: ElementId | null;
  onChange: (patch: Partial<Slide>) => void;
  onUpdate: (update: (slide: Slide) => Partial<Slide>) => void;
  onSelectElement: (id: ElementId | null) => void;
}) {
  const present: ElementId[] = ["caption"];
  if (pickText(slide.label, locale)?.trim()) present.push("label");
  if (slide.layout !== "no-device" && !slide.hideBaseDevice) present.push("device");
  if (slide.layout === "two-devices" && !slide.hideBaseDevice) present.push("deviceSecondary");
  if (slide.callout && !slide.hideBaseDevice && calloutAvailable(slide, device)) present.push("callout");
  for (const element of slide.textElements || []) present.push(toTextElementId(element.id));
  for (const element of slide.imageElements || []) present.push(toImageElementId(element.id));
  for (const element of slide.deviceElements || []) present.push(toMockupElementId(element.id));

  const transforms = slide.transforms || {};
  const activeId =
    selectedElementId && present.includes(selectedElementId) ? selectedElementId : null;
  const activeTransform = activeId
    ? getElementTransform(slide, device, orientation, activeId)
    : undefined;
  const { cW, cH } = getCanvas(device, orientation);
  const activeTextElement =
    activeId && isTextElementId(activeId)
      ? slide.textElements?.find((element) => element.id === textElementKey(activeId))
      : null;
  const activeImageElement =
    activeId && isImageElementId(activeId)
      ? slide.imageElements?.find((element) => element.id === imageElementKey(activeId))
      : null;
  const activeMockup =
    activeId && isMockupElementId(activeId)
      ? slide.deviceElements?.find((element) => element.id === mockupElementKey(activeId))
      : null;

  function getTransform(id: ElementId) {
    return getElementTransform(slide, device, orientation, id);
  }

  function patchElement(id: ElementId, patch: Partial<ElementTransform>) {
    const cur = getTransform(id);
    if (!cur) return;
    if (isTextElementId(id)) {
      const textId = textElementKey(id);
      onChange({
        textElements: (slide.textElements || []).map((element) =>
          element.id === textId
            ? { ...element, transform: { ...element.transform, ...patch } }
            : element,
        ),
      });
      return;
    }
    if (isImageElementId(id)) {
      const imageId = imageElementKey(id);
      onUpdate((latest) => ({
        imageElements: (latest.imageElements || []).map((element) =>
          element.id === imageId
            ? { ...element, transform: { ...element.transform, ...patch } }
            : element,
        ),
      }));
      return;
    }
    if (isMockupElementId(id)) {
      const mockupId = mockupElementKey(id);
      onUpdate((latest) => ({
        deviceElements: (latest.deviceElements || []).map((element) =>
          element.id === mockupId ? { ...element, transform: { ...element.transform, ...patch } } : element,
        ),
      }));
      return;
    }
    if (!isBuiltInElementId(id)) return;
    onChange({
      transforms: { ...transforms, [id]: { ...cur, ...patch } },
    });
  }

  function patchMockup(id: string, patch: Partial<DeviceElement>) {
    onUpdate((latest) => ({
      deviceElements: (latest.deviceElements || []).map((element) => (element.id === id ? { ...element, ...patch } : element)),
    }));
  }

  function deleteMockup(element: DeviceElement) {
    onUpdate((latest) => {
      const next = (latest.deviceElements || []).filter((item) => item.id !== element.id);
      return { deviceElements: next.length > 0 ? next : undefined };
    });
    onSelectElement(null);
  }

  function centerElement(id: ElementId, axis: "x" | "y" | "both") {
    const cur = getTransform(id);
    if (!cur) return;
    const patch: Partial<ElementTransform> = {};
    if (axis === "x" || axis === "both") {
      patch.x = Math.round((cW - cur.width) / 2);
    }
    if (axis === "y" || axis === "both") {
      patch.y = Math.round((cH - cur.height) / 2);
    }
    patchElement(id, patch);
  }

  // Cambia el tipo de terminal manteniendo la anchura y centrando el nuevo marco sobre el anterior.
  function changeMockupKind(element: DeviceElement, kind: MockupKind) {
    const aspect = getMockupAspect(kind);
    const t = element.transform;
    const width = t.width;
    const height = width / aspect;
    patchMockup(element.id, {
      kind,
      transform: { ...t, width, height, x: t.x, y: t.y + (t.height - height) / 2 },
    });
  }

  function addMockup(kind: MockupKind) {
    const { cW, cH } = getCanvas(device, orientation);
    const id = nid();
    const aspect = getMockupAspect(kind);
    const count = (slide.deviceElements || []).length;
    const wide =
      kind === "mac" ||
      kind === "tvos" ||
      kind === "duo-inner";
    let width = cW * (wide ? 0.65 : kind === "ipad" ? 0.5 : kind === "watchos" ? 0.3 : 0.4);
    if (width / aspect > cH * 0.62) width = cH * 0.62 * aspect;
    const height = width / aspect;
    const zIndex = Math.max(3, ...present.map((elementId) => getTransform(elementId)?.zIndex ?? defaultZ(elementId))) + 1;
    const element: DeviceElement = {
      id,
      kind,
      screenshot: "",
      transform: {
        x: Math.round(Math.max(0, Math.min(cW - width, (cW - width) / 2 + count * cW * 0.09))),
        y: Math.round(Math.min(cH - height * 0.5, cH * 0.36 + count * cH * 0.03)),
        width: Math.round(width),
        height: Math.round(height),
        rotation: 0,
        zIndex,
      },
    };
    onUpdate((latest) => ({ deviceElements: [...(latest.deviceElements || []), element] }));
    onSelectElement(toMockupElementId(id));
  }

  function patchTextElement(id: string, patch: Partial<TextElement>) {
    onChange({
      textElements: (slide.textElements || []).map((element) =>
        element.id === id ? { ...element, ...patch } : element,
      ),
    });
  }

  function setTextElementValue(element: TextElement, value: string) {
    patchTextElement(element.id, { text: writeLocalized(element.text, locale, value) });
  }

  function deleteTextElement(element: TextElement) {
    const nextTextElements = (slide.textElements || []).filter((item) => item.id !== element.id);
    onChange({
      textElements: nextTextElements.length > 0 ? nextTextElements : undefined,
    });
    onSelectElement(null);
  }

  // Functional updates: an image upload can finish after the user has moved or
  // resized the overlay, and a patch built from the render-time slide would
  // silently revert that move.
  function patchImageElement(id: string, patch: Partial<ImageElement>) {
    onUpdate((latest) => ({
      imageElements: (latest.imageElements || []).map((element) =>
        element.id === id ? { ...element, ...patch } : element,
      ),
    }));
  }

  // The first image picked for an overlay reshapes its frame to the image's
  // aspect ratio (centred on the old frame), so "Fill frame" doesn't crop a
  // wide logo into a square. Replacing an image keeps the frame as placed.
  const imageRequests = React.useRef(new Map<string, number>());
  React.useEffect(() => () => imageRequests.current.clear(), []);
  async function setImageSource(id: string, src: string) {
    const request = (imageRequests.current.get(id) || 0) + 1;
    imageRequests.current.set(id, request);
    const size = src ? await naturalSize(img(src)) : null;
    if (imageRequests.current.get(id) !== request) return;
    onUpdate((latest) => ({
      imageElements: (latest.imageElements || []).map((element) => {
        if (element.id !== id) return element;
        if (!size || element.src) return { ...element, src };
        return { ...element, src, transform: fitToAspect(element.transform, size.w / size.h, cH * 0.6) };
      }),
    }));
  }

  function deleteImageElement(element: ImageElement) {
    onUpdate((latest) => {
      const nextImageElements = (latest.imageElements || []).filter((item) => item.id !== element.id);
      return { imageElements: nextImageElements.length > 0 ? nextImageElements : undefined };
    });
    onSelectElement(null);
  }

  function addTextElement() {
    const id = nid();
    const zIndex =
      Math.max(
        5,
        ...present.map((elementId) => getTransform(elementId)?.zIndex ?? defaultZ(elementId)),
      ) + 1;
    const element: TextElement = {
      id,
      text: writeLocalized({}, locale, "New text"),
      transform: {
        x: cW * 0.18,
        y: cH * 0.42,
        width: cW * 0.64,
        height: cH * 0.12,
        rotation: 0,
        zIndex,
      },
      fontWeight: 800,
      align: "center",
    };
    onChange({ textElements: [...(slide.textElements || []), element] });
    onSelectElement(toTextElementId(id));
  }

  function addImageElement() {
    const { cW, cH } = getCanvas(device, orientation);
    const id = nid();
    const zIndex = Math.max(5, ...present.map((elementId) => getTransform(elementId)?.zIndex ?? defaultZ(elementId))) + 1;
    const element: ImageElement = {
      id,
      src: "",
      transform: {
        x: cW * 0.25,
        y: cH * 0.36,
        width: cW * 0.5,
        height: cW * 0.5,
        rotation: 0,
        zIndex,
      },
      fit: "cover",
    };
    onChange({ imageElements: [...(slide.imageElements || []), element] });
    onSelectElement(toImageElementId(id));
  }

  function addBadgeElement(preset: typeof BADGE_PRESETS[number]) {
    const { cW, cH } = getCanvas(device, orientation);
    const id = nid();
    const zIndex = Math.max(5, ...present.map((elementId) => getTransform(elementId)?.zIndex ?? defaultZ(elementId))) + 1;
    const width = Math.round(cW * preset.widthFraction);
    const height = Math.round(cH * preset.heightFraction);
    const element: ImageElement = {
      id,
      src: preset.src,
      transform: {
        x: Math.round((cW - width) / 2),
        y: Math.round(cH * 0.42),
        width,
        height,
        rotation: 0,
        zIndex,
      },
      fit: "contain",
    };
    onChange({ imageElements: [...(slide.imageElements || []), element] });
    onSelectElement(toImageElementId(id));
  }

  // Z-order: re-rank zIndex among present elements so they remain contiguous.
  function reorder(id: ElementId, dir: "front" | "back" | "up" | "down") {
    const ranked = [...present].sort((a, b) => {
      const za = getTransform(a)?.zIndex ?? defaultZ(a);
      const zb = getTransform(b)?.zIndex ?? defaultZ(b);
      return za - zb;
    });
    const idx = ranked.indexOf(id);
    if (idx === -1) return;
    let target = idx;
    if (dir === "front") target = ranked.length - 1;
    else if (dir === "back") target = 0;
    else if (dir === "up") target = Math.min(ranked.length - 1, idx + 1);
    else if (dir === "down") target = Math.max(0, idx - 1);
    if (target === idx) return;
    ranked.splice(idx, 1);
    ranked.splice(target, 0, id);
    const nextTransforms = { ...transforms };
    const nextTextElements = (slide.textElements || []).map((element) => ({
      ...element,
      transform: { ...element.transform },
    }));
    const nextImageElements = (slide.imageElements || []).map((element) => ({
      ...element,
      transform: { ...element.transform },
    }));
    const nextDeviceElements = (slide.deviceElements || []).map((element) => ({
      ...element,
      transform: { ...element.transform },
    }));
    ranked.forEach((eid, i) => {
      const cur = getTransform(eid);
      if (!cur) return;
      if (isTextElementId(eid)) {
        const textId = textElementKey(eid);
        const textElement = nextTextElements.find((element) => element.id === textId);
        if (textElement) textElement.transform = { ...textElement.transform, zIndex: i + 1 };
      } else if (isImageElementId(eid)) {
        const imageId = imageElementKey(eid);
        const imageElement = nextImageElements.find((element) => element.id === imageId);
        if (imageElement) imageElement.transform = { ...imageElement.transform, zIndex: i + 1 };
      } else if (isMockupElementId(eid)) {
        const mockup = nextDeviceElements.find((element) => element.id === mockupElementKey(eid));
        if (mockup) mockup.transform = { ...mockup.transform, zIndex: i + 1 };
      } else if (isBuiltInElementId(eid)) {
        nextTransforms[eid] = { ...cur, zIndex: i + 1 };
      }
    });
    onChange({
      transforms: nextTransforms,
      textElements: nextTextElements,
      imageElements: nextImageElements,
      ...(nextDeviceElements.length > 0 ? { deviceElements: nextDeviceElements } : {}),
    });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold">{tr("Elementos y Capas")}</Label>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={addTextElement}
            >
              <Plus className="h-3.5 w-3.5" />
              {tr("Texto")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={addImageElement}
              title={tr("Añadir una imagen o logotipo (PNG, JPG)")}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {tr("Imagen")}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs gap-1"
                  title={tr("Añadir otro terminal (iPhone, iPad, Mac, Android…) a esta pantalla")}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  {tr("Dispositivo")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <p className="mb-1.5 px-1 text-[11px] text-muted-foreground">
                  {tr("Añade más terminales a la pantalla (p. ej. 3 iPhone, o iPhone + iPad). Suelta una captura sobre cada uno.")}
                </p>
                <div className="grid gap-1">
                  {MOCKUP_KINDS.map((kind) => (
                    <button
                      key={kind.id}
                      type="button"
                      onClick={() => addMockup(kind.id)}
                      className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-1.5 text-left text-xs hover:border-primary hover:bg-accent/40"
                    >
                      <span className="font-medium">{tr(kind.label)}</span>
                      <span className="text-[10px] text-muted-foreground">{tr(kind.hint)}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs font-medium gap-1 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
                  title={tr("Añadir insignias oficiales, estrellas y premios de la App Store")}
                >
                  <Award className="h-3.5 w-3.5 text-amber-500" />
                  + {tr("Insignia")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2.5 max-h-96 overflow-y-auto" align="end">
                <div className="space-y-1 mb-2 pb-1.5 border-b">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-500" />
                    {tr("Insignias y Elementos App Store")}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {tr("Haz clic en una insignia para insertarla en la captura:")}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {BADGE_PRESETS.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => addBadgeElement(badge)}
                      className="flex items-center gap-3 p-2 rounded-md border border-border/60 hover:border-primary hover:bg-accent/40 text-left transition-all group"
                    >
                      <div className="h-10 w-16 bg-muted/60 rounded flex items-center justify-center p-1 shrink-0 overflow-hidden border">
                        <img src={badge.src} alt={badge.name} className="h-full w-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground group-hover:text-primary truncate">
                          {badge.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {badge.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {activeId
            ? tr("Ajusta la rotación, tamaño y posición de la capa seleccionada.")
            : tr("Haz clic en un elemento del lienzo para ajustar su rotación, posición y capas.")}
        </p>

        {/* Lista de terminales en pantalla para seleccionar o borrar */}
        {(slide.layout !== "no-device" || (slide.deviceElements && slide.deviceElements.length > 0)) && (
          <div className="space-y-1.5 rounded-md border bg-background/50 p-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-primary" />
                {tr("Dispositivos en pantalla")}
              </span>
              <span className="text-[10px] text-muted-foreground">{tr("Toca para editar o borrar")}</span>
            </div>
            <div className="space-y-1">
              {/* Dispositivo principal o base */}
              {slide.layout !== "no-device" && (
                !slide.hideBaseDevice ? (
                  <div
                    className={cn(
                      "flex items-center justify-between gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                      activeId === "device"
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border/60 bg-background/60 hover:bg-muted/40 text-foreground"
                    )}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-2 flex-1 min-w-0 text-left py-0.5"
                      onClick={() => onSelectElement("device")}
                    >
                      <Smartphone className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <div className="truncate flex-1 min-w-0">
                        <span className="font-medium">
                          {slide.frameless || slide.layout === "frameless" ? tr("Captura base (sin marco)") : tr("Dispositivo base")}
                        </span>{" "}
                        <span className="text-[10px] text-muted-foreground">
                          {slide.screenshot ? tr("• Con captura") : tr("• Sin captura")}
                        </span>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ hideBaseDevice: true });
                        if (activeId === "device") onSelectElement(null);
                      }}
                      title={tr("Eliminar dispositivo base de esta pantalla")}
                      aria-label={tr("Eliminar dispositivo base")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-1.5 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground bg-muted/20">
                    <span className="text-[11px] italic">{tr("Dispositivo base eliminado")}</span>
                    <button
                      type="button"
                      onClick={() => onChange({ hideBaseDevice: false })}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      + Restaurar base
                    </button>
                  </div>
                )
              )}

              {/* Terminales extra */}
              {(slide.deviceElements || []).map((mockup, idx) => {
                const isSelected = activeId === toMockupElementId(mockup.id);
                const kindInfo = MOCKUP_KINDS.find((k) => k.id === mockup.kind);
                return (
                  <div
                    key={mockup.id}
                    className={cn(
                      "flex items-center justify-between gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border/60 bg-background/60 hover:bg-muted/40 text-foreground"
                    )}
                  >
                    <button
                      type="button"
                      className="flex items-center gap-2 flex-1 min-w-0 text-left py-0.5"
                      onClick={() => onSelectElement(toMockupElementId(mockup.id))}
                    >
                      <MockupIcon kind={mockup.kind} className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <div className="truncate flex-1 min-w-0">
                        <span className="font-medium">{kindInfo?.label || "Dispositivo"} #{idx + 1}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">
                          {mockup.screenshot ? tr("• Con captura") : tr("• Sin captura")}
                        </span>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMockup(mockup);
                      }}
                      title={tr("Eliminar este dispositivo de la pantalla")}
                      aria-label={tr("Eliminar dispositivo")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {activeId ? (
        <ActiveElementPanel
          key={activeId}
          activeId={activeId}
          slide={slide}
          theme={theme}
          colors={colors}
          onSlideChange={onChange}
          transform={activeTransform}
          textElement={activeTextElement || undefined}
          imageElement={activeImageElement || undefined}
          mockup={activeMockup || undefined}
          onMockupKind={(kind) => { if (activeMockup) changeMockupKind(activeMockup, kind); }}
          onMockupScreenshot={(screenshot) => { if (activeMockup) patchMockup(activeMockup.id, { screenshot }); }}
          onDeleteMockup={() => { if (activeMockup) deleteMockup(activeMockup); }}
          onResetLabel={() => {
            const { label: _label, ...rest } = transforms;
            void _label;
            onChange({ transforms: Object.keys(rest).length > 0 ? rest : undefined });
          }}
          locale={locale}
          canvas={{ cW, cH }}
          defaultTextColor={defaultTextColor}
          onRotate={(rotation) => patchElement(activeId, { rotation })}
          onCenter={(axis) => centerElement(activeId, axis)}
          onReorder={(dir) => reorder(activeId, dir)}
          onTextChange={(value) => {
            if (activeTextElement) setTextElementValue(activeTextElement, value);
          }}
          onTextPatch={(patch) => {
            if (activeTextElement) patchTextElement(activeTextElement.id, patch);
          }}
          onDeleteText={() => {
            if (activeTextElement) deleteTextElement(activeTextElement);
          }}
          onImageSource={(src) => {
            if (activeImageElement) void setImageSource(activeImageElement.id, src);
          }}
          onImagePatch={(patch) => {
            if (activeImageElement) patchImageElement(activeImageElement.id, patch);
          }}
          onDeleteImage={() => {
            if (activeImageElement) deleteImageElement(activeImageElement);
          }}
        />
      ) : (
        <div className="rounded border border-dashed bg-background/40 p-4 text-center text-[11px] text-muted-foreground">
          {tr("Ningún elemento seleccionado. Haz clic en un elemento del lienzo o añade uno nuevo arriba.")}
        </div>
      )}
    </div>
  );
}

function ActiveElementPanel({
  activeId,
  slide,
  theme,
  colors,
  onSlideChange,
  transform,
  textElement,
  imageElement,
  mockup,
  onMockupKind,
  onMockupScreenshot,
  onDeleteMockup,
  onResetLabel,
  locale,
  canvas,
  defaultTextColor,
  onRotate,
  onCenter,
  onReorder,
  onTextChange,
  onTextPatch,
  onDeleteText,
  onImagePatch,
  onImageSource,
  onDeleteImage,
}: {
  activeId: ElementId;
  slide: Slide;
  theme: Theme;
  colors: ReturnType<typeof slideColors>;
  onSlideChange: (patch: Partial<Slide>) => void;
  transform: ElementTransform | undefined;
  textElement?: TextElement;
  imageElement?: ImageElement;
  mockup?: DeviceElement;
  onMockupKind: (kind: MockupKind) => void;
  onMockupScreenshot: (screenshot: string) => void;
  onDeleteMockup: () => void;
  onResetLabel: () => void;
  locale: string;
  canvas: { cW: number; cH: number };
  defaultTextColor: string;
  onRotate: (rotation: number) => void;
  onCenter: (axis: "x" | "y" | "both") => void;
  onReorder: (dir: "front" | "back" | "up" | "down") => void;
  onTextChange: (value: string) => void;
  onTextPatch: (patch: Partial<TextElement>) => void;
  onDeleteText: () => void;
  onImagePatch: (patch: Partial<ImageElement>) => void;
  onImageSource: (src: string) => void;
  onDeleteImage: () => void;
}) {
  const engaged = !!transform;
  const rotation = transform?.rotation ?? 0;
  const label = elementLabel(activeId);
  return (
    <div className="space-y-2 rounded border bg-background/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium">
          {textElement && <Type className="h-3.5 w-3.5" />}
          {imageElement && <ImagePlus className="h-3.5 w-3.5" />}
          {mockup && <Smartphone className="h-3.5 w-3.5" />}
          {label}
        </span>
        {textElement || imageElement || mockup || activeId === "device" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (textElement) onDeleteText();
              else if (mockup) onDeleteMockup();
              else if (imageElement) onDeleteImage();
              else if (activeId === "device") {
                onSlideChange({ hideBaseDevice: true });
              }
            }}
            title={
              textElement
                ? "Eliminar elemento de texto"
                : mockup
                ? "Eliminar dispositivo extra"
                : imageElement
                ? "Eliminar elemento de imagen"
                : "Eliminar dispositivo principal de esta pantalla"
            }
            aria-label={tr("Eliminar elemento")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : !engaged ? (
          <span className="text-[10px] text-muted-foreground">{tr("arrastra en lienzo para activar")}</span>
        ) : null}
      </div>

      {activeId === "caption" && (
        <div className="space-y-1.5 rounded-md bg-muted/40 p-2 border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">{tr("Color del titular")}</span>
            {slide.headlineColor && (
              <button
                type="button"
                onClick={() => onSlideChange({ headlineColor: undefined })}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Restablecer
              </button>
            )}
          </div>
          <TextColorSelector
            value={slide.headlineColor || colors.fg}
            isAuto={!slide.headlineColor}
            autoLabel="Auto"
            theme={theme}
            onChange={(c) => onSlideChange({ headlineColor: c })}
            onReset={() => onSlideChange({ headlineColor: undefined })}
          />
        </div>
      )}

      {textElement && (
        <TextElementPanel
          key={textElement.id}
          element={textElement}
          locale={locale}
          canvas={canvas}
          theme={theme}
          defaultColor={defaultTextColor}
          onTextChange={onTextChange}
          onTextPatch={onTextPatch}
        />
      )}

      {imageElement && (
        <ImageElementPanel element={imageElement} onPatch={onImagePatch} onSourceChange={onImageSource} />
      )}

      {mockup && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{tr("Tipo de terminal")}</Label>
            <Select value={mockup.kind} onValueChange={(kind) => onMockupKind(kind as MockupKind)}>
              <SelectTrigger className="h-8 text-xs" aria-label={tr("Tipo de terminal")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOCKUP_KINDS.map((kind) => (
                  <SelectItem key={kind.id} value={kind.id}>{kind.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScreenshotPicker label={tr("Captura")} value={mockup.screenshot} onChange={onMockupScreenshot} />
        </div>
      )}

      {activeId === "label" && (
        <div className="space-y-2 rounded-md bg-muted/40 p-2 border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">{tr("Color de la etiqueta")}</span>
            {slide.labelColor && (
              <button
                type="button"
                onClick={() => onSlideChange({ labelColor: undefined })}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Restablecer
              </button>
            )}
          </div>
          <TextColorSelector
            value={slide.labelColor || theme.accent}
            isAuto={!slide.labelColor}
            autoLabel="Extra"
            theme={theme}
            onChange={(c) => onSlideChange({ labelColor: c })}
            onReset={() => onSlideChange({ labelColor: undefined })}
          />
          <div className="text-[10px] text-muted-foreground pt-0.5">
            <p>{tr("La etiqueta es independiente del titular.")}</p>
            <button type="button" onClick={onResetLabel} className="font-medium text-foreground underline-offset-2 hover:underline">
              Volver a anclarla sobre el titular
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground">{tr("Centrar en lienzo")}</Label>
          <span className="font-mono text-[10px] text-muted-foreground">
            {transform ? `X:${Math.round(transform.x)} Y:${Math.round(transform.y)}` : ""}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] px-1 font-medium gap-1"
            disabled={!engaged}
            onClick={() => onCenter("x")}
            title={tr("Centrar horizontalmente en la pantalla")}
          >
            <AlignCenter className="h-3.5 w-3.5" />
            Centrar H
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] px-1 font-medium gap-1"
            disabled={!engaged}
            onClick={() => onCenter("y")}
            title={tr("Centrar verticalmente en la pantalla")}
          >
            <AlignJustify className="h-3.5 w-3.5 rotate-90" />
            Centrar V
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] px-1 font-medium gap-1"
            disabled={!engaged}
            onClick={() => onCenter("both")}
            title={tr("Centrar perfectamente en el centro de la pantalla")}
          >
            <Maximize2 className="h-3 w-3" />
            Centro
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <RotateCw className="h-3 w-3" /> Rotación
          </Label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {rotation}°
          </span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotation}
          disabled={!engaged}
          onChange={(e) => onRotate(Number(e.target.value))}
          className="w-full disabled:opacity-50"
          aria-label={`Rotación de ${label}`}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">{tr("Capa / Orden")}</Label>
        <div className="grid grid-cols-4 gap-1">
          <LayerButton disabled={!engaged} onClick={() => onReorder("back")} label="Enviar al fondo">
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("down")} label={tr("Bajar una capa")}>
            <ChevronDown className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("up")} label={tr("Subir una capa")}>
            <ChevronUp className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("front")} label={tr("Traer al frente")}>
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </LayerButton>
        </div>
      </div>
    </div>
  );
}

function ImageElementPanel({
  element,
  onPatch,
  onSourceChange,
}: {
  element: ImageElement;
  onPatch: (patch: Partial<ImageElement>) => void;
  onSourceChange: (src: string) => void;
}) {
  return (
    <div className="space-y-2">
      <ScreenshotPicker label={tr("Imagen")} value={element.src} onChange={onSourceChange} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{tr("Ajuste")}</Label>
          <Select value={element.fit || "cover"} onValueChange={(fit) => onPatch({ fit: fit as ImageElement["fit"] })}>
            <SelectTrigger className="h-8 text-xs" aria-label={tr("Ajuste de imagen")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">{tr("Llenar marco")}</SelectItem>
              <SelectItem value="contain">{tr("Imagen completa")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{tr("Desvanecer borde")}</Label>
          <Select
            value={element.fade?.edge || "none"}
            onValueChange={(edge) =>
              onPatch({
                fade:
                  edge === "none"
                    ? undefined
                    : { edge: edge as NonNullable<ImageElement["fade"]>["edge"], amount: element.fade?.amount ?? 35 },
              })
            }
          >
            <SelectTrigger className="h-8 text-xs" aria-label={tr("Desvanecer borde")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{tr("Ninguno")}</SelectItem>
              <SelectItem value="top">{tr("Desde arriba")}</SelectItem>
              <SelectItem value="bottom">{tr("Desde abajo")}</SelectItem>
              <SelectItem value="left">{tr("Desde la izquierda")}</SelectItem>
              <SelectItem value="right">{tr("Desde la derecha")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {element.fade && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground">{tr("Intensidad del desvanecimiento")}</Label>
            <span className="text-[11px] tabular-nums text-muted-foreground">{Math.round(element.fade.amount)}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={element.fade.amount}
            onChange={(event) => onPatch({ fade: { ...element.fade!, amount: Number(event.target.value) } })}
            className="w-full"
            aria-label={tr("Intensidad del desvanecimiento")}
          />
        </div>
      )}
    </div>
  );
}

function TextElementPanel({
  element,
  locale,
  canvas,
  theme,
  defaultColor,
  onTextChange,
  onTextPatch,
}: {
  element: TextElement;
  locale: string;
  canvas: { cW: number; cH: number };
  theme: Theme;
  defaultColor: string;
  onTextChange: (value: string) => void;
  onTextPatch: (patch: Partial<TextElement>) => void;
}) {
  // Like the headline field: the locale's own text, with the fallback shown as
  // a placeholder, so clearing a translation doesn't snap back to English.
  const text = element.text?.[locale] ?? "";
  const textPlaceholder = pickText(element.text, locale) || "Overlay text";
  const align = element.align ?? "center";
  const defaultSize = defaultTextElementFontSize(canvas.cW, canvas.cH);
  const range = textElementFontSizeRange(canvas.cW, canvas.cH);
  const hasCustomSize = typeof element.fontSize === "number" && Number.isFinite(element.fontSize);
  // Mirror the canvas: an unset size renders at the canvas-relative default.
  const size = Math.round(hasCustomSize ? (element.fontSize as number) : defaultSize);
  // Keep a value loaded from an older project reachable even if it sits
  // outside the canvas-relative range.
  const sliderMin = Math.min(range.min, size);
  const sliderMax = Math.max(range.max, size);
  // Typing is buffered so intermediate values ("1" on the way to "120") don't
  // get clamped mid-keystroke; the value is committed on blur / Enter.
  const [draft, setDraft] = React.useState<string | null>(null);
  const cancelDraft = React.useRef(false);

  function commitDraft() {
    if (cancelDraft.current) { cancelDraft.current = false; return; }
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n)) {
      onTextPatch({ fontSize: Math.min(range.max, Math.max(range.min, Math.round(n))) });
    }
    setDraft(null);
  }

  return (
    <div className="space-y-2 rounded border bg-muted/30 p-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">{tr("Texto")}</Label>
        <Textarea
          value={text}
          rows={2}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={textPlaceholder}
          aria-label={tr("Texto superpuesto")}
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] text-muted-foreground">{tr("Tamaño")}</Label>
          <ResetButton
            visible={hasCustomSize && size !== defaultSize}
            label={`Restablecer tamaño a ${defaultSize}px`}
            onClick={() => onTextPatch({ fontSize: undefined })}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={size}
            onChange={(event) => onTextPatch({ fontSize: Number(event.target.value) })}
            onDoubleClick={() => onTextPatch({ fontSize: undefined })}
            className="min-w-0 flex-1"
            aria-label={tr("Tamaño de texto")}
          />
          <div className="relative w-[76px] shrink-0">
            <Input
              type="number"
              min={range.min}
              max={range.max}
              value={draft ?? String(size)}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelDraft.current = true;
                  setDraft(null);
                  event.currentTarget.blur();
                }
              }}
              className="h-8 pr-7 text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label={tr("Tamaño en píxeles")}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              px
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">{tr("Color del texto")}</Label>
        <div className="flex items-center gap-1">
          <Input
            type="color"
            value={element.color || defaultColor}
            className="h-6 w-7 cursor-pointer p-0.5 shrink-0"
            onChange={(event) => onTextPatch({ color: event.target.value.toUpperCase() })}
            aria-label={tr("Color del texto")}
          />
          <div className="flex flex-1 items-center gap-0.5">
            {[
              { label: "B", color: theme.bg, tip: "Color Base" },
              { label: "S", color: theme.bgAlt, tip: "Color Secundario" },
              { label: "E", color: theme.accent, tip: "Color Extra" },
              { label: "W", color: "#FFFFFF", tip: "Blanco" },
              { label: "N", color: "#0A0A0C", tip: "Negro" },
            ].map((sw) => (
              <button
                key={sw.label}
                type="button"
                onClick={() => onTextPatch({ color: sw.color })}
                title={`${sw.tip} (${sw.color})`}
                className="h-6 flex-1 rounded border border-border/70 text-[9px] font-bold"
                style={{
                  backgroundColor: sw.color,
                  color: (relativeLuminance(sw.color) ?? 1) < 0.18 ? "#FFF" : "#000",
                }}
              >
                {sw.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Alineación</Label>
        <div className="grid grid-cols-3 gap-1">
            <LayerButton
              disabled={false}
              active={align === "left"}
              onClick={() => onTextPatch({ align: "left" })}
              label={tr("Alinear a la izquierda")}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </LayerButton>
            <LayerButton
              disabled={false}
              active={align === "center"}
              onClick={() => onTextPatch({ align: "center" })}
              label={tr("Centrar")}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </LayerButton>
            <LayerButton
              disabled={false}
              active={align === "right"}
              onClick={() => onTextPatch({ align: "right" })}
              label={tr("Alinear a la derecha")}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </LayerButton>
          </div>
        </div>
      <div className="space-y-1 pt-1 border-t">
        <Label className="text-[11px] text-muted-foreground">{tr("Sombra")}</Label>
        <Select
          value={element.shadow || "none"}
          onValueChange={(val) => onTextPatch({ shadow: val as TextShadowStyle })}
        >
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={tr("Sin sombra")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{tr("Sin sombra")}</SelectItem>
            <SelectItem value="subtle">{tr("Sombra sutil")}</SelectItem>
            <SelectItem value="medium">{tr("Sombra media")}</SelectItem>
            <SelectItem value="dramatic">{tr("Sombra intensa")}</SelectItem>
            <SelectItem value="glow">{tr("Resplandor luminoso")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function LayerButton({
  disabled,
  active,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-7 px-0", active && "border-foreground/40 bg-accent text-accent-foreground")}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function TypographySection({
  slide,
  isFeatureGraphic,
  onChange,
}: {
  slide: Slide;
  isFeatureGraphic: boolean;
  onChange: (patch: Partial<Slide>) => void;
}) {
  const scales = slideFontScales(slide);
  const customized = !!cleanTypography(slide.typography);

  function patchTypography(patch: Partial<SlideTypography>) {
    onChange({
      typography: cleanTypography({ ...slide.typography, ...patch }),
    });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label className="text-xs font-semibold">{tr("Tipografía y Tamaños")}</Label>
          <p className="text-[11px] text-muted-foreground">
            {tr("Escala relativa al diseño predeterminado.")}
          </p>
        </div>
        {customized && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 gap-1 px-1.5 text-[11px] text-muted-foreground"
            onClick={() => onChange({ typography: undefined })}
            title={tr("Restablecer tamaños al 100%")}
          >
            <RotateCcw className="h-3 w-3" />
            Restablecer
          </Button>
        )}
      </div>
      {!isFeatureGraphic && (
        <FontScaleSlider
          label={tr("Etiqueta superior")}
          value={scales.labelScale}
          onChange={(value) => patchTypography({ labelScale: value })}
        />
      )}
      {isFeatureGraphic && (
        <FontScaleSlider
          label={tr("Nombre de app")}
          value={scales.appNameScale}
          onChange={(value) => patchTypography({ appNameScale: value })}
        />
      )}
      <FontScaleSlider
        label={tr(isFeatureGraphic ? "Eslogan" : "Titular")}
        value={scales.headlineScale}
        onChange={(value) => patchTypography({ headlineScale: value })}
      />

      {/* Control de Sombra de Texto */}
      <div className="space-y-1.5 pt-2 border-t">
        <Label className="text-[11px] text-muted-foreground font-medium">{tr("Sombra de los textos")}</Label>
        <Select
          value={slide.textShadow || "none"}
          onValueChange={(val) => onChange({ textShadow: val as TextShadowStyle })}
        >
          <SelectTrigger className="h-7 text-xs" aria-label={tr("Sombra de los textos")}>
            <SelectValue placeholder={tr("Sin sombra")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{tr("Sin sombra")}</SelectItem>
            <SelectItem value="subtle">{tr("Sombra sutil")}</SelectItem>
            <SelectItem value="medium">{tr("Sombra media (elevada)")}</SelectItem>
            <SelectItem value="dramatic">{tr("Sombra intensa / contraste")}</SelectItem>
            <SelectItem value="glow">Resplandor luminoso (Glow)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FontScaleSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const pct = Math.round(value * 100);
  const minPct = Math.round(FONT_SCALE_MIN * 100);
  const maxPct = Math.round(FONT_SCALE_MAX * 100);
  const defaultPct = Math.round(FONT_SCALE_DEFAULT * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1">
          <ResetButton
            visible={pct !== defaultPct}
            label={`Reset ${label.toLowerCase()} to ${defaultPct}%`}
            onClick={() => onChange(FONT_SCALE_DEFAULT)}
          />
          <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      </div>
      <input
        type="range"
        min={minPct}
        max={maxPct}
        step={5}
        value={pct}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        onDoubleClick={() => onChange(FONT_SCALE_DEFAULT)}
        className="w-full"
        aria-label={`${label} size`}
        aria-valuetext={`${pct}%`}
        title="Double-click to reset"
      />
    </div>
  );
}

/** Small inline reset affordance. Always occupies its slot so the row doesn't
 * shift when it appears. */
function ResetButton({
  visible,
  label,
  onClick,
}: {
  visible: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-5 w-5 text-muted-foreground [&_svg]:size-3", !visible && "invisible")}
      onClick={onClick}
      title={label}
      aria-label={label}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <RotateCcw />
    </Button>
  );
}

function naturalSize(src: string): Promise<{ w: number; h: number } | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    const finish = (size: { w: number; h: number } | null) => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      resolve(size);
    };
    const timeout = setTimeout(() => finish(null), 10000);
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0 ? { w: image.naturalWidth, h: image.naturalHeight } : null);
    image.onerror = () => finish(null);
    image.src = src;
  });
}

function fitToAspect(t: ElementTransform, aspect: number, maxHeight: number): ElementTransform {
  let width = t.width;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return {
    ...t,
    x: t.x + (t.width - width) / 2,
    y: t.y + (t.height - height) / 2,
    width,
    height,
  };
}

function elementLabel(id: ElementId): string {
  if (isBuiltInElementId(id)) return ELEMENT_LABEL[id];
  if (isImageElementId(id)) return "Imagen / Insignia";
  if (isMockupElementId(id)) return "Dispositivo extra";
  return "Texto";
}

function defaultZ(id: ElementId): number {
  if (isTextElementId(id)) return 5;
  if (isImageElementId(id)) return 5;
  if (isMockupElementId(id)) return 3;
  if (id === "deviceSecondary") return 2;
  if (id === "device") return 3;
  if (id === "callout") return 5;
  return 4; // caption on top
}
