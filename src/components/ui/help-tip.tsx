import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { HELP } from "@/lib/helpContent";

interface Props {
  id?: string;            // faz lookup em HELP (helpContent.ts)
  title?: string;         // ou passa direto
  body?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  iconClassName?: string;
}

// Ícone "?" que abre uma caixinha explicando a função (pedido do Mesquita).
// Popover (não tooltip): o app é mobile-first e tooltip por hover não funciona
// em touch. Só apresentação — não toca dados nem pagamento.
export function HelpTip({ id, title, body, side = "top", align = "center", className, iconClassName }: Props) {
  const content = id && HELP[id] ? HELP[id] : { title: title || "", body: body || "" };
  if (!content.body) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Ajuda: ${content.title || "informação"}`}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground/80 active:scale-90 transition-all shrink-0",
            className
          )}
        >
          <HelpCircle className={cn("h-3.5 w-3.5", iconClassName)} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-64 rounded-2xl bg-popover ring-1 ring-white/[0.08] p-3.5 text-left z-[500]"
        onClick={(e) => e.stopPropagation()}
      >
        {content.title && <p className="text-xs font-bold mb-1">{content.title}</p>}
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{content.body}</p>
      </PopoverContent>
    </Popover>
  );
}
