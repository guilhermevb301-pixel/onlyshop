import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatView } from "@/components/chat/ChatView";
import { MessageSquare } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const { user } = useAuth();
  const { conversations, loading, startConversation, fetchConversations } = useChat();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Abre direto na conversa vinda de /chat?c=<id> (botões de campanha / media-kit).
  useEffect(() => {
    const c = searchParams.get("c");
    if (c) setActiveConversationId(c);
  }, [searchParams]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-muted-foreground/20" />
        </div>
        <h2 className="text-base font-bold">Mensagens</h2>
        <p className="text-xs text-muted-foreground/40 max-w-xs">
          Faça login para acessar suas mensagens.
        </p>
        <Button asChild size="sm" className="rounded-full bg-foreground text-background">
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
    );
  }

  if (activeConversationId) {
    const conv = conversations.find((c) => c.id === activeConversationId);
    return (
      <ChatView
        conversationId={activeConversationId}
        participant={conv?.participant}
        onBack={() => { setActiveConversationId(null); fetchConversations(); }}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold tracking-tight">Mensagens</h1>
      </div>
      <ConversationList conversations={conversations} loading={loading} onSelect={(id) => setActiveConversationId(id)} />
    </div>
  );
}
