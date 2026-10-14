import { supabase } from "@/integrations/supabase/client";

// Cria/acha a conversa 1:1 entre o usuário atual e outro. Retorna convId ou null.
// Mesma lógica de useChat.startConversation — extraída pra ser compartilhada
// (media-kit "me contrate" + PublicProfile). Só retorna o id; a navegação fica
// no chamador (pra não regredir o comportamento de cada tela).
export async function startConversation(myUserId: string, otherUserId: string): Promise<string | null> {
  if (!myUserId || !otherUserId || myUserId === otherUserId) return null;
  try {
    const { data, error } = await supabase.rpc("start_business_conversation" as any, { _other_user_id: otherUserId, _application_id: null });
    if (error) return null;
    return data as unknown as string;
  } catch {
    return null;
  }
}
