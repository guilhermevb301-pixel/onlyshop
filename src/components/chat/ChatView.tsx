import { useState, useRef, useEffect } from "react";
import { useMessages } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ChatViewProps {
  conversationId: string;
  participant?: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  onBack: () => void;
}

export function ChatView({ conversationId, participant, onBack }: ChatViewProps) {
  const { user } = useAuth();
  const { messages, loading, sendMessage, hasOlder, loadingOlder, loadOlder } = useMessages(conversationId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastMessageId = messages[messages.length - 1]?.id;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lastMessageId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try { await sendMessage(input); setInput(""); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar a mensagem."); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const initials = (participant?.displayName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={participant?.avatarUrl} />
          <AvatarFallback className="bg-gradient-primary text-white text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{participant?.displayName || "Usuário"}</p>
          <p className="text-[11px] text-muted-foreground">@{participant?.username || "user"}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 hide-scrollbar">
        {hasOlder && <Button variant="ghost" className="w-full" disabled={loadingOlder} onClick={async()=>{ const height=scrollRef.current?.scrollHeight??0; try {await loadOlder();requestAnimationFrame(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight-height;});}catch(error){toast.error(error instanceof Error?error.message:"Não foi possível carregar o histórico.");} }}>{loadingOlder?"Carregando…":"Carregar mensagens anteriores"}</Button>}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">
              Envie uma mensagem para iniciar a conversa 💬
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                    isMine
                      ? "bg-gradient-primary text-white rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1",
                      isMine ? "text-white/60" : "text-muted-foreground"
                    )}
                  >
                    {format(new Date(msg.createdAt), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/30">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem..."
            className="flex-1 h-10 px-4 rounded-xl bg-muted/50 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <Button
            size="icon"
            className="h-10 w-10 rounded-xl bg-gradient-primary border-0 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
