"use client";
import * as React from "react";
import JSZip from "jszip";
import { Toaster, toast } from "sonner";
import { Info, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SCREENSHOT_FONT_ID,
  DEVICE_LABEL,
  deviceForOrientation,
  getExportSizes,
  hasTheme,
  orientationOf,
  IMPORTED_FONT_FAMILY,
  SCREENSHOT_FONTS,
  supportsLandscape,
  themeById,
  type ExportSize,
} from "@/lib/constants";
import { detectPlatform, nid } from "@/lib/defaults";
import { onElectronBeforeClose } from "@/lib/electron-bridge";
import { t as tr, useI18n } from "@/lib/i18n";
import { imageElementKey, isBuiltInElementId, isImageElementId, isMockupElementId, isTextElementId, mockupElementKey, textElementKey } from "@/lib/elements";
import { renderSlide } from "@/lib/export-render";
import { exportAssetPaths } from "@/lib/export-assets";
import { DUO_COMPANION, duoGeometry, frameAssetPaths, isDuoDevice, setFrameAssets, type FrameFile, type MeasuredFrame } from "@/lib/frame-assets";
import { didFail, preloadImages } from "@/lib/image-cache";
import { resolveScreenshot, writeLocalized } from "@/lib/locale";
import { ingestScreenshotFile } from "@/lib/screenshot-upload";
import { useProject } from "@/lib/storage";
import type {
  BuiltInElementId,
  Device,
  DeviceElement,
  ElementId,
  ElementTransform,
  ImageElement,
  ImportedFont,
  Palette,
  SelectedElement,
  ProjectState,
  Slide,
} from "@/lib/types";
import { Inspector } from "./inspector";
import { PreviewStage } from "./preview-stage";
import { Sidebar } from "./sidebar";
import { DUO_FIT_TOLERANCE, captureFits } from "./device-frames";
import { DeckCanvas, getCanvas } from "./slide-canvas";
import { AppInfoDialog } from "./app-info-dialog";
import { OnboardingDialog } from "./onboarding-dialog";
import { ProjectsDialog } from "./projects-dialog";
import { StyleLab } from "./style-lab";
import { Toolbar } from "./toolbar";
import { TranslateDialog } from "./translate-dialog";
import { AdaptDialog, AdaptPromptDialog } from "./adapt-dialog";
import { adaptSlidesForDevice, findPrimaryCustomizedDevice, isStarterDeck, type AdaptOptions } from "@/lib/adapt-slides";

