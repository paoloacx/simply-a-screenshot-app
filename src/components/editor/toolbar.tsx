"use client";
import * as React from "react";
import { AlertTriangle, Check, CircleHelp, Cloud, Download, FlaskConical, FolderOpen, Languages, Redo2, RotateCcw, Sparkles, Undo2, UnfoldHorizontal, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEVICE_LABEL,
  IMPORTED_FONT_FAMILY,
  PLATFORM_DEVICES,
  SCREENSHOT_FONTS,
  ORIENTATION_PAIRS,
  THEMES,
  deviceForOrientation,
  getExportSizes,
  orientationOf,
  supportsLandscape,
  themeById,
  type ExportSize,
} from "@/lib/constants";
import { detectPlatform } from "@/lib/defaults";
import { useI18n } from "@/lib/i18n";
import { getLanguageInfo } from "@/lib/translation-languages";
import type { Device, ImportedFont, Orientation, Palette, Platform, Scene, ScreenshotFontId, Theme } from "@/lib/types";
import { ExportDialog, type ExportDeviceOption } from "./export-dialog";
import { FontImporter, type FontImporterHandle } from "./font-importer";
import { ScenePlayground } from "./scene-playground";

const IMPORT_FONT_ACTION = "__import-font__";

type Props = {
  exportSize: ExportSize;
  onExportSizeChange: (size: ExportSize) => void;
  themeId: string;
  setThemeId: (v: string) => void;
  connectedCanvas: boolean;
  setConnectedCanvas: (v: boolean) => void;
  scene: Scene | undefined;
  setScene: (scene: Scene | undefined) => void;
  onOpenStyleLab: () => void;
  projectName?: string;
  onOpenProjects?: () => void;
  fontId: ScreenshotFontId;
  setFontId: (v: ScreenshotFontId) => void;
  importedFont?: ImportedFont;
  setImportedFont: (font: ImportedFont) => void;
  locale: string;
  setLocale: (v: string) => void;
  locales: string[];
  onOpenTranslate?: () => void;
  onOpenAdapt?: () => void;
  device: Device;
  setDevice: (v: Device) => void;
  orientation: Orientation;
  setOrientation: (v: Orientation) => void;
  onExport: (devices: Device[]) => void;
  onOpenWelcome: () => void;
  devices: ExportDeviceOption[];
  onAddLanguages: () => void;
  onResetAll: () => void;
  onResetDevice: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  exporting: string | null;
  savedAt: number | null;
  saveError: string | null;
  slideCount: number;
  onRetrySave?: () => void;
  busy: boolean;
  palette?: Palette;
  onUpdatePalette?: (patch: Partial<Palette>) => void;
};

