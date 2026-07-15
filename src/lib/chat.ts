import { supabase } from "@/integrations/supabase/client";

// Cria/acha a conversa 1:1 entre o usuário atual e outro. Retorna convId ou null.
// Mesma lógica de useChat.startConversation — extraída pra ser compartilhada
// (media-kit "me contrate" + PublicProfile). Só retorna o id; a navegação fica
// no chamador (pra não regredir o comportamento de cada tela).
export async function startConversation(myUserId: string, otherUserId: string): Promise<string | null> {
  if (!myUserId || !otherUserId || myUserId === otherUserId) return null;
  try {
    const { data: myConvs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", myUserId);
    for (const mc of ((myConvs as any[]) || [])) {
      const { data: otherP } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", mc.conversation_id)
        .eq("user_id", otherUserId)
        .limit(1);
      if (otherP && (otherP as any[]).length > 0) return mc.conversation_id;
    }
    const { data: conv, error } = await supabase.from("conversations").insert({}).select("id").single();
    if (error || !conv) return null;
    const cid = (conv as any).id;
    await supabase.from("conversation_participants").insert([
      { conversation_id: cid, user_id: myUserId },
      { conversation_id: cid, user_id: otherUserId },
    ]);
    return cid;
  } catch {
    return null;
  }
}
