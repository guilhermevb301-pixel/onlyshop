// Camada de dados de "Meus Influencers".
// Funciona em dois modos:
//   - Real: tabela `user_influencers` + bucket `influencer-photos` no Supabase.
//   - Demo (login de teste): tudo em localStorage (o demoUser não existe em
//     auth.users, então não dá pra usar o Supabase — espelha o padrão do useAuth).

import { supabase } from "@/integrations/supabase/client";
import { influencerToPersona, type Persona } from "@/lib/personas";

const DEMO_FLAG = "onlyshop_demo_session";
const DEMO_KEY = "onlyshop_custom_influencers";
const BUCKET = "influencer-photos";

export function isDemoSession(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(DEMO_FLAG) === "1";
}

function readDemo(): Persona[] {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as Persona[]) : [];
  } catch {
    return [];
  }
}

function writeDemo(list: Persona[]) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(list));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Lista os influencers customizados do usuário (mais recentes primeiro).
export async function listInfluencers(userId: string): Promise<Persona[]> {
  if (isDemoSession()) return readDemo();
  const { data, error } = await supabase
    .from("user_influencers" as any)
    .select("id, name, niche, description, photo_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map(influencerToPersona);
}

// Cria um influencer: sobe a foto e persiste os metadados.
export async function createInfluencer(input: {
  userId: string;
  name: string;
  niche: string;
  description: string;
  file: File;
}): Promise<Persona> {
  const { userId, name, niche, description, file } = input;

  if (isDemoSession()) {
    const persona: Persona = {
      id: `demo-${Date.now()}`,
      name,
      niche,
      description,
      avatar: await fileToDataUrl(file),
      custom: true,
    };
    writeDemo([persona, ...readDemo()]);
    return persona;
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (upErr) throw new Error(`Não consegui subir a foto: ${upErr.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const photo_url = pub.publicUrl;

  const { data, error } = await supabase
    .from("user_influencers" as any)
    .insert({ user_id: userId, name, niche, description, photo_url })
    .select("id, name, niche, description, photo_url")
    .single();
  if (error || !data) throw new Error(error?.message || "Não consegui salvar o influencer.");

  return influencerToPersona(data as any);
}

// Cria um influencer a partir de uma imagem JÁ hospedada (gerada por IA — áudio 1).
// Não faz upload: a photo_url já é pública (URL do fal.ai / placeholder demo).
export async function createInfluencerFromUrl(input: {
  userId: string;
  name: string;
  niche: string;
  description: string;
  photoUrl: string;
}): Promise<Persona> {
  const { userId, name, niche, description, photoUrl } = input;

  if (isDemoSession()) {
    const persona: Persona = {
      id: `demo-${Date.now()}`, name, niche, description, avatar: photoUrl, custom: true,
    };
    writeDemo([persona, ...readDemo()]);
    return persona;
  }

  const { data, error } = await supabase
    .from("user_influencers" as any)
    .insert({ user_id: userId, name, niche, description, photo_url: photoUrl })
    .select("id, name, niche, description, photo_url")
    .single();
  if (error || !data) throw new Error(error?.message || "Não consegui salvar o influencer.");
  return influencerToPersona(data as any);
}

// Remove um influencer customizado.
export async function deleteInfluencer(id: string): Promise<void> {
  if (isDemoSession()) {
    writeDemo(readDemo().filter((p) => p.id !== id));
    return;
  }
  await supabase.from("user_influencers" as any).delete().eq("id", id);
}