export function Toolbar(props: Props) {
  const { t, locale: uiLocale, setLocale: setUiLocale } = useI18n();
  const platform = detectPlatform(props.device);
  const hasLandscape = supportsLandscape(props.device);
  const exportSizes = getExportSizes(props.device, props.orientation);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);

  // Track last device per platform so the platform tabs preserve the user's choice.
  const lastByPlatform = React.useRef<Record<Platform, Device>>({
    ios: platform === "ios" ? props.device : "iphone",
    macos: platform === "macos" ? props.device : "mac",
    android: platform === "android" ? props.device : "android",
  });
  React.useEffect(() => {
    lastByPlatform.current[platform] = props.device;
  }, [platform, props.device]);


  const deviceLabel = t(DEVICE_LABEL[props.device]);
  // Paired orientations share one picker entry; the Orientation menu switches.
  const pickerDevice = deviceForOrientation(props.device, "portrait");
  const platformDevices = PLATFORM_DEVICES[platform].filter((d) => deviceForOrientation(d, "portrait") === d);
  const orientation = orientationOf(props.device, props.orientation);
  const activeTheme = themeById(props.themeId, props.palette);

  const fontImporter = React.useRef<FontImporterHandle>(null);
  const [importingFont, setImportingFont] = React.useState(false);
  // "Imported font" is only a choice once a file has actually been imported.
  const fontIds = (Object.keys(SCREENSHOT_FONTS) as ScreenshotFontId[]).filter(
    (id) => id !== "self-hosted" || !!props.importedFont,
  );
  const fontLabel = (id: ScreenshotFontId) =>
    id === "self-hosted" && props.importedFont?.name ? props.importedFont.name : SCREENSHOT_FONTS[id].name;
  const fontPreviewFamily = (id: ScreenshotFontId) =>
    id === "self-hosted" ? `"${IMPORTED_FONT_FAMILY}", sans-serif` : SCREENSHOT_FONTS[id].family;

  return (
    <div className="app-toolbar flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b bg-card/40 px-4 py-2">
      {props.onOpenProjects && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 max-w-44 gap-1.5 px-2 text-xs"
          onClick={props.onOpenProjects}
          disabled={props.busy}
          title={t("Proyectos: abrir, crear, duplicar, importar y exportar (⌘S guarda)")}
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{props.projectName || t("Proyectos")}</span>
        </Button>
      )}

      <span aria-hidden className="mx-1 h-5 w-px bg-border" />

      <Button
        type="button"
        variant={props.connectedCanvas ? "secondary" : "outline"}
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        onClick={() => props.setConnectedCanvas(!props.connectedCanvas)}
        aria-pressed={props.connectedCanvas}
        title={
          props.connectedCanvas
            ? t("Lienzo continuo conectado activo")
            : t("Pantallas aisladas; activa para que los elementos puedan cruzar pantallas")
        }
        disabled={props.busy}
      >
        <UnfoldHorizontal className="h-3.5 w-3.5" />
        {props.connectedCanvas ? t("Conectado") : t("Aislado")}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        onClick={props.onOpenStyleLab}
        disabled={props.busy}
        title={t("Laboratorio de Estilos: compara looks completos lado a lado")}
      >
        <FlaskConical className="h-3.5 w-3.5" />
        {t("Estilos")}
      </Button>
      <ScenePlayground scene={props.scene} theme={activeTheme} disabled={props.busy} straightDevices={props.device.startsWith("duo-")} onChange={props.setScene} />

      {/* Selector de Paleta armónica y los 3 Colores (Base, Secundario, Extra) */}
      <div className="flex items-center gap-1 rounded-md border bg-card/60 p-0.5">
        <Select
          value={activeTheme.id}
          onValueChange={(val) => {
            props.setThemeId(val);
            const chosen = THEMES[val];
            if (chosen && props.onUpdatePalette) {
              props.onUpdatePalette({
                base: chosen.bg,
                secondary: chosen.bgAlt,
                extra: chosen.accent,
              });
            }
          }}
          disabled={props.busy}
        >
          <SelectTrigger className="h-7 w-38 border-none bg-transparent px-2 text-xs shadow-none" title={t("Paletas armónicas")} aria-label={t("Paletas armónicas")}>
            <SelectValue>
              <ThemeOption theme={activeTheme} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-96">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("Neutros y Básicos")}
            </div>
            {Object.values(THEMES)
              .filter((t) => t.group === "neutro")
              .map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <ThemeOption theme={theme} />
                </SelectItem>
              ))}
            <SelectSeparator className="my-1" />
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("Colores Vivos")}
            </div>
            {Object.values(THEMES)
              .filter((t) => t.group === "color")
              .map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <ThemeOption theme={theme} />
                </SelectItem>
              ))}
            <SelectSeparator className="my-1" />
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("Esquemas Bicolores")}
            </div>
            {Object.values(THEMES)
              .filter((t) => t.group === "bicolor")
              .map((theme) => (
                <SelectItem key={theme.id} value={theme.id}>
                  <ThemeOption theme={theme} />
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <span aria-hidden className="h-4 w-px bg-border/80" />

        {/* 3 Colores interactivos de la paleta */}
        <div className="flex items-center gap-1 px-1">
          {/* Color Base */}
          <label
            className="group relative flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-muted"
            title={t("Color Base (fondo): {color}. Haz clic para editar.", { color: activeTheme.bg })}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/25 shadow-xs transition-transform group-hover:scale-110"
              style={{ backgroundColor: activeTheme.bg }}
            />
            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">{t("Base")}</span>
            <input
              type="color"
              value={activeTheme.bg}
              disabled={props.busy}
              onChange={(e) => props.onUpdatePalette?.({ base: e.target.value.toUpperCase() })}
              className="sr-only"
            />
          </label>

          {/* Color Secundario */}
          <label
            className="group relative flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-muted"
            title={t("Color Secundario (degradado / invertido): {color}. Haz clic para editar.", { color: activeTheme.bgAlt })}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/25 shadow-xs transition-transform group-hover:scale-110"
              style={{ backgroundColor: activeTheme.bgAlt }}
            />
            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">{t("Sec.")}</span>
            <input
              type="color"
              value={activeTheme.bgAlt}
              disabled={props.busy}
              onChange={(e) => props.onUpdatePalette?.({ secondary: e.target.value.toUpperCase() })}
              className="sr-only"
            />
          </label>

          {/* Color Extra */}
          <label
            className="group relative flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-muted"
            title={t("Color Extra (acento / etiqueta): {color}. Haz clic para editar.", { color: activeTheme.accent })}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/25 shadow-xs transition-transform group-hover:scale-110"
              style={{ backgroundColor: activeTheme.accent }}
            />
            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">{t("Extra")}</span>
            <input
              type="color"
              value={activeTheme.accent}
              disabled={props.busy}
              onChange={(e) => props.onUpdatePalette?.({ extra: e.target.value.toUpperCase() })}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <Select
        value={props.fontId}
        onValueChange={(fontId) => {
          if (fontId === IMPORT_FONT_ACTION) fontImporter.current?.open();
          else props.setFontId(fontId as ScreenshotFontId);
        }}
        disabled={props.busy || importingFont}
      >
        <SelectTrigger className="h-8 w-40 text-xs" title={t("Tipografía")} aria-label={t("Tipografía")}>
          <SelectValue placeholder={t("Tipografía")}>
            <span className="truncate">{importingFont ? t("Importando…") : t(fontLabel(props.fontId))}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {fontIds.map((id) => (
            <SelectItem key={id} value={id}>
              <span style={{ fontFamily: fontPreviewFamily(id) }}>{t(fontLabel(id))}</span>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={IMPORT_FONT_ACTION}>
            <span className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {props.importedFont ? t("Reemplazar tipografía…") : t("Importar archivo .ttf/.woff2…")}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <FontImporter ref={fontImporter} onImported={props.setImportedFont} onUploadingChange={setImportingFont} />

      <span aria-hidden className="mx-1 h-5 w-px bg-border" />

      <Tabs
        value={platform}
        onValueChange={(p) => {
          if (props.busy) return;
          const next = lastByPlatform.current[p as Platform];
          props.setDevice(next);
        }}
      >
        <TabsList className="h-8 p-0.5">
          <TabsTrigger value="ios" className="h-7 px-3 text-xs" disabled={props.busy}>
            iOS
          </TabsTrigger>
          <TabsTrigger value="macos" className="h-7 px-3 text-xs" disabled={props.busy}>
            Mac
          </TabsTrigger>
          <TabsTrigger value="android" className="h-7 px-3 text-xs" disabled={props.busy}>
            Android
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Mac has a single device, so the tab alone says which deck is open. */}
      {platformDevices.length > 1 && (
        <Select
          value={pickerDevice}
          onValueChange={(v) => {
            // This list only contains portrait deck names, so selecting one
            // must open that portrait deck. Landscape stays on its own entry
            // and the orientation control.
            props.setDevice(v as Device);
          }}
          disabled={props.busy}
        >
          <SelectTrigger className="h-8 w-36 text-xs" aria-label={t("Dispositivo")} title={t("Dispositivo")}>
            <SelectValue placeholder={t("Dispositivo")}>{t(DEVICE_LABEL[pickerDevice])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {platformDevices.map((d) => (
              <SelectItem key={d} value={d}>{t(DEVICE_LABEL[d])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasLandscape && (
        <Select
          value={orientation}
          onValueChange={(v) => props.setOrientation(v as Orientation)}
          disabled={props.busy}
        >
          <SelectTrigger className="h-8 w-28 text-xs" aria-label={t("Orientación")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">{t("Vertical")}</SelectItem>
            <SelectItem value="landscape">{t("Horizontal")}</SelectItem>
          </SelectContent>
        </Select>
      )}

      {props.onOpenAdapt && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={props.onOpenAdapt}
          disabled={props.busy}
          className="h-8 gap-1.5 px-2 text-xs font-medium border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-foreground"
          title={t("Adaptar diseño: transfiere textos, colores y capturas de otro dispositivo a este formato")}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="hidden md:inline">{t("Adaptar")}</span>
        </Button>
      )}

      <div className="flex items-center gap-1.5">
        <Select value={props.locale} onValueChange={props.setLocale} disabled={props.busy}>
          <SelectTrigger className="h-8 min-w-[105px] text-xs gap-1.5" aria-label={t("Idioma de vista")}>
            <SelectValue>
              {(() => {
                const info = getLanguageInfo(props.locale);
                return (
                  <span className="flex items-center gap-1.5 font-medium">
                    <span>{info.flag}</span>
                    <span>{info.code.toUpperCase()}</span>
                  </span>
                );
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {props.locales.map((l) => {
              const info = getLanguageInfo(l);
              return (
                <SelectItem key={l} value={l}>
                  <div className="flex items-center gap-2">
                    <span>{info.flag}</span>
                    <span className="font-medium">{info.code.toUpperCase()}</span>
                    <span className="text-muted-foreground text-xs font-normal">({info.name})</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {props.onOpenTranslate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={props.onOpenTranslate}
            disabled={props.busy}
            className="h-8 gap-1.5 text-xs font-medium border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-foreground"
            title={t("Traducir automáticamente a 5 idiomas (Inglés, Francés, Alemán, Chino, Hindi)")}
          >
            <Languages className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">{t("Traducir")}</span>
            <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-bold text-primary">5</span>
          </Button>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs font-medium"
          onClick={() => setUiLocale(uiLocale === "en" ? "es" : "en")}
          title={t("Idioma de la interfaz")}
          aria-label={t("Idioma de la interfaz")}
        >
          <Languages className="h-3.5 w-3.5" />
          {uiLocale.toUpperCase()}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={props.onOpenWelcome}
          title={t("Guía de bienvenida")}
          aria-label={t("Guía de bienvenida")}
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
        <SaveStatus savedAt={props.savedAt} saveError={props.saveError} />
        {props.saveError && props.onRetrySave && (
          <Button variant="ghost" size="sm" disabled={props.busy} onClick={props.onRetrySave}>{t("Reintentar")}</Button>
        )}
        <span aria-hidden className="h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={props.onUndo}
          title={t("Deshacer (⌘Z)")}
          aria-label={t("Deshacer")}
          disabled={props.busy || !props.canUndo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={props.onRedo}
          title={t("Rehacer (⌘⇧Z)")}
          aria-label={t("Rehacer")}
          disabled={props.busy || !props.canRedo}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setResetOpen(true)}
          title={t("Restablecer pantallas a valores predeterminados")}
          aria-label={t("Restablecer")}
          disabled={props.busy}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        {exportSizes.length > 1 && (
          <Select
            value={`${props.exportSize.w}x${props.exportSize.h}`}
            onValueChange={(value) => {
              const next = exportSizes.find((size) => `${size.w}x${size.h}` === value);
              if (next) props.onExportSizeChange(next);
            }}
            disabled={!!props.exporting}
          >
            <SelectTrigger
              className="h-8 w-[218px] text-xs"
              title={t("Tamaño de exportación (el primero es el que pide la tienda)")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exportSizes.map((size) => (
                <SelectItem key={`${size.w}x${size.h}`} value={`${size.w}x${size.h}`}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          onClick={() => setExportOpen(true)}
          disabled={!!props.exporting || importingFont}
          size="sm"
          className="h-8 font-medium"
          title={t("Exportar las capturas de este dispositivo en un ZIP (todos los idiomas)")}
        >
          <Download className="h-4 w-4" />
          {props.exporting ? t("Exportando {progress}", { progress: props.exporting }) : t("Exportar lote (ZIP)")}
        </Button>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("¿Restablecer a valores iniciales?")}</DialogTitle>
            <DialogDescription>
              {t("Elige si deseas restablecer únicamente {device} o todos los dispositivos. Se perderán las capturas subidas y los cambios no guardados.", { device: deviceLabel })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(false)}>
              {t("Cancelar")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResetOpen(false);
                props.onResetDevice();
              }}
            >
              {t("Solo {device}", { device: deviceLabel })}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setResetOpen(false);
                props.onResetAll();
              }}
            >
              {t("Restablecer todo")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        projectName={props.projectName || t("Sin título")}
        devices={props.devices}
        currentDevice={props.device}
        locales={props.locales}
        onExport={props.onExport}
        onAddLanguages={() => {
          setExportOpen(false);
          props.onOpenTranslate?.();
        }}
      />
    </div>
  );
}

function ThemeOption({ theme }: { theme: Theme }) {
  const { t } = useI18n();
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="flex h-3.5 w-6 shrink-0 items-stretch overflow-hidden rounded-xs border border-black/25 shadow-xs"
      >
        <span className="flex-1" style={{ backgroundColor: theme.bg }} title={t("Color Base")} />
        <span className="flex-1" style={{ backgroundColor: theme.bgAlt }} title={t("Color Secundario")} />
        <span className="w-1.5" style={{ backgroundColor: theme.accent }} title={t("Color Extra")} />
      </span>
      <span className="truncate">{t(theme.name)}</span>
    </span>
  );
}

function SaveStatus({ savedAt, saveError }: { savedAt: number | null; saveError: string | null }) {
  const { t } = useI18n();
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  if (saveError) {
    return (
      <span
        className="flex items-center gap-1 text-xs text-destructive"
        title={saveError}
      >
        <AlertTriangle className="h-3.5 w-3.5" /> {t("error al guardar")}
      </span>
    );
  }

  if (!savedAt) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground" title={t("Aún no guardado")}>
        <Cloud className="h-3.5 w-3.5" /> <span className="hidden 2xl:inline">{t("sin guardar")}</span>
      </span>
    );
  }
  const seconds = Math.max(0, Math.round((Date.now() - savedAt) / 1000));
  const label =
    seconds < 5
      ? t("guardado")
      : seconds < 60
        ? t("hace {n}s", { n: seconds })
        : seconds < 3600
          ? t("hace {n}m", { n: Math.round(seconds / 60) })
          : t("hace {n}h", { n: Math.round(seconds / 3600) });
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title={t("Proyecto guardado {label}", { label })}>
      <Check className="h-3.5 w-3.5 text-green-500" /> <span className="hidden 2xl:inline">{label}</span>
    </span>
  );
}
