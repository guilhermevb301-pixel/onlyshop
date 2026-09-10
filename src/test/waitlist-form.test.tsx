import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WaitlistSection from "../components/WaitlistSection";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fillForm() {
  render(<MemoryRouter><WaitlistSection /></MemoryRouter>);
  fireEvent.click(screen.getByLabelText("Sou Empresa"));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Empresa Teste" } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "contato@example.com" } });
  fireEvent.change(screen.getByLabelText("WhatsApp com DDD"), { target: { value: "(15) 99999-1234" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.submit(screen.getByRole("form", { name: "Lista de espera" }));
}
describe("waitlist form", () => {
  it("submits company contacts and shows success only after persistence", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetcher);
    fillForm();
    expect(await screen.findByRole("status")).toHaveTextContent("Você entrou na lista de espera");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ profile: "company", whatsapp: "5515999991234", consent: true });
  });
  it("keeps entered data and allows retry after a server failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Tente novamente." }) }));
    fillForm();
    expect(await screen.findByRole("alert")).toHaveTextContent("Tente novamente.");
    expect(screen.getByLabelText("Nome")).toHaveValue("Empresa Teste");
    expect(screen.getByRole("button", { name: "Entrar na lista de espera" })).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
