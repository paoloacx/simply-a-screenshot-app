"use client";
import * as React from "react";
import { Dices, Layers, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { relativeLuminance } from "@/lib/contrast";
import { BACKDROPS, DECORATIONS, DEFAULT_SCENE, TILT_LIMIT, sameScene, sceneOf } from "@/lib/scene";
import { DIRECTIONS, generateLook } from "@/lib/style-lab";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Scene, Theme } from "@/lib/types";
import { SceneBackdrop } from "./scene-layers";

const TILE_W = 72;
const TILE_H = 48;

/** Toolbar popover that edits the deck-wide scene live on the canvas. */
export function ScenePlayground({
  scene: rawScene,
  theme,
  disabled,
  straightDevices,
  onChange,
}: {
  scene: Scene | undefined;
  theme: Theme;
  disabled?: boolean;
  /** The open deck's devices ignore tilt (iPhone Duo). */
  straightDevices?: boolean;
  onChange: (scene: Scene | undefined) => void;
}) {
  const { t } = useI18n();
  const scene = sceneOf(rawScene);
  const classic = sameScene(scene, DEFAULT_SCENE);
  const surprises = React.useRef(0);

  function patch(next: Partial<Scene>) {
    const merged = { ...scene, ...next };
    onChange(sameScene(merged, DEFAULT_SCENE) ? undefined : merged);
  }

  function surprise() {
    surprises.current += 1;
    const seed = Math.floor(Math.random() * 1e6) + surprises.current;
    const direction = DIRECTIONS[seed % DIRECTIONS.length];
    const next = generateLook(direction.id, seed).scene;
    // Surprise the stage, not the copy: headline styling stays as set.
    patch({
      backdrop: next.backdrop,
      span: next.span,
      decoration: next.decoration,
      shadow: next.shadow,
      glow: next.glow,
      tilt: next.tilt,
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={classic ? "outline" : "secondary"}
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          disabled={disabled}
          title={t("Escena: fondo, decoración, profundidad y tipografía global")}
        >
          <Layers className="h-3.5 w-3.5" />
          {t("Escena")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[min(80vh,640px)] w-[23rem] overflow-y-auto" aria-label={t("Escena")}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{t("Escena global")}</h2>
            <p className="text-[11px] text-muted-foreground">{t("Aplica a todas las pantallas del proyecto.")}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={surprise}>
              <Dices className="h-3.5 w-3.5" />
              {t("Sorpréndeme")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChange(undefined)}
              disabled={classic}
              title={t("Volver a la escena clásica")}
              aria-label={t("Restablecer escena")}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Section title={t("Fondo Predeterminado")}>
          <TileGroup label={t("Fondo")}>
            {BACKDROPS.map((b) => (
              <Tile key={b.id} name={b.name} checked={scene.backdrop === b.id} onSelect={() => patch({ backdrop: b.id })}>
                <Swatch theme={theme} scene={{ ...scene, backdrop: b.id, decoration: "none", span: false }} />
              </Tile>
            ))}
          </TileGroup>
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={scene.span}
              onChange={(e) => patch({ span: e.target.checked })}
            />
            <span>
              <span className="font-medium">{t("Fluir entre pantallas")}</span>
              <span className="block text-[11px] text-muted-foreground">
                {t("Un lienzo continuo a lo largo de toda la colección.")}
              </span>
            </span>
          </label>
        </Section>

        <Section title={t("Decoraciones de fondo")}>
          <TileGroup label={t("Decoración")}>
            {DECORATIONS.map((d) => (
              <Tile key={d.id} name={d.name} checked={scene.decoration === d.id} onSelect={() => patch({ decoration: d.id })}>
                <Swatch theme={theme} scene={{ ...scene, backdrop: "solid", decoration: d.id, span: false }} />
              </Tile>
            ))}
          </TileGroup>
        </Section>

        <Section title={t("Profundidad de los móviles")}>
          <Slider label={t("Sombra del móvil")} value={scene.shadow} min={0} max={100} unit="%" onChange={(shadow) => patch({ shadow })} />
          <Slider label={t("Resplandor de fondo")} value={scene.glow} min={0} max={100} unit="%" onChange={(glow) => patch({ glow })} />
          <Slider label={t("Inclinación 3D")} value={scene.tilt} min={-TILT_LIMIT} max={TILT_LIMIT} unit="°" onChange={(tilt) => patch({ tilt })} />
          {straightDevices && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t("Los marcos de iPhone Duo se mantienen rectos según las directrices de Apple.")}
            </p>
          )}
        </Section>

        <Section title={t("Titulares y Tipografía")}>
          <Slider
            label={t("Grosor (Weight)")}
            value={scene.headlineWeight}
            min={300}
            max={900}
            step={100}
            onChange={(headlineWeight) => patch({ headlineWeight })}
            reset={DEFAULT_SCENE.headlineWeight}
          />
          <Slider
            label={t("Tamaño relativo")}
            value={Math.round(scene.headlineScale * 100)}
            min={50}
            max={200}
            step={5}
            unit="%"
            onChange={(pct) => patch({ headlineScale: pct / 100 })}
            reset={100}
          />
          <div className="grid grid-cols-2 gap-2">
            <Segmented
              label={t("Mayúsculas")}
              value={scene.headlineCase}
              options={[
                { id: "as-typed", name: t("Normal") },
                { id: "upper", name: t("MAYÚS") },
              ]}
              onChange={(headlineCase) => patch({ headlineCase })}
            />
            <Segmented
              label={t("Alineación")}
              value={scene.captionAlign}
              options={[
                { id: "auto", name: t("Auto") },
                { id: "left", name: t("Izq.") },
                { id: "center", name: t("Centro") },
              ]}
              onChange={(captionAlign) => patch({ captionAlign })}
            />
          </div>
          <div className="pt-1">
            <Segmented
              label={t("Sombra de texto")}
              value={scene.textShadow || "none"}
              options={[
                { id: "none", name: t("Sin sombra") },
                { id: "subtle", name: t("Sutil") },
                { id: "medium", name: t("Media") },
                { id: "dramatic", name: t("Fuerte") },
                { id: "glow", name: t("Glow") },
              ]}
              onChange={(textShadow) => patch({ textShadow })}
            />
          </div>
        </Section>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="space-y-2 border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0 [&+&]:mt-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t(title)}</h3>
      {children}
    </section>
  );
}

function TileGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t(label)} className="grid grid-cols-4 gap-1.5">
      {children}
    </div>
  );
}

