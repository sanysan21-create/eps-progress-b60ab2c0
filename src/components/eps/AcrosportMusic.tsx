import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Music2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getMyAcrosportMusic, proposeMyAcrosportMusic, removeMyAcrosportMusic } from "@/lib/acrosport.functions";

export function AcrosportMusic() {
  const fetchMusic = useServerFn(getMyAcrosportMusic);
  const propose = useServerFn(proposeMyAcrosportMusic);
  const remove = useServerFn(removeMyAcrosportMusic);
  const qc = useQueryClient();
  const music = useQuery({ queryKey: ["acrosport-music"], queryFn: () => fetchMusic() });
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  if (!music.data) return null;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["acrosport-music"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Music2 /> Musiques proposées</h3>
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        void run(async () => {
          await propose({ data: { title, url } });
          setTitle(""); setUrl("");
          toast.success("Musique proposée");
        });
      }}>
        <label className="block space-y-1 text-xs text-muted-foreground">
          <span>Titre de la musique</span>
          <input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="block space-y-1 text-xs text-muted-foreground">
          <span>Lien internet</span>
          <input required type="url" maxLength={2000} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <Button disabled={busy} type="submit"><Plus /> Proposer une musique</Button>
      </form>
      {music.data.proposals.length === 0 ? <p className="text-sm text-muted-foreground">Aucune musique proposée.</p> : (
        <ul className="divide-y divide-border">
          {music.data.proposals.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 hover:text-primary">
                <span className="flex items-center gap-2 text-sm font-semibold"><span className="break-words">{item.title}</span><ExternalLink className="size-4 shrink-0" /></span>
                <span className="text-xs text-muted-foreground">{item.author}</span>
              </a>
              {item.mine && <Button variant="ghost" size="icon" title="Retirer ma proposition" aria-label={`Retirer ${item.title}`} disabled={busy} onClick={() => void run(() => remove({ data: { id: item.id } }))}><Trash2 /></Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}