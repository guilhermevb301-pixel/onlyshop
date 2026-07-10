import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Loader2, Send, LinkIcon } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialLinks?: string[];
  initialComment?: string;
  isEdit?: boolean; // true = já entregou, está editando
  submitting?: boolean;
  onSubmit: (links: string[], comment: string) => Promise<void> | void;
}

// Editor de entrega do influencer: vários links de comprovação (add/troca/remove)
// + comentário final. Editável até a marca aprovar (o chefe pediu: postou errado,
// vídeo flopou → repostar, trocar o link, justificar). Fica registrado.
export function DeliveryEditor({
  open, onOpenChange, initialLinks, initialComment, isEdit, submitting, onSubmit,
}: Props) {
  const [links, setLinks] = useState<string[]>(
    initialLinks && initialLinks.length ? initialLinks : [""]
  );
  const [comment, setComment] = useState(initialComment ?? "");

  const setLink = (i: number, v: string) =>
    setLinks((p) => p.map((l, idx) => (idx === i ? v : l)));
  const addLink = () => setLinks((p) => [...p, ""]);
  const removeLink = (i: number) => setLinks((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  const handleSubmit = async () => {
    const clean = links.map((l) => l.trim()).filter(Boolean);
    if (clean.length === 0) {
      toast.error("Adicione pelo menos um link da entrega");
      return;
    }
    const invalid = clean.find((l) => !/^https?:\/\//i.test(l));
    if (invalid) {
      toast.error("Link inválido", { description: "Use o link completo (https://...)" });
      return;
    }
    await onSubmit(clean, comment.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar entrega" : "Enviar entrega"}</DialogTitle>
          <DialogDescription className="text-xs">
            Cole o link do post público (Instagram, TikTok, YouTube). Pode adicionar mais de um e trocar quando quiser — até a marca aprovar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Links */}
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                  <Input
                    placeholder="https://instagram.com/reel/..."
                    value={l}
                    onChange={(e) => setLink(i, e.target.value)}
                    className="h-11 text-xs rounded-xl border-border/30 pl-9"
                    inputMode="url"
                  />
                </div>
                {links.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(i)}
                    className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground/60 hover:text-destructive"
                    aria-label="Remover link"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addLink}
              className="w-full h-10 rounded-xl gap-1.5 border-dashed border-border/40 text-xs text-muted-foreground/80 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar outro link
            </Button>
          </div>

          {/* Comentário */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground/70">
              Comentário (opcional)
            </label>
            <Textarea
              placeholder="Como foi a execução? Alguma observação pra marca..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="text-xs rounded-xl border-border/30 resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="group w-full h-12 rounded-xl gap-2 bg-gradient-primary text-white border-0 active:scale-[.98] transition-transform"
            aria-busy={submitting}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="h-4 w-4" /> {isEdit ? "Salvar alterações" : "Enviar entrega"}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
