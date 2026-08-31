import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { setDemoRole } from "@/lib/onboarding";
import { getStoredRef, clearStoredRef } from "@/lib/referral";
import { saveAccount } from "@/lib/accounts";

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  referral_code?: string | null;
  referred_by?: string | null;
  instagram_username?: string | null;
  tiktok_username?: string | null;
  website?: string | null;
  youtube_username?: string | null;
  whatsapp?: string | null;
  intro_video_url?: string | null;
  reach_estimate?: number | null;
  avg_views?: number | null;
  whatsapp_business?: string | null;
  video_gallery?: string[] | null;
  tiktok_url?: string | null;
  mp_connected?: boolean | null;
}

interface UserRole {
  role: "viewer" | "learner" | "affiliate" | "agency" | "brand" | "admin" | "ambassador";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setRole: (role: "affiliate" | "brand" | "ambassador") => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// LANÇAMENTO: modo demo REMOVIDO. O app só opera com contas e dados reais.
// Mantemos só a chave da flag pra limpar qualquer resíduo de sessão demo
// que tenha ficado no navegador (senão um usuário real veria dados fictícios).
// ============================================================================
const DEMO_FLAG = "onlyshop_demo_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user profile and role. `sess` (quando vem) alimenta a lista multi-conta.
  const fetchUserData = async (userId: string, sess?: Session | null) => {
    try {
      // Profile e role EM PARALELO — antes eram dois await em série (~1,5s de tela
      // travada em conexão lenta, porque o app só renderiza depois disso). Agora o
      // tempo é o da query mais lenta, não a soma.
      const [profileRes, roleRes] = await Promise.all([
        // Próprio perfil via RPC SECURITY DEFINER: as colunas sensíveis de profiles
        // (coordenada, endereço, receita, indicação) não são mais legíveis direto
        // pelo cliente — mas o DONO continua vendo a própria linha inteira.
        supabase.rpc("get_my_profile" as any).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      ]);

      if (profileRes.error && profileRes.error.code !== "PGRST116") {
        console.error("Error fetching profile:", profileRes.error);
      } else if (profileRes.data) {
        setProfile(profileRes.data as Profile);
      }

      if (roleRes.error && roleRes.error.code !== "PGRST116") {
        console.error("Error fetching role:", roleRes.error);
      } else if (roleRes.data) {
        setUserRole(roleRes.data as UserRole);
      }

      // Multi-conta: guarda esta conta na lista do dispositivo (pra alternar PJ/PF).
      try {
        if (sess?.user?.email) {
          const p = profileRes.data as any;
          saveAccount({
            user_id: userId,
            email: sess.user.email,
            name: p?.display_name ?? p?.username ?? null,
            avatar_url: p?.avatar_url ?? null,
            role: (roleRes.data as any)?.role ?? null,
          });
        }
      } catch { /* multi-conta é conveniência, nunca quebra o login */ }
    } catch (error) {
      console.error("Error in fetchUserData:", error);
    }
  };

  useEffect(() => {
    // LANÇAMENTO: limpa qualquer resíduo de sessão/dados demo do navegador,
    // senão um usuário real veria campanhas/saldos fictícios de testes antigos.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("onlyshop_demo") || k === "onlyshop_onboarded")
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignora */ }

    // Carga inicial: resolve a sessão E os dados do usuário (papel/perfil) ANTES de
    // liberar a tela. Senão o app decide "precisa de onboarding" com o papel ainda
    // não carregado e pisca a tela de onboarding pra quem já está cadastrado.
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await fetchUserData(session.user.id, session);
      setLoading(false);
    })();

    // Mudanças de auth depois da carga (login/logout). O INITIAL_SESSION é tratado acima.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "INITIAL_SESSION") return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setLoading(true);
          // setTimeout evita o deadlock de chamar o supabase dentro do callback.
          setTimeout(async () => {
            await fetchUserData(session.user.id, session);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username?: string) => {
    setLoading(true);
    try {
      const referralCode = getStoredRef();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            username: username?.trim() || undefined,
            referral_code: referralCode || undefined,
          },
        },
      });

      if (error) throw error;

      // O trigger handle_new_user consome os metadados mesmo se a confirmação de
      // email significar que ainda não existe sessão no navegador.
      if (data.user) clearStoredRef();

      toast({
        title: "Conta criada!",
        description: "Verifique seu email para confirmar o cadastro.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });
      // loading é liberado pelo onAuthStateChange (após carregar papel/perfil) —
      // evita redirecionar pro onboarding antes do papel chegar.
    } catch (error: any) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message,
      });
      throw error;
    }
  };

  const signOut = async () => {
    // Sai do modo de teste, se estiver nele.
    if (localStorage.getItem(DEMO_FLAG) === "1") {
      localStorage.removeItem(DEMO_FLAG);
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      toast({ title: "Até logo!", description: "Você saiu da conta de teste." });
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Até logo!",
        description: "Você saiu da sua conta.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message,
      });
    }
  };

  // Define o papel do usuário (loja/influencer) — usado no onboarding.
  const setRole = async (role: "affiliate" | "brand" | "ambassador") => {
    if (localStorage.getItem(DEMO_FLAG) === "1") {
      setDemoRole(role);
      setUserRole({ role });
      return;
    }
    if (!user) return;
    try {
      const { error } = await supabase.rpc("set_my_role" as never, { _role: role } as never);
      if (error) throw error;
    } catch (e) {
      console.error("setRole:", e);
      throw e;
    }
    setUserRole({ role });
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: error.message,
      });
      throw error;
    }
  };

  // Recarrega papel + perfil do banco pro contexto (ex.: ao finalizar o onboarding,
  // pra needsOnboarding enxergar a cidade/papel recém-salvos e não voltar pro início).
  const refreshUserData = async () => {
    if (user) await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        userRole,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        setRole,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