export function ScreenshotEditor() {
  const { state, setState, project, flush, reloadProject, hydrated, savedAt, saveError, retrySave, reset, resetDevice, undo, redo, canUndo, canRedo } = useProject();
  const { locale: uiLocale } = useI18n();

  // The Electron shell waits for this before closing the window (Cmd+Q or the
  // red button), so edits inside the autosave debounce are not lost.
  React.useEffect(() => {
    onElectronBeforeClose(() => flush());
  }, [flush]);

  const [activeSlideId, setActiveSlideId] = React.useState<string | null>(null);
  const [selectedElement, setSelectedElement] = React.useState<SelectedElement | null>(null);
  const [exporting, setExporting] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [adaptDialogOpen, setAdaptDialogOpen] = React.useState(false);
  const [adaptPromptOpen, setAdaptPromptOpen] = React.useState(false);
  const [pendingDeviceSwitch, setPendingDeviceSwitch] = React.useState<{
    sourceDevice: Device;
    targetDevice: Device;
  } | null>(null);
  const framesLoaded = useFrameAssets();
  const [, refreshAssets] = React.useReducer((version: number) => version + 1, 0);
  const [exportLocaleOverride, setExportLocaleOverride] = React.useState<string | null>(null);
  const [exportSlideIndex, setExportSlideIndex] = React.useState(0);
  const exportInProgress = React.useRef(false);
  const [exportProject, setExportProject] = React.useState<ProjectState | null>(null);
  // One size is selected at a time. The first entry per device is the size the
  // store requires, so a fresh project exports the right file by default; the
  // choice is remembered per device.
  const [exportSize, setExportSize] = React.useState<ExportSize>(
    () => getExportSizes("iphone", "portrait")[0],
  );
  const exportSizes = React.useMemo(
    () => getExportSizes(state.device, state.orientation),
    [state.device, state.orientation],
  );
  React.useEffect(() => {
    if (!exportSizes.length) return;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(`capturas:export-size:${state.device}`);
    } catch {
      // Sin almacenamiento: se usa el tamaño obligatorio.
    }
    const [w, h] = (saved || "").split("x").map(Number);
    const next = exportSizes.find((size) => size.w === w && size.h === h) ?? exportSizes[0];
    setExportSize((prev) =>
      prev.w === next.w && prev.h === next.h ? prev : next,
    );
  }, [exportSizes, state.device]);
  const activeExportSize =
    exportSizes.find((size) => size.w === exportSize.w && size.h === exportSize.h) ??
    exportSizes[0];
  const changeExportSize = React.useCallback(
    (size: ExportSize) => {
      setExportSize(size);
      try {
        window.localStorage.setItem(
          `capturas:export-size:${state.device}`,
          `${size.w}x${size.h}`,
        );
      } catch {
        // Sin almacenamiento: la elección dura la sesión.
      }
    },
    [state.device],
  );
  const exportRef = React.useRef<HTMLDivElement | null>(null);
  const [styleLabOpen, setStyleLabOpen] = React.useState(false);
  const [projectsOpen, setProjectsOpen] = React.useState(false);
  const [translateOpen, setTranslateOpen] = React.useState(false);
  const [welcomeOpen, setWelcomeOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  // Barras laterales plegables; la elección se recuerda entre sesiones.
  const [leftOpen, setLeftOpen] = React.useState(true);
  const [rightOpen, setRightOpen] = React.useState(true);
  React.useEffect(() => {
    try {
      if (localStorage.getItem("capturas:left-open") === "0") setLeftOpen(false);
      if (localStorage.getItem("capturas:right-open") === "0") setRightOpen(false);
    } catch { /* sin almacenamiento: se queda abierta */ }
  }, []);
  const toggleSide = React.useCallback((side: "left" | "right") => {
    const setter = side === "left" ? setLeftOpen : setRightOpen;
    setter((open) => {
      try { localStorage.setItem(`capturas:${side}-open`, open ? "0" : "1"); } catch { /* ignore */ }
      return !open;
    });
  }, []);
  // The latest committed project, for actions that must check nothing changed since.
  const latestState = React.useRef(state);
  latestState.current = state;

  const currentSlides = state.slidesByDevice[state.device] || [];
  // The project name is the app name: the old separate input duplicated it and
  // left the feature graphic with a stale value.
  const displayAppName = project?.name || state.appName;
  const primaryCustomSource = React.useMemo(() => {
    return findPrimaryCustomizedDevice(state.slidesByDevice, state.device);
  }, [state.slidesByDevice, state.device]);

  const currentIsStarter = React.useMemo(() => {
    return isStarterDeck(currentSlides);
  }, [currentSlides]);

  const activeSlide =
    currentSlides.find((s) => s.id === activeSlideId) || currentSlides[0] || null;
  const theme = themeById(state.themeId, state.palette);
  const onUpdatePalette = React.useCallback(
    (patch: Partial<Palette>) => {
      setState((p) => {
        const cur = p.palette || {
          base: theme.bg,
          secondary: theme.bgAlt,
          extra: theme.accent,
        };
        return {
          ...p,
          palette: { ...cur, ...patch },
        };
      });
    },
    [theme.bg, theme.bgAlt, theme.accent, setState],
  );
  const fontId = state.fontId || DEFAULT_SCREENSHOT_FONT_ID;
  const fontFamily = SCREENSHOT_FONTS[fontId].family;
  useImportedFontFace(state.importedFont);

  React.useEffect(() => {
    if (selectedElement && selectedElement.slideId !== activeSlide?.id) {
      setSelectedElement(null);
    }
  }, [activeSlide?.id, selectedElement]);

  React.useEffect(() => {
    if (!hydrated) return;
    // Pin the default selection to its ID before reordering can change index 0.
    // A deleted/undone screen falls back to the first remaining screen.
    if (!currentSlides.some((slide) => slide.id === activeSlideId)) {
      setActiveSlideId(currentSlides[0]?.id ?? null);
    }
  }, [hydrated, currentSlides, activeSlideId]);

  React.useEffect(() => {
    // Undo can restore a device whose orientation differs from the current one.
    const expected = supportsLandscape(state.device) ? orientationOf(state.device, state.orientation) : "portrait";
    if (state.orientation !== expected) {
      setState((p) => ({ ...p, orientation: expected }), { history: false });
    }
  }, [state.device, state.orientation, setState]);

  React.useEffect(() => {
    if (hydrated && state.themeId && !hasTheme(state.themeId)) {
      toast.warning("Using fallback theme", {
        description: `Theme "${state.themeId}" is not defined in src/lib/constants.ts.`,
        duration: 8000,
      });
    }
  }, [hydrated, state.themeId]);

  const assetPaths = React.useMemo(() => {
    const paths = new Set<string>();
    paths.add("/mockup.png");
    // Only the open deck's bezel: each is a large PNG, and export preloads its
    // own device's bezel before capturing.
    for (const path of frameAssetPaths(state.device)) paths.add(path);
    if (state.appIcon) paths.add(state.appIcon);
    // Preload every locale variant so bulk export doesn't race image loads.
    const allSlides: Slide[] = Object.values(state.slidesByDevice).flat();
    for (const s of allSlides) {
      for (const raw of [s.screenshot, s.screenshotSecondary]) {
        if (!raw) continue;
        // Inline (data URI) captures are decoded too, so their size is known
        // after a reload and a mismatched Duo capture is still flagged.
        if (raw.startsWith("data:")) { paths.add(raw); continue; }
        if (raw.includes("{locale}")) {
          for (const loc of state.locales) paths.add(resolveScreenshot(raw, loc));
        } else {
          paths.add(raw);
        }
      }
      for (const imageElement of s.imageElements || []) {
        if (imageElement.src && !imageElement.src.startsWith("data:")) paths.add(imageElement.src);
      }
      for (const dev of s.deviceElements || []) {
        if (!dev.screenshot) continue;
        if (dev.screenshot.startsWith("data:")) { paths.add(dev.screenshot); continue; }
        if (dev.screenshot.includes("{locale}")) {
          for (const loc of state.locales) paths.add(resolveScreenshot(dev.screenshot, loc));
        } else {
          paths.add(dev.screenshot);
        }
      }
    }
    return Array.from(paths).sort();
  }, [state.slidesByDevice, state.appIcon, state.locales, state.device, framesLoaded]);
  // Inline captures can be megabytes long; a length and tail stand in for them.
  const assetSig = assetPaths.map((p) => (p.startsWith("data:") ? `data:${p.length}:${p.slice(-48)}` : p)).join("|");

  React.useEffect(() => {
    // Wait for the bezel measurements, so the first paint already has the
    // open deck's bezel cached instead of swapping it in under the user.
    if (!hydrated || !framesLoaded) return;
    let cancelled = false;
    preloadImages(assetPaths).finally(() => {
      if (!cancelled) { setReady(true); refreshAssets(); }
    });
    return () => { cancelled = true; };
    // assetPaths is derived from assetSig; depending on the string keeps the
    // effect from re-firing when slidesByDevice churns without path changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, framesLoaded, assetSig]);

  // Surface storage failures (quota exceeded etc.) so the user knows their work isn't safe.
  React.useEffect(() => {
    if (saveError) {
      toast.error("Couldn't load or save project file", {
        description: saveError,
        duration: 8000,
      });
    }
  }, [saveError]);

  // ---------- Mutations ----------

  const patchSlide = React.useCallback(
    (id: string, patch: Partial<Slide>) => {
      setState((prev) => ({
        ...prev,
        slidesByDevice: {
          ...prev.slidesByDevice,
          [state.device]: (prev.slidesByDevice[state.device] || []).map((s) =>
            s.id === id ? { ...s, ...patch } : s,
          ),
        },
      }));
    },
    [setState, state.device],
  );

  const updateSlide = React.useCallback(
    (id: string, update: (slide: Slide) => Partial<Slide>) => {
      setState((prev) => ({
        ...prev,
        slidesByDevice: {
          ...prev.slidesByDevice,
          [state.device]: (prev.slidesByDevice[state.device] || []).map((s) =>
            s.id === id ? { ...s, ...update(s) } : s,
          ),
        },
      }));
    },
    [setState, state.device],
  );

  const reorderSlides = React.useCallback(
    (next: Slide[]) => {
      setState((prev) => ({
        ...prev,
        slidesByDevice: { ...prev.slidesByDevice, [prev.device]: next },
      }), { coalesce: false });
    },
    [setState],
  );

  const deleteSlide = React.useCallback(
    (id: string) => {
      const dev = state.device;
      const slides = state.slidesByDevice[dev] || [];
      const idx = slides.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const snap = slides[idx];
      const fallback = slides[idx + 1] || slides[idx - 1] || null;

      setState((prev) => {
        const cur = prev.slidesByDevice[dev] || [];
        return {
          ...prev,
          slidesByDevice: { ...prev.slidesByDevice, [dev]: cur.filter((s) => s.id !== id) },
        };
      }, { coalesce: false });
      setActiveSlideId((cur) => (cur === id ? fallback?.id || null : cur));

      toast("Screen deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            setState((prev) => {
              const cur = prev.slidesByDevice[dev] || [];
              if (cur.some((s) => s.id === snap.id)) return prev;
              const restored = [...cur.slice(0, idx), snap, ...cur.slice(idx)];
              return {
                ...prev,
                slidesByDevice: { ...prev.slidesByDevice, [dev]: restored },
              };
            }, { coalesce: false });
            setActiveSlideId(snap.id);
          },
        },
        duration: 6000,
      });
    },
    [setState, state.device, state.slidesByDevice],
  );

  const addSlide = React.useCallback(
    (slide: Slide) => {
      setState((prev) => ({
        ...prev,
        slidesByDevice: {
          ...prev.slidesByDevice,
          [prev.device]: [...(prev.slidesByDevice[prev.device] || []), slide],
        },
      }), { coalesce: false });
      setActiveSlideId(slide.id);
    },
    [setState],
  );

  const patchLocalized = React.useCallback(
    (slide: Slide, key: "label" | "headline", value: string) => {
      patchSlide(slide.id, {
        [key]: writeLocalized(slide[key], state.locale, value),
      } as Partial<Slide>);
    },
    [patchSlide, state.locale],
  );

  const patchElementTransform = React.useCallback(
    (slideId: string, elementId: ElementId, transform: ElementTransform) => {
      setState((prev) => ({
        ...prev,
        slidesByDevice: {
          ...prev.slidesByDevice,
          [prev.device]: (prev.slidesByDevice[prev.device] || []).map((slide) => {
            if (slide.id !== slideId) return slide;
            if (isTextElementId(elementId)) {
              const textId = textElementKey(elementId);
              return {
                ...slide,
                textElements: (slide.textElements || []).map((element) =>
                  element.id === textId ? { ...element, transform } : element,
                ),
              };
            }
            if (isImageElementId(elementId)) {
              const imageId = imageElementKey(elementId);
              return {
                ...slide,
                imageElements: (slide.imageElements || []).map((element) =>
                  element.id === imageId ? { ...element, transform } : element,
                ),
              };
            }
            if (isMockupElementId(elementId)) {
              const mockupId = mockupElementKey(elementId);
              return {
                ...slide,
                deviceElements: (slide.deviceElements || []).map((element) =>
                  element.id === mockupId ? { ...element, transform } : element,
                ),
              };
            }
            if (!isBuiltInElementId(elementId)) return slide;
            return {
              ...slide,
              transforms: {
                ...(slide.transforms || {}),
                [elementId]: transform,
              } as Partial<Record<BuiltInElementId, ElementTransform>>,
            };
          }),
        },
      }));
    },
    [setState],
  );

  const patchTextElementText = React.useCallback(
    (slideId: string, textId: string, value: string) => {
      setState((prev) => ({
        ...prev,
        slidesByDevice: {
          ...prev.slidesByDevice,
          [prev.device]: (prev.slidesByDevice[prev.device] || []).map((slide) =>
            slide.id === slideId
              ? {
                  ...slide,
                  textElements: (slide.textElements || []).map((element) =>
                    element.id === textId
                      ? { ...element, text: writeLocalized(element.text, prev.locale, value) }
                      : element,
                  ),
                }
              : slide,
          ),
        },
      }));
    },
    [setState],
  );

  const handleDropScreenshot = React.useCallback(
    async (slideId: string, elementId: ElementId, file: File) => {
      try {
        const src = await ingestScreenshotFile(file);
        if (isMockupElementId(elementId)) {
          const mockupId = mockupElementKey(elementId);
          updateSlide(slideId, (s) => ({
            deviceElements: (s.deviceElements || []).map((dev) =>
              dev.id === mockupId ? { ...dev, screenshot: src } : dev,
            ),
          }));
          toast.success(tr("Captura asignada al dispositivo"));
          return;
        }
        if (elementId === "deviceSecondary") {
          updateSlide(slideId, () => ({ screenshotSecondary: src }));
          toast.success(tr("Captura secundaria asignada"));
          return;
        }
        updateSlide(slideId, () => ({ screenshot: src }));
        toast.success("Captura asignada al dispositivo");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tr("Error al cargar la captura"));
      }
    },
    [updateSlide],
  );

  const duplicateSlide = React.useCallback(
    (id: string) => {
      let newId: string | null = null;
      setState((prev) => {
        const slides = prev.slidesByDevice[prev.device] || [];
        const idx = slides.findIndex((s) => s.id === id);
        if (idx === -1) return prev;
        const src = slides[idx];
        newId = nid();
        const copy: Slide = {
          ...src,
          id: newId,
          label: { ...src.label },
          headline: { ...src.headline },
          transforms: src.transforms
            ? Object.fromEntries(
                Object.entries(src.transforms).map(([key, value]) => [key, { ...value }]),
              )
            : undefined,
          textElements: src.textElements?.map((element) => ({
            ...element,
            id: nid(),
            text: { ...element.text },
            transform: { ...element.transform },
          })),
          imageElements: src.imageElements?.map((element): ImageElement => ({
            ...element,
            id: nid(),
            transform: { ...element.transform },
          })),
          deviceElements: src.deviceElements?.map((element): DeviceElement => ({
            ...element,
            id: nid(),
            transform: { ...element.transform },
          })),
        };
        const next = [...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)];
        return {
          ...prev,
          slidesByDevice: { ...prev.slidesByDevice, [prev.device]: next },
        };
      }, { coalesce: false });
      if (newId) setActiveSlideId(newId);
    },
    [setState],
  );

  // ---------- Keyboard shortcuts ----------

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inTextField = isTextEditable(target);
      const inControl =
        inTextField || (!!target && (target.tagName === "INPUT" || target.tagName === "SELECT"));
      if (exportInProgress.current || e.defaultPrevented) return;
      // Radix menus/dialogs and dnd-kit own keyboard navigation while active.
      if (target?.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"], [role="tablist"], [aria-roledescription="sortable"]')) return;

      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        void flush().then(() => toast.success(tr("Proyecto guardado")));
        return;
      }

      if (e.key === "Escape") {
        setSelectedElement(null);
        if (target && "blur" in target && typeof target.blur === "function") target.blur();
        return;
      }

      // Undo/redo belongs to the text field while one is focused.
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.altKey && (e.key === "z" || e.key === "Z" || e.key === "y" || e.key === "Y")) {
        if (inTextField) return;
        e.preventDefault();
        if (e.key === "y" || e.key === "Y" || e.shiftKey) redo();
        else undo();
        return;
      }

      // Arrow keys, deletion etc. keep their native meaning inside any input.
      if (inControl) return;

      if (!currentSlides.length) return;
      const idx = activeSlide ? currentSlides.findIndex((s) => s.id === activeSlide.id) : -1;
      if (e.key === "ArrowDown" || (e.key === "j" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        const next = currentSlides[Math.min(currentSlides.length - 1, idx + 1)];
        if (next) setActiveSlideId(next.id);
      } else if (e.key === "ArrowUp" || (e.key === "k" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        const next = currentSlides[Math.max(0, idx - 1)];
        if (next) setActiveSlideId(next.id);
      } else if ((e.key === "d" || e.key === "D") && (e.metaKey || e.ctrlKey)) {
        if (activeSlide) {
          e.preventDefault();
          duplicateSlide(activeSlide.id);
        }
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (mod) {
          if (activeSlide) {
            e.preventDefault();
            deleteSlide(activeSlide.id);
          }
        } else if (selectedElement && activeSlide && selectedElement.slideId === activeSlide.id) {
          const elId = selectedElement.elementId;
          if (elId === "device") {
            e.preventDefault();
            updateSlide(activeSlide.id, (s) => ({ ...s, hideBaseDevice: true }));
            setSelectedElement(null);
          } else if (elId.startsWith("mockup:")) {
            e.preventDefault();
            const id = elId.slice("mockup:".length);
            updateSlide(activeSlide.id, (s) => ({
              ...s,
              deviceElements: (s.deviceElements || []).filter((m) => m.id !== id),
            }));
            setSelectedElement(null);
          } else if (elId.startsWith("image:")) {
            e.preventDefault();
            const id = elId.slice("image:".length);
            updateSlide(activeSlide.id, (s) => ({
              ...s,
              imageElements: (s.imageElements || []).filter((m) => m.id !== id),
            }));
            setSelectedElement(null);
          } else if (elId.startsWith("text:")) {
            e.preventDefault();
            const id = elId.slice("text:".length);
            updateSlide(activeSlide.id, (s) => ({
              ...s,
              textElements: (s.textElements || []).filter((t) => t.id !== id),
            }));
            setSelectedElement(null);
          } else if (elId === "callout") {
            e.preventDefault();
            updateSlide(activeSlide.id, (s) => ({ ...s, callout: undefined }));
            setSelectedElement(null);
          }
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSlide, currentSlides, duplicateSlide, deleteSlide, exporting, undo, redo, flush, selectedElement, updateSlide]);

  // ---------- Export ----------

  // Wait two animation frames so React's render → browser layout/paint of the
  // off-screen container settles before html-to-image snapshots it. One frame
  // is occasionally not enough on slower machines.
  const waitForPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  async function exportAll(selectedDevices: Device[] = [state.device]) {
    if (exportInProgress.current) return;
    exportInProgress.current = true;
    setExporting("Preparing…");
    setExportProject(state);
    try {
      await generateBundle(selectedDevices);
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setExportLocaleOverride(null);
      setExportProject(null);
      setExporting(null);
      exportInProgress.current = false;
    }
  }

  async function generateBundle(selectedDevices: Device[]) {
    const locales = state.locales;
    if (!locales.length) {
      toast.error(tr("No hay idiomas configurados"));
      return;
    }

    const plans = selectedDevices
      .map((device) => {
        const orientation = orientationOf(device, state.orientation);
        const slides = state.slidesByDevice[device] || [];
        const required = getExportSizes(device, orientation)[0];
        const size =
          device === state.device
            ? exportSizes.find((s) => s.w === exportSize.w && s.h === exportSize.h) ?? required
            : required;
        const { cW, cH } = getCanvas(device, orientation);
        return { device, orientation, slides, size, cW, cH };
      })
      .filter((plan) => plan.slides.length > 0 && Boolean(plan.size));

    if (!plans.length) {
      toast.error(tr("No hay pantallas para exportar"));
      return;
    }

    // Preload every image used by every selected deck before snapshotting.
    const allPaths = new Set<string>();
    for (const plan of plans) {
      for (const path of exportAssetPaths({ ...state, device: plan.device })) allPaths.add(path);
    }
    await preloadImages([...allPaths], { retryFailed: true });
    const missingPaths = [...allPaths].filter(didFail);
    if (missingPaths.length) {
      throw new Error(`Images could not be loaded: ${missingPaths.slice(0, 3).join(", ")}`);
    }
    await waitForPaint();

    // Make sure custom fonts are loaded before snapshot so typography in PNG
    // matches what's on screen.
    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          (async () => {
            if (fontId === "self-hosted") await document.fonts.load(`64px ${fontFamily}`);
            await document.fonts.ready;
          })(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Font loading timed out")), 15000);
          }),
        ]);
      } catch {
        throw new Error("The screenshot font could not be loaded. Check the imported font file and connection, then retry.");
      } finally {
        clearTimeout(timeout);
      }
    }

    const zip = new JSZip();
    const totalRenders = plans.reduce((n, plan) => n + plan.slides.length * locales.length, 0);
    const totalUnits = totalRenders;
    let render = 0;
    let okCount = 0;
    let failed = 0;
    const errors: string[] = [];
    const incomplete: string[] = [];

    // Render each screen once per locale at canvas resolution. The hidden
    // DeckCanvas is switched to each selected device before its screens are
    // captured, so one ZIP can contain iPhone, iPad, Watch, creative decks, etc.
    let encoding: Promise<void> = Promise.resolve();
    for (const plan of plans) {
      if (!plan.size) continue;
      setExportProject({ ...state, device: plan.device, orientation: plan.orientation });
      setExportSlideIndex(0);
      setExportLocaleOverride(locales[0]);
      await waitForPaint();

      for (const locale of locales) {
        setExportLocaleOverride(locale);
        await waitForPaint();

        for (let i = 0; i < plan.slides.length; i++) {
          const slide = plan.slides[i];
          render += 1;
          setExporting(`${render}/${totalRenders}`);
          setExportSlideIndex(i);
          await waitForPaint();
          const el = exportRef.current;
          if (!el) {
            await encoding;
            failed += 1;
            errors.push(`${locale} ${plan.device} screen ${i + 1}: render target missing`);
            continue;
          }
          const filename = `${String(i + 1).padStart(2, "0")}-${slide.layout}.png`;
          const label = `${locale} ${plan.device} screen ${i + 1}`;
          const fail = (e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${label}: ${msg}`);
            console.error("Export failed", { slideId: slide.id, locale, device: plan.device }, e);
          };
          let png: Promise<Uint8Array>;
          try {
            const rendered = await captureSlide(el, plan.cW, plan.cH);
            if (rendered.missingImages > 0) incomplete.push(label);
            png = rendered.toPng(plan.size.w, plan.size.h);
          } catch (e) {
            fail(e);
            await encoding;
            failed += 1;
            continue;
          }
          // Attach rejection handling now: this screen can fail while the
          // previous screen is still encoding.
          const nextEncoding = png.then(
            (file) => {
              zip.file(`${plan.device}/${locale}/${filename}`, file);
              okCount += 1;
            },
            (e) => {
              fail(e);
              failed += 1;
            },
          );
          await encoding;
          encoding = nextEncoding;
        }
      }
    }
    await encoding;

    setExporting("Bundling…");

    if (okCount > 0) {
      try {
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const appSlug = slugify(project?.name || state.appName) || "capturas";
        a.download = `${appSlug}-${plans.length === 1 ? plans[0].device : "all-devices"}-${stamp()}.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (e) {
        toast.error("Couldn't bundle export");
        console.error(e);
        return;
      }
    }

    if (incomplete.length > 0) {
      toast.warning("Some screenshots may be missing from the export", {
        description: `${incomplete.slice(0, 3).join(", ")}${incomplete.length > 3 ? "…" : ""}: a screenshot never finished rendering. Check those files, or export again.`,
        duration: 12000,
      });
    }

    const summary = `${plans.length} ${plans.length === 1 ? "device" : "devices"} · ${locales.length} ${locales.length === 1 ? "language" : "languages"}`;
    if (failed === 0) {
      toast.success(tr("Exportadas {count} capturas PNG ({summary})", { count: okCount, summary }));
    } else if (okCount === 0) {
      toast.error(tr("Fallaron {count} exportaciones", { count: failed }), {
        description: errors.slice(0, 3).join("\n"),
      });
    } else {
      toast.error(tr("{failed} de {total} exportaciones fallaron", { failed, total: totalUnits }), {
        description: errors.slice(0, 3).join("\n"),
      });
    }
  }

  async function captureSlide(el: HTMLElement, sourceW: number, sourceH: number) {
    // html-to-image needs the node at (0,0) and untransformed. Each export size
    // is a scaled draw of this one render, so aspect ratios that differ by a few
    // pixels are cover-scaled rather than leaving transparent gutters.
    const prev = {
      left: el.style.left,
      top: el.style.top,
      position: el.style.position,
      transform: el.style.transform,
      transformOrigin: el.style.transformOrigin,
      zIndex: el.style.zIndex,
    };
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.position = "absolute";
    el.style.transform = "none";
    el.style.transformOrigin = "top left";
    el.style.zIndex = "-1";
    try {
      return await renderSlide(el, sourceW, sourceH);
    } finally {
      el.style.left = prev.left || "-99999px";
      el.style.top = prev.top || "0px";
      el.style.position = prev.position || "absolute";
      el.style.transform = prev.transform;
      el.style.transformOrigin = prev.transformOrigin;
      el.style.zIndex = prev.zIndex;
    }
  }

  const handleApplyAdaptation = React.useCallback(
    (sourceDevice: Device, targetDevice: Device, options: AdaptOptions) => {
      const sourceSlides = state.slidesByDevice[sourceDevice] || [];
      const sourceOrientation = orientationOf(sourceDevice, state.orientation);
      const targetOrientation = orientationOf(targetDevice, state.orientation);

      const adapted = adaptSlidesForDevice(
        sourceSlides,
        sourceDevice,
        sourceOrientation,
        targetDevice,
        targetOrientation,
        options
      );

      setState((p) => ({
        ...p,
        device: targetDevice,
        orientation: targetOrientation,
        slidesByDevice: {
          ...p.slidesByDevice,
          [targetDevice]: adapted,
        },
      }));

      if (adapted.length > 0) {
        setActiveSlideId(adapted[0].id);
      }

      toast.success(
        tr("Diseño adaptado correctamente de {source} a {target}", { source: tr(DEVICE_LABEL[sourceDevice] || sourceDevice), target: tr(DEVICE_LABEL[targetDevice] || targetDevice) }),
        {
          description: `${adapted.length} pantallas transferidas con textos, colores y proporciones nativas.`,
        }
      );
    },
    [state.slidesByDevice, state.orientation, setState]
  );

  const handleDeviceChange = React.useCallback(
    (targetDevice: Device) => {
      if (targetDevice === state.device) return;

      const targetSlides = state.slidesByDevice[targetDevice] || [];
      const targetIsStarter = isStarterDeck(targetSlides);

      // Si el destino está en blanco o plantilla por defecto, buscar si tenemos pantallas personalizadas
      const sourceDeviceCandidate = findPrimaryCustomizedDevice(state.slidesByDevice, state.device);

      if (targetIsStarter && sourceDeviceCandidate && sourceDeviceCandidate !== targetDevice) {
        setPendingDeviceSwitch({ sourceDevice: sourceDeviceCandidate, targetDevice });
        setAdaptPromptOpen(true);
        return;
      }

      setState(
        (p) => ({
          ...p,
          device: targetDevice,
          orientation: orientationOf(targetDevice, p.orientation),
        }),
        { history: false }
      );
    },
    [state.device, state.slidesByDevice, setState]
  );

  // ---------- Onboarding ----------

  React.useEffect(() => {
    if (!hydrated || !ready) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem("capturas:onboarding:v1") === "done";
    } catch {
      // Sin almacenamiento: se muestra una vez por sesión.
    }
    if (seen) return;
    const timer = window.setTimeout(() => setWelcomeOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, [hydrated, ready]);

  // ---------- Render ----------

  if (!hydrated || !ready || !framesLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Loading editor…</p>
        </div>
      </div>
    );
  }

  const closeWelcome = () => {
    try {
      window.localStorage.setItem("capturas:onboarding:v1", "done");
    } catch {
      // Sin almacenamiento: no se puede recordar.
    }
    setWelcomeOpen(false);
  };

  const busy = !!exporting;
  const exportDevices = (Object.keys(DEVICE_LABEL) as Device[])
    .map((id) => {
      const slides = state.slidesByDevice[id] || [];
      return {
        id,
        label: tr(DEVICE_LABEL[id] || id),
        slideCount: slides.length,
        starter: isStarterDeck(slides),
      };
    })
    .filter((device) => device.slideCount > 0 && (!device.starter || device.id === state.device))
    .map(({ starter: _starter, ...device }) => device);

  const exportState = exportProject ?? state;
  const exportSlides = exportState.slidesByDevice[exportState.device] || [];
  const exportCanvas = getCanvas(exportState.device, exportState.orientation);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background" data-ui-locale={uiLocale}>
      <Toaster position="bottom-center" richColors closeButton />
      <Toolbar
        exportSize={activeExportSize}
        onExportSizeChange={changeExportSize}
        themeId={state.themeId}
        setThemeId={(v) => setState((p) => ({ ...p, themeId: v }))}
        palette={state.palette}
        onUpdatePalette={onUpdatePalette}
        connectedCanvas={state.connectedCanvas}
        setConnectedCanvas={(v) => setState((p) => ({ ...p, connectedCanvas: v }))}
        scene={state.scene}
        setScene={(scene) => setState((p) => ({ ...p, scene }))}
        onOpenStyleLab={() => setStyleLabOpen(true)}
        projectName={project?.name}
        onOpenProjects={() => setProjectsOpen(true)}
        fontId={fontId}
        setFontId={(v) => setState((p) => ({ ...p, fontId: v }))}
        importedFont={state.importedFont}
        setImportedFont={(importedFont) => setState((p) => ({ ...p, fontId: "self-hosted", importedFont }))}
        locale={state.locale}
        setLocale={(v) => setState((p) => ({ ...p, locale: v }), { history: false })}
        locales={state.locales}
        device={state.device}
        setDevice={handleDeviceChange}
        orientation={state.orientation}
        // A Duo orientation is its own deck: switching opens it rather than
        // re-laying out the current one, so both compositions survive.
        setOrientation={(v) => {
          const nextDevice = deviceForOrientation(state.device, v);
          if (nextDevice !== state.device) {
            handleDeviceChange(nextDevice);
          } else {
            setState((p) => ({ ...p, orientation: v }), { history: false });
          }
        }}
        slideCount={currentSlides.length}
        devices={exportDevices}
        onOpenWelcome={() => setWelcomeOpen(true)}
        onExport={exportAll}
        onAddLanguages={() => setTranslateOpen(true)}
        onResetAll={() => {
          reset();
          setActiveSlideId(null);
          toast.success(tr("Se han restablecido todos los dispositivos"));
        }}
        onResetDevice={() => {
          resetDevice(state.device);
          setActiveSlideId(null);
          toast.success(tr("Se ha restablecido {device}", { device: tr(DEVICE_LABEL[state.device] || state.device) }));
        }}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        exporting={exporting}
        savedAt={savedAt}
        saveError={saveError}
        onRetrySave={retrySave}
        busy={busy}
        onOpenTranslate={() => setTranslateOpen(true)}
        onOpenAdapt={() => setAdaptDialogOpen(true)}
      />

      <div inert={busy} aria-busy={busy} className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside className={`w-full shrink-0 border-r bg-card lg:max-h-none max-h-64 overflow-hidden transition-[width] duration-200 ${leftOpen ? "lg:w-72" : "hidden lg:block lg:w-0 lg:border-r-0"}`}>
          <Sidebar
            slides={currentSlides}
            activeId={activeSlide?.id || null}
            device={state.device}
            orientation={state.orientation}
            theme={theme}
            locale={state.locale}
            appName={displayAppName}
            appIcon={state.appIcon}
            fontFamily={fontFamily}
            connectedCanvas={state.connectedCanvas}
            scene={state.scene}
            disabled={busy}
            onReorder={reorderSlides}
            onSelect={setActiveSlideId}
            onDelete={deleteSlide}
            onDuplicate={duplicateSlide}
            onAdd={addSlide}
          />
        </aside>

        <main className="relative flex h-[26rem] shrink-0 items-stretch overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
          {/* Banner proactivo para adaptar diseño personalizado a este dispositivo en blanco */}
          {currentIsStarter && primaryCustomSource && (
            <div className="absolute top-3 left-14 right-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-card/95 px-4 py-2 text-xs shadow-lg backdrop-blur">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <span className="font-semibold text-foreground">
                    {tr("¿Quieres usar tu diseño de {device}?", { device: tr(DEVICE_LABEL[primaryCustomSource]) })}
                  </span>
                  <span className="text-muted-foreground ml-1.5 hidden md:inline">
                    {tr("Se adaptarán tus textos, traducciones, colores y capturas al formato oficial de {device}.", { device: tr(DEVICE_LABEL[state.device]) })}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  handleApplyAdaptation(primaryCustomSource, state.device, {
                    preserveCopy: true,
                    preserveColors: true,
                    preserveScreenshots: true,
                    preserveFloatingElements: true,
                  })
                }
                className="h-7 gap-1.5 px-3 text-xs font-semibold shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {tr("Adaptar a {device} ahora", { device: tr(DEVICE_LABEL[state.device]) })}
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => toggleSide("left")}
            className="absolute left-2 top-2 z-30 hidden h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground lg:flex"
            title={leftOpen ? "Ocultar barra de pantallas" : "Mostrar barra de pantallas"}
            aria-label={leftOpen ? "Ocultar barra izquierda" : "Mostrar barra izquierda"}
          >
            {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => toggleSide("right")}
            className="absolute right-2 top-2 z-30 hidden h-8 w-8 items-center justify-center rounded-md border bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground lg:flex"
            title={rightOpen ? "Ocultar panel de ajustes" : "Mostrar panel de ajustes"}
            aria-label={rightOpen ? "Ocultar barra derecha" : "Mostrar barra derecha"}
          >
            {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
          {activeSlide && currentSlides.length > 0 ? (
            <PreviewStage
              slides={currentSlides}
              activeSlideId={activeSlide.id}
              device={state.device}
              orientation={state.orientation}
              theme={theme}
              locale={state.locale}
              appName={displayAppName}
              appIcon={state.appIcon}
              fontFamily={fontFamily}
              connectedCanvas={state.connectedCanvas}
              scene={state.scene}
              selectedElement={selectedElement}
              onActiveSlideChange={setActiveSlideId}
              onLabelChange={(slide, v) => patchLocalized(slide, "label", v)}
              onHeadlineChange={(slide, v) => patchLocalized(slide, "headline", v)}
              onTextElementTextChange={patchTextElementText}
              onElementChange={patchElementTransform}
              onSelectElement={setSelectedElement}
              onDropScreenshot={handleDropScreenshot}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No screen selected</p>
              <p>Add a screen on the left to get started.</p>
            </div>
          )}
        </main>

        <aside className={`w-full shrink-0 border-l bg-card lg:max-h-none max-h-96 overflow-hidden transition-[width] duration-200 ${rightOpen ? "lg:w-80" : "hidden lg:block lg:w-0 lg:border-l-0"}`}>
          {activeSlide ? (
            <Inspector
              key={`${state.device}:${activeSlide.id}`}
              slide={activeSlide}
              device={state.device}
              orientation={state.orientation}
              theme={theme}
              palette={state.palette}
              onUpdatePalette={onUpdatePalette}
              onOpenTranslate={() => setTranslateOpen(true)}
              locale={state.locale}
              appIcon={state.appIcon}
              onAppIconChange={(appIcon) => setState((p) => ({ ...p, appIcon }))}
              selectedElementId={
                selectedElement?.slideId === activeSlide.id ? selectedElement.elementId : null
              }
              onChange={(patch) => patchSlide(activeSlide.id, patch)}
              onUpdate={(update) => updateSlide(activeSlide.id, update)}
              onSelectElement={(elementId) =>
                setSelectedElement(
                  elementId ? { slideId: activeSlide.id, elementId } : null,
                )
              }
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Nothing to inspect</p>
              <p className="text-xs">Screen settings will appear here once you add or select one.</p>
            </div>
          )}
        </aside>
      </div>

      <AppInfoDialog open={infoOpen} onOpenChange={setInfoOpen} />

      <OnboardingDialog
        open={welcomeOpen}
        onOpenChange={(open) => {
          if (open) setWelcomeOpen(true);
          else closeWelcome();
        }}
      />

      <ProjectsDialog
        open={projectsOpen}
        onOpenChange={setProjectsOpen}
        activeId={project?.id ?? null}
        onFlush={flush}
        onSwitch={async (change) => {
          const ok = await reloadProject(change);
          if (ok) {
            setActiveSlideId(null);
            setSelectedElement(null);
          }
          return ok;
        }}
      />

      <StyleLab
        open={styleLabOpen}
        onOpenChange={setStyleLabOpen}
        state={{ ...state, appName: displayAppName }}
        onApply={(next, look) => {
          setState(next, { coalesce: false });
          setSelectedElement(null);
          toast.success(`Applied ${look.name}`, {
            action: {
              label: "Undo",
              onClick: () => {
                // Only undo the look itself, never an edit made after it.
                if (latestState.current === next) undo();
                else toast("Use the toolbar Undo", { description: "You've edited the deck since applying this look." });
              },
            },
            duration: 8000,
          });
        }}
        onSavedLooksChange={(savedLooks) =>
          // A look library, not a deck edit: keep it out of undo history.
          setState((p) => ({ ...p, savedLooks: savedLooks.length ? savedLooks : undefined }), { history: false })
        }
      />

      <TranslateDialog
        open={translateOpen}
        onOpenChange={setTranslateOpen}
        project={state}
        onProjectUpdate={(next) => setState(next, { coalesce: false })}
      />

      <AdaptDialog
        open={adaptDialogOpen}
        onOpenChange={setAdaptDialogOpen}
        currentDevice={state.device}
        currentOrientation={state.orientation}
        slidesByDevice={state.slidesByDevice}
        onApplyAdaptation={handleApplyAdaptation}
      />

      {pendingDeviceSwitch && (
        <AdaptPromptDialog
          open={adaptPromptOpen}
          onOpenChange={(open) => {
            setAdaptPromptOpen(open);
            if (!open) setPendingDeviceSwitch(null);
          }}
          sourceDevice={pendingDeviceSwitch.sourceDevice}
          targetDevice={pendingDeviceSwitch.targetDevice}
          onConfirmAdapt={() => {
            if (pendingDeviceSwitch) {
              handleApplyAdaptation(
                pendingDeviceSwitch.sourceDevice,
                pendingDeviceSwitch.targetDevice,
                {
                  preserveCopy: true,
                  preserveColors: true,
                  preserveScreenshots: true,
                  preserveFloatingElements: true,
                }
              );
              setPendingDeviceSwitch(null);
            }
          }}
          onSkipAdapt={() => {
            if (pendingDeviceSwitch) {
              setState(
                (p) => ({
                  ...p,
                  device: pendingDeviceSwitch.targetDevice,
                  orientation: orientationOf(pendingDeviceSwitch.targetDevice, p.orientation),
                }),
                { history: false }
              );
              setPendingDeviceSwitch(null);
            }
          }}
        />
      )}

      {/* Off-screen export container — full-resolution canvases for html-to-image. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          pointerEvents: "none",
        }}
      >
        {exportSlides.length > 0 && (
          <div
            ref={exportRef}
            style={{
              width: exportCanvas.cW,
              height: exportCanvas.cH,
              overflow: "hidden",
              position: "absolute",
              left: -99999,
              top: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -exportSlideIndex * exportCanvas.cW,
                top: 0,
                width: exportCanvas.cW * exportSlides.length,
                height: exportCanvas.cH,
              }}
            >
              <DeckCanvas
                slides={exportSlides}
                device={exportState.device}
                orientation={exportState.orientation}
                theme={themeById(exportState.themeId, exportState.palette)}
                locale={exportLocaleOverride ?? exportState.locale}
                appName={displayAppName}
                appIcon={exportState.appIcon}
                fontFamily={SCREENSHOT_FONTS[exportState.fontId || DEFAULT_SCREENSHOT_FONT_ID].family}
                connectedCanvas={exportState.connectedCanvas}
                scene={exportState.scene}
                hideEmpty
              />
            </div>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-40 h-9 w-9 rounded-full border-border/80 bg-background/90 shadow-lg backdrop-blur"
        onClick={() => setInfoOpen(true)}
        title={tr("Acerca de y sugerencias")}
        aria-label={tr("Acerca de y sugerencias")}
      >
        <Info className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Text fields and contenteditable text keep their native undo/redo, selection,
// and deletion. Sliders, colour pickers, checkboxes and buttons have no text
// history of their own, so the editor's shortcuts still apply while they're focused.
const NON_TEXT_INPUT_TYPES = new Set(["range", "color", "checkbox", "radio", "button", "submit", "reset", "file"]);

function isTextEditable(target: HTMLElement | null) {
  if (!target) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  if (target.tagName === "INPUT") return !NON_TEXT_INPUT_TYPES.has((target as HTMLInputElement).type);
  return false;
}

// Registers the imported font in <head>, not inside the canvases: html-to-image
// embeds @font-face rules it finds in document.styleSheets, while a <style>
// cloned into the export SVG would point at a URL the SVG image can't load.
function useImportedFontFace(font: ImportedFont | undefined) {
  React.useEffect(() => {
    if (!font) return;
    const style = document.createElement("style");
    style.dataset.importedScreenshotFont = "";
    style.textContent = `@font-face { font-family: "${IMPORTED_FONT_FAMILY}"; src: url("${font.src}") format("${font.format}"); font-display: block; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [font?.src, font?.format]);
}

// Measures any Apple bezels the user added to public/frames/ before the
// first Duo frame renders. Missing files are normal; the drawn frame is used.
function useFrameAssets() {
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await fetch("/api/frames", { cache: "no-store", signal: AbortSignal.timeout(15000) });
        const json = (await resp.json()) as {
          ok: boolean;
          frames?: Partial<Record<FrameFile, MeasuredFrame>>;
          errors?: Partial<Record<FrameFile, string>>;
        };
        if (cancelled) return;
        setFrameAssets(json.frames ?? {});
        const errors = Object.values(json.errors ?? {});
        if (errors.length) {
          toast.warning("A device bezel couldn't be used", {
            description: `${errors.join("\n")}\nThe drawn frame is shown instead.`,
            duration: 12000,
          });
        }
      } catch {
        // No frames route (e.g. a static build): the drawn frames still work.
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);
  return loaded;
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "screenshots"
  );
}

function getExportCategory(device: Device): "iOS" | "iPad" | "Duo" | "Otros" {
  if (device === "iphone") return "iOS";
  if (device === "ipad") return "iPad";
  if (device.startsWith("duo-")) return "Duo";
  return "Otros";
}

function slideNeedsScreenshot(device: Device, slide: Slide) {
  if (device === "feature-graphic") return false;
  return slide.layout !== "no-device" && slide.layout !== "feature-graphic";
}

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