function Tile({
  name,
  checked,
  onSelect,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={t(name)}
      onClick={onSelect}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-md p-1 text-[10px] outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        checked && "bg-accent",
      )}
    >
      <span
        className={cn(
          "relative block overflow-hidden rounded ring-1 ring-black/10",
          checked && "ring-2 ring-primary",
        )}
        style={{ width: TILE_W, height: TILE_H }}
      >
        {children}
      </span>
      <span className={cn("text-muted-foreground", checked && "font-medium text-foreground")}>{t(name)}</span>
    </button>
  );
}

// A real backdrop rendered at tile size, in the deck's own theme colours.
function Swatch({ theme, scene }: { theme: Theme; scene: Scene }) {
  return (
    <SceneBackdrop
      scene={scene}
      theme={theme}
      cW={TILE_W}
      cH={TILE_H}
      index={0}
      count={1}
      base={theme.bg}
      fg={theme.fg}
      accent={theme.accent}
      dark={(relativeLuminance(theme.bg) ?? 1) < 0.18}
      inverted={false}
    />
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  reset = 0,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  reset?: number;
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">{t(label)}</Label>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(reset)}
        className="w-full"
        aria-label={t(label)}
        aria-valuetext={`${value}${unit}`}
        title="Double-click to reset"
      />
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; name: string }[];
  onChange: (value: T) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{t(label)}</Label>
      <div role="radiogroup" aria-label={t(label)} className="flex rounded-md border p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex-1 rounded px-1.5 py-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === o.id ? "bg-secondary font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(o.name)}
          </button>
        ))}
      </div>
    </div>
  );
}
