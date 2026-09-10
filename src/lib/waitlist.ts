import { z } from "zod";

export const waitlistSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120, "Use até 120 caracteres."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254),
  whatsapp: z.string().max(30).regex(/^[+\d\s().-]+$/, "Informe um WhatsApp válido com DDD.")
    .transform(value => value.replace(/\D/g, ""))
    .transform(value => value.length === 10 || value.length === 11 ? `55${value}` : value)
    .refine(value => /^55[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(value), "Informe um WhatsApp brasileiro válido com DDD."),
  profile: z.enum(["creator", "company"], { errorMap: () => ({ message: "Escolha Creator ou Empresa." }) }),
  consent: z.literal(true, { errorMap: () => ({ message: "Autorize o contato para entrar na lista." }) }),
  website: z.string().max(200).optional(),
});

export interface WaitlistLead {
  id: string;
  position: number;
  name: string;
  email: string;
  whatsapp: string;
  profile: "creator" | "company";
  created_at: string;
}

export function leadsCsv(leads: WaitlistLead[]): string {
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [["Ordem", "Nome", "E-mail", "WhatsApp", "Perfil", "Cadastro"],
    ...leads.map(lead => [lead.position, lead.name, lead.email, lead.whatsapp, lead.profile === "creator" ? "Creator" : "Empresa", lead.created_at]),
  ].map(row => row.map(cell).join(";")).join("\r\n");
}
