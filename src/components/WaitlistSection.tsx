import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, Store, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { waitlistSchema } from "@/lib/waitlist";

export default function WaitlistSection() {
  const section = useRef<HTMLElement>(null);
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    // The landing is lazy-loaded, so native hash scrolling can happen too early.
    if (window.location.hash === "#lista-de-espera") section.current?.scrollIntoView();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const parsed = waitlistSchema.safeParse({ ...Object.fromEntries(form), profile, consent: form.get("consent") === "on" });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data), signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || "Não foi possível salvar. Tente novamente.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error && err.name !== "AbortError" ? err.message : "A conexão demorou. Tente novamente.");
    } finally { clearTimeout(timeout); setBusy(false); }
  }

  return (
    <section ref={section} id="lista-de-espera" aria-labelledby="waitlist-title" className="relative z-10 scroll-mt-24 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-primary/10 via-[#0b0b0d] to-accent/5 p-6 sm:p-10 lg:p-14 grid gap-10 lg:grid-cols-2 items-center">
        <div>
          <p className="text-primary text-xs uppercase tracking-[0.2em] font-bold mb-4">Lista de espera · OnlyShop</p>
          <h2 id="waitlist-title" className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">Faça parte do<br /><span className="text-primary">próximo passo.</span></h2>
          <p className="mt-5 text-white/60 leading-relaxed max-w-md">Cria conteúdo ou tem uma empresa? Deixe seu contato para receber as novidades e saber dos próximos passos do OnlyShop.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/60"><span className="rounded-full border border-white/10 px-4 py-2">Para creators e empresas</span><span className="rounded-full border border-white/10 px-4 py-2">Inscrição gratuita</span></div>
        </div>
        {done ? (
          <div role="status" className="rounded-2xl border border-accent/20 bg-accent/5 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-bold">Pronto! Você entrou na lista de espera.</h3>
            <p className="text-white/60 mt-3">Nossa equipe entrará em contato pelo e-mail ou WhatsApp informado com os próximos passos.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" aria-label="Lista de espera">
            <fieldset disabled={busy} className="space-y-4">
              <legend className="text-sm font-medium mb-3">Como você quer participar?</legend>
              <div className="grid grid-cols-2 gap-3">
                {[{ value: "creator", label: "Sou Creator", Icon: Video }, { value: "company", label: "Sou Empresa", Icon: Store }].map(({ value, label, Icon }) => (
                  <label key={value} className={`cursor-pointer rounded-xl border p-4 flex items-center gap-2 text-sm transition-colors ${profile === value ? "border-primary bg-primary/10" : "border-white/15 hover:border-white/40"}`}>
                    <input type="radio" name="profile" value={value} checked={profile === value} onChange={() => setProfile(value)} required className="accent-primary" /><Icon className="h-4 w-4 shrink-0" /><span>{label}</span>
                  </label>
                ))}
              </div>
              <div><label htmlFor="lead-name" className="block text-sm mb-2">Nome</label><Input id="lead-name" name="name" autoComplete="name" placeholder="Seu nome" minLength={2} maxLength={120} required className="h-12 bg-black/20 border-white/15" /></div>
              <div><label htmlFor="lead-email" className="block text-sm mb-2">E-mail</label><Input id="lead-email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" maxLength={254} required className="h-12 bg-black/20 border-white/15" /></div>
              <div><label htmlFor="lead-whatsapp" className="block text-sm mb-2">WhatsApp com DDD</label><Input id="lead-whatsapp" name="whatsapp" type="tel" autoComplete="tel" placeholder="(15) 99999-9999" maxLength={30} required className="h-12 bg-black/20 border-white/15" /></div>
              <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              <label className="flex items-start gap-3 text-xs leading-relaxed text-white/60"><input name="consent" type="checkbox" required className="mt-1 accent-primary" /><span>Autorizo o OnlyShop a entrar em contato por e-mail e WhatsApp sobre a lista de espera e as novidades da plataforma. Consulte a <Link to="/privacy" className="underline text-white">Política de Privacidade</Link>.</span></label>
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <Button disabled={busy} type="submit" className="w-full h-12 rounded-full bg-gradient-primary text-white font-bold">{busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando…</> : <>Entrar na lista de espera<ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
            </fieldset>
          </form>
        )}
      </div>
    </section>
  );
}
