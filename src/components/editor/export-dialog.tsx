"use client";
import * as React from "react";
import { Coffee } from "lucide-react";
import { KofiDialog } from "./kofi-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KOFI_URL } from "@/lib/config";
import { useI18n } from "@/lib/i18n";
import type { Device } from "@/lib/types";

export type ExportDeviceOption = {
  id: Device;
  label: string;
  slideCount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  devices: ExportDeviceOption[];
  currentDevice: Device;
  locales: string[];
  onExport: (devices: Device[]) => void;
  onAddLanguages: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function ExportDialog({
  open,
  onOpenChange,
  projectName,
  devices,
  currentDevice,
  locales,
  onExport,
  onAddLanguages,
}: Props) {
  const { t } = useI18n();
  const available = React.useMemo(
    () => devices.filter((device) => device.slideCount > 0),
    [devices],
  );
  const [selected, setSelected] = React.useState<Device[]>([currentDevice]);
  const [kofiOpen, setKofiOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const fallback = available.some((device) => device.id === currentDevice)
      ? currentDevice
      : available[0]?.id;
    setSelected(fallback ? [fallback] : []);
  }, [open, currentDevice, available]);

  const selectedSet = new Set(selected);
  const selectedDevices = available.filter((device) => selectedSet.has(device.id));
  const selectedScreens = selectedDevices.reduce((total, device) => total + device.slideCount, 0);
  const allSelected = available.length > 0 && selectedDevices.length === available.length;
  const missingLanguages = Math.max(0, 5 - locales.length);

  const toggle = (device: Device) => {
    setSelected((current) =>
      current.includes(device) ? current.filter((id) => id !== device) : [...current, device],
    );
  };

  const handleExport = () => {
    if (!selected.length) return;
    onOpenChange(false);
    onExport(selected);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Export bundle")}</DialogTitle>
          <DialogDescription>
            {t("Choose the supports and languages to include in one ZIP.")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 rounded-md border bg-muted/40 p-3 text-sm">
          <Row label={t("Project")} value={projectName} />
          <Row label={t("Languages")} value={locales.join(", ")} />
          <Row
            label={t("Supports")}
            value={t("{selected} of {total}", {
              selected: selectedDevices.length,
              total: available.length,
            })}
          />
          <Row label={t("Selected screens")} value={String(selectedScreens)} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{t("Supports to export")}</span>
            <button
              type="button"
              className="text-[11px] text-primary hover:underline"
              onClick={() =>
                setSelected(allSelected ? [] : available.map((device) => device.id))
              }
            >
              {allSelected ? t("Clear all") : t("Select all")}
            </button>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border bg-background/60 p-1.5">
            {available.map((device) => {
              const checked = selectedSet.has(device.id);
              return (
                <label
                  key={device.id}
                  className={
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors " +
                    (checked ? "bg-primary/10 text-primary" : "hover:bg-muted/60")
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(device.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex-1 truncate font-medium">{device.label}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {device.slideCount === 1
                      ? t("1 screen")
                      : t("{count} screens", { count: device.slideCount })}
                  </span>
                </label>
              );
            })}
            {available.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                {t("No screens yet. Add screens on any support first.")}
              </p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t(
              "Each support exports at its required App Store size. The current device keeps the size selected in the toolbar.",
            )}
          </p>
        </div>

        {missingLanguages > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              {t("Only {count} of 5 App Store languages", { count: locales.length })}
            </p>
            <p className="mt-1 text-muted-foreground">
              {t("Add the other languages so the bundle reaches more App Store regions.")}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={onAddLanguages}
            >
              {t("Add languages")}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {KOFI_URL ? (
            <div className="flex flex-col items-start gap-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-sm"
                onClick={() => setKofiOpen(true)}
              >
                <Coffee className="h-4 w-4" />
                {t("Support on Ko-fi")}
              </Button>
              <span className="text-[10px] text-muted-foreground">
                {t("Opens the Ko-fi panel inside the app.")}
              </span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button size="sm" onClick={handleExport} disabled={selected.length === 0}>
              {t("Export bundle")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <KofiDialog open={kofiOpen} onOpenChange={setKofiOpen} />
    </>
  );
}
