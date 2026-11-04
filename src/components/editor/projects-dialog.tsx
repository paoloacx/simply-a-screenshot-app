"use client";
import * as React from "react";
import { toast } from "sonner";
import { t as tr } from "@/lib/i18n";
import { Check, Copy, Download, FilePlus2, FolderOpen, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ProjectMeta = { id: string; name: string; createdAt: number; updatedAt: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeId: string | null;
  /** Guarda lo pendiente, ejecuta `change` (cambio en el servidor) y recarga el proyecto activo. */
  onSwitch: (change?: () => Promise<void>) => Promise<boolean>;
  /** Guarda ahora los cambios pendientes del proyecto abierto. */
  onFlush: () => Promise<void>;
};

async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const json = (await resp.json().catch(() => ({}))) as { ok?: boolean; error?: string } & T;
  if (!resp.ok || json.ok === false) throw new Error(json.error || `Error HTTP ${resp.status}`);
  return json;
}

const fmt = (t: number) =>
  new Date(t).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function ProjectsDialog({ open, onOpenChange, activeId, onSwitch, onFlush }: Props) {
  const [projects, setProjects] = React.useState<ProjectMeta[]>([]);
  const [serverActive, setServerActive] = React.useState<string | null>(activeId);
  const [loading, setLoading] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const [renaming, setRenaming] = React.useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ projects: ProjectMeta[]; activeId: string | null }>("/api/projects");
      setProjects(r.projects);
      setServerActive(r.activeId);
    } catch (e) {
      toast.error("No se pudo cargar la lista de proyectos", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      setRenaming(null);
      setConfirmDelete(null);
      void refresh();
    }
  }, [open, refresh]);

  // Ejecuta una acción del servidor y recarga el editor si cambia el proyecto activo.
  async function run(action: () => Promise<void>, opts: { reload: boolean; success?: string }) {
    if (working) return;
    setWorking(true);
    try {
      if (opts.reload) {
        const ok = await onSwitch(action);
        if (!ok) throw new Error("No se pudo cargar el proyecto");
      } else {
        await action();
      }
      if (opts.success) toast.success(opts.success);
      await refresh();
    } catch (e) {
      toast.error(tr("No se pudo completar la acción"), { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setWorking(false);
    }
  }

  const openProject = (p: ProjectMeta) =>
    run(async () => { await api(`/api/projects/${p.id}`, { method: "POST", body: JSON.stringify({ action: "open" }) }); }, {
      reload: true, success: `Abierto: ${p.name}`,
    }).then(() => onOpenChange(false));

  const createProject = () =>
    run(async () => { await api("/api/projects", { method: "POST", body: JSON.stringify({ name: newName.trim() || undefined }) }); }, {
      reload: true, success: "Proyecto nuevo creado",
    }).then(() => { setNewName(""); onOpenChange(false); });

  const duplicateProject = (p: ProjectMeta) =>
    run(async () => {
      if (p.id === serverActive) await onFlush();
      await api("/api/projects", { method: "POST", body: JSON.stringify({ duplicateOf: p.id, name: `${p.name} (copia)`, activate: false }) });
    }, { reload: false, success: "Proyecto duplicado" });

  const renameProject = (id: string, name: string) =>
    run(async () => { await api(`/api/projects/${id}`, { method: "POST", body: JSON.stringify({ action: "rename", name }) }); }, {
      reload: false, success: "Proyecto renombrado",
    }).then(() => setRenaming(null));

  const deleteProject = (p: ProjectMeta) =>
    run(async () => { await api(`/api/projects/${p.id}`, { method: "DELETE", body: JSON.stringify({}) }); }, {
      reload: p.id === serverActive, success: `Eliminado: ${p.name}`,
    }).then(() => setConfirmDelete(null));

  const exportProject = (p: ProjectMeta) =>
    run(async () => {
      if (p.id === serverActive) await onFlush();
      const data = await api<{ meta: ProjectMeta; state: unknown }>(`/api/projects/${p.id}`);
      const blob = new Blob([JSON.stringify({ meta: data.meta, state: data.state }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${p.name.replace(/[^\w\- áéíóúñÁÉÍÓÚÑ]+/g, "").trim() || "proyecto"}.capturas.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, { reload: false, success: "Proyecto exportado" });

  const importProject = (file: File) =>
    run(async () => {
      const text = await file.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { throw new Error(tr("El archivo no es un JSON válido")); }
      const name = file.name.replace(/\.capturas\.json$|\.json$/i, "");
      await api("/api/projects/import", { method: "POST", body: JSON.stringify({ ...(parsed as object), name: (parsed as { meta?: { name?: string } })?.meta?.name ?? name }) });
    }, { reload: true, success: tr("Proyecto importado") }).then(() => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!working) onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FolderOpen className="h-4 w-4" /> {tr("Proyectos")}</DialogTitle>
          <DialogDescription>
            {tr("Cada proyecto guarda sus pantallas, tema y ajustes. Los cambios se guardan solos en la carpeta")} <code>projects/</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void createProject(); }}
            placeholder={tr("Nombre del proyecto nuevo (opcional)")}
            className="h-9"
            disabled={working}
          />
          <Button type="button" size="sm" className="h-9 shrink-0 gap-1.5" onClick={() => void createProject()} disabled={working}>
            <FilePlus2 className="h-4 w-4" /> {tr("Nuevo")}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-9 shrink-0 gap-1.5" onClick={() => fileRef.current?.click()} disabled={working}>
            <Upload className="h-4 w-4" /> {tr("Importar…")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              input.value = "";
              if (file) void importProject(file);
            }}
          />
        </div>

        <div className="max-h-[22rem] space-y-1.5 overflow-y-auto pr-1">
          {loading && projects.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{tr("Cargando…")}</p>}
          {projects.map((p) => {
            const isActive = p.id === serverActive;
            const isRenaming = renaming?.id === p.id;
            return (
              <div key={p.id} className={`rounded-lg border p-2.5 ${isActive ? "border-primary bg-accent/40" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          value={renaming.name}
                          onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void renameProject(p.id, renaming.name);
                            if (e.key === "Escape") setRenaming(null);
                          }}
                          className="h-8"
                        />
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => void renameProject(p.id, renaming.name)} aria-label={tr("Guardar nombre")}><Check className="h-4 w-4" /></Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRenaming(null)} aria-label={tr("Cancelar")}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{p.name}</span>
                          {isActive && <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">{tr("Abierto")}</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{tr("Modificado {date}", { date: fmt(p.updatedAt) })}</p>
                      </>
                    )}
                  </div>
                  {!isRenaming && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      {!isActive && (
                        <Button type="button" size="sm" variant="secondary" className="h-8 px-2 text-xs" onClick={() => void openProject(p)} disabled={working}>{tr("Abrir")}</Button>
                      )}
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title={tr("Renombrar")} aria-label={tr("Renombrar")} onClick={() => setRenaming({ id: p.id, name: p.name })} disabled={working}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title={tr("Duplicar")} aria-label={tr("Duplicar")} onClick={() => void duplicateProject(p)} disabled={working}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title={tr("Exportar archivo")} aria-label={tr("Exportar")} onClick={() => void exportProject(p)} disabled={working}><Download className="h-3.5 w-3.5" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" title={tr("Eliminar")} aria-label={tr("Eliminar")} onClick={() => setConfirmDelete(confirmDelete === p.id ? null : p.id)} disabled={working || projects.length <= 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </div>
                {confirmDelete === p.id && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-2.5 py-2 text-xs">
                    <span>{tr("¿Eliminar «{name}»? No se puede deshacer.", { name: p.name })}</span>
                    <span className="flex gap-1">
                      <Button type="button" size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => void deleteProject(p)} disabled={working}>{tr("Eliminar")}</Button>
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(null)}>{tr("Cancelar")}</Button>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
