import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PERSONAS, type Persona } from "@/lib/personas";
import { listInfluencers, deleteInfluencer } from "@/lib/influencers";
import { CreateInfluencerDialog } from "@/components/studio/CreateInfluencerDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Users, Plus, Upload, Wand2, Trash2, Loader2 } from "lucide-react";

export default function MeusInfluencers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [custom, setCustom] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Persona | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setCustom(await listInfluencers(user.id));
      setLoading(false);
    })();
  }, [user]);

  function useInStudio(persona: Persona) {
    navigate("/studio", { state: { persona } });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    setCustom((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteInfluencer(id);
      toast.success("Influencer removido");
    } catch {
      toast.error("Não consegui remover", { description: "Tenta de novo." });
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 pb-24 lg:max-w-5xl lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-primary tracking-wide uppercase">Estúdio IA</p>
            <h1 className="text-lg font-bold leading-tight">Meus Influencers</h1>
            <p className="text-xs text-muted-foreground">Suas personas de IA. Use as nossas ou crie a sua.</p>
          </div>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Criar
        </Button>
      </div>

      {/* Seção: criados por você */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Criados por você</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Card de upload */}
          <button
            onClick={() => setDialogOpen(true)}
            className="rounded-2xl border border-dashed border-border bg-card/50 aspect-[3/4] flex flex-col items-center justify-center gap-2 hover:border-primary/60 transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs font-medium">Criar influencer</p>
            <p className="text-[10px] text-muted-foreground px-3 text-center">Suba uma foto e a IA cria sua persona</p>
          </button>

          {loading ? (
            <div className="col-span-1 flex items-center justify-center aspect-[3/4]">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            custom.map((p) => (
              <InfluencerCard key={p.id} persona={p} onUse={() => useInStudio(p)} onDelete={() => setToDelete(p)} />
            ))
          )}
        </div>
      </section>

      {/* Seção: prontos pra usar */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Prontos pra usar</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PERSONAS.map((p) => (
            <InfluencerCard key={p.id} persona={p} onUse={() => useInStudio(p)} />
          ))}
        </div>
      </section>

      {user && (
        <CreateInfluencerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={user.id}
          onCreated={(persona) => setCustom((prev) => [persona, ...prev])}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esse influencer sai da sua lista. Os vídeos já gerados continuam salvos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfluencerCard({
  persona, onUse, onDelete,
}: { persona: Persona; onUse: () => void; onDelete?: () => void }) {
  return (
    <div className={cn(
      "group rounded-2xl border border-border bg-card overflow-hidden transition-all",
      "hover:border-primary/50 hover:-translate-y-1"
    )}>
      <div className="aspect-square bg-muted overflow-hidden relative">
        <img src={persona.avatar} alt={persona.name} className="w-full h-full object-cover" />
        <Badge variant="secondary" className="absolute top-1.5 left-1.5 text-[9px] bg-black/60 text-white border-0">
          {persona.niche}
        </Badge>
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remover"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-semibold leading-tight">{persona.name}</p>
        <Button size="sm" className="w-full mt-2 h-7 text-[11px]" onClick={onUse}>
          <Wand2 className="h-3 w-3 mr-1" /> Usar
        </Button>
      </div>
    </div>
  );
}
