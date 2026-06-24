import { describe, it, expect } from "vitest";
import {
  simulateOperationalImpact, createInMemoryRepository, type ImpactDataset,
} from "./impact";

// ── Cenário base reutilizável ─────────────────────────────────────────────────
// Unidade SERIAL (U-SER): 1 equipamento. Unidade PARALELA (U-PAR): 3 equipamentos
// de capacidade 1 cada (total 3), necessária 2 → tolera perder 1, não 2.
function dataset(): ImpactDataset {
  return {
    equipamentos: [
      { id: "EQ-SER", unidadeId: "U-SER", criticidade: 5, tempoAteFalhaHoras: 12 },        // crítico, falha em 12h
      { id: "EQ-PAR-1", unidadeId: "U-PAR", criticidade: 3, tempoAteFalhaHoras: 240, capacidade: 1 },
      { id: "EQ-PAR-2", unidadeId: "U-PAR", criticidade: 3, tempoAteFalhaHoras: 240, capacidade: 1 },
      { id: "EQ-PAR-3", unidadeId: "U-PAR", criticidade: 3, tempoAteFalhaHoras: 240, capacidade: 1 },
      { id: "EQ-SOLO", unidadeId: "U-SOLO", criticidade: 2, tempoAteFalhaHoras: 500 },       // unidade sem compromissos
    ],
    unidades: [
      { id: "U-SER", nome: "Linha Serial", tipoDependencia: "serial" },
      { id: "U-PAR", nome: "Linha Paralela", tipoDependencia: "paralela", capacidadeNecessaria: 2 },
      { id: "U-SOLO", nome: "Estação Isolada", tipoDependencia: "serial" },
    ],
    compromissos: [
      { id: "PED-1", nome: "Pedido A", unidadesDependentes: ["U-SER"], prazoHoras: 8, valor: 200_000 },   // prazo 8h ≤ 12h → urgente
      { id: "PED-2", nome: "Pedido B", unidadesDependentes: ["U-SER"], prazoHoras: 10, valor: 120_000 },  // 10h ≤ 12h → urgente
      { id: "PED-3", nome: "Pedido C", unidadesDependentes: ["U-SER", "U-PAR"], prazoHoras: 600, valor: 80_000 }, // não urgente p/ EQ-SER
      { id: "PED-4", nome: "Pedido D", unidadesDependentes: ["U-PAR"], prazoHoras: 100, valor: 50_000 },
    ],
  };
}
const repo = () => createInMemoryRepository(dataset());

describe("What-If · impacto operacional", () => {
  it("dependência SERIAL → unidade para totalmente, todos os compromissos em risco (valor cheio)", () => {
    const r = simulateOperationalImpact("EQ-SER", repo());
    expect(r.statusUnidade).toBe("parada_total");
    expect(r.unidade.tipoDependencia).toBe("serial");
    // 3 compromissos dependem de U-SER (PED-1, PED-2, PED-3)
    expect(r.compromissosAfetados.map((c) => c.id).sort()).toEqual(["PED-1", "PED-2", "PED-3"]);
    // valor cheio (fatorRisco = 1): 200k + 120k + 80k = 400k
    expect(r.valorTotalEmRisco).toBe(400_000);
    expect(r.compromissosAfetados.every((c) => c.valorEmRisco === c.valor)).toBe(true);
  });

  it("múltiplos compromissos URGENTES simultâneos (prazo ≤ tempo até falha)", () => {
    const r = simulateOperationalImpact("EQ-SER", repo()); // falha em 12h
    expect(r.compromissosUrgentes.map((c) => c.id).sort()).toEqual(["PED-1", "PED-2"]); // 8h e 10h ≤ 12h
    expect(r.compromissosUrgentes.length).toBe(2);
    // PED-3 (600h) não é urgente
    expect(r.compromissosAfetados.find((c) => c.id === "PED-3")!.urgente).toBe(false);
  });

  it("dependência PARALELA com redundância SUFICIENTE → parada parcial, valor proporcional", () => {
    // perder 1 de 3 (necessária 2): restante 2 ≥ 2 → parcial. fatorRisco = 1/3.
    const r = simulateOperationalImpact("EQ-PAR-1", repo());
    expect(r.statusUnidade).toBe("parada_parcial");
    expect(r.capacidade).toMatchObject({ total: 3, perdida: 1, restante: 2, necessaria: 2 });
    // compromissos de U-PAR: PED-3 (80k) e PED-4 (50k); risco = valor * 1/3
    const ped4 = r.compromissosAfetados.find((c) => c.id === "PED-4")!;
    expect(ped4.valorEmRisco).toBeCloseTo(50_000 / 3, 1);
    expect(r.valorTotalEmRisco).toBeCloseTo((80_000 + 50_000) / 3, 1);
  });

  it("dependência PARALELA com redundância INSUFICIENTE → parada total", () => {
    // necessária 3 (sem folga): perder 1 → restante 2 < 3 → total.
    const data = dataset();
    data.unidades.find((u) => u.id === "U-PAR")!.capacidadeNecessaria = 3;
    const r = simulateOperationalImpact("EQ-PAR-1", createInMemoryRepository(data));
    expect(r.statusUnidade).toBe("parada_total");
    expect(r.valorTotalEmRisco).toBe(80_000 + 50_000); // valor cheio
  });

  it("equipamento SEM compromissos vinculados → impacto operacional ZERO", () => {
    const r = simulateOperationalImpact("EQ-SOLO", repo());
    expect(r.compromissosAfetados).toHaveLength(0);
    expect(r.valorTotalEmRisco).toBe(0);
    expect(r.compromissosUrgentes).toHaveLength(0);
    expect(r.prioridade.recomendacao).toMatch(/impacto operacional nulo/i);
  });

  it("falha HIPOTÉTICA (equipamento saudável) vs REAL (já em falha)", () => {
    const real = dataset();
    real.equipamentos.find((e) => e.id === "EQ-SER")!.tempoAteFalhaHoras = 0; // já crítico
    expect(simulateOperationalImpact("EQ-SER", createInMemoryRepository(real)).equipamento.hipotetico).toBe(false);
    expect(simulateOperationalImpact("EQ-PAR-1", repo()).equipamento.hipotetico).toBe(true); // 240h > 0
    // override explícito
    expect(simulateOperationalImpact("EQ-PAR-1", repo(), { hipotetico: false }).equipamento.hipotetico).toBe(false);
  });

  it("prioridade COMBINA criticidade + tempo + valor (não isolada)", () => {
    const r = simulateOperationalImpact("EQ-SER", repo()); // crit 5, falha 12h, 400k, 2 urgentes
    expect(r.prioridade.nivel).toBe("critica");
    // mesma criticidade, mas sem valor em risco e falha distante → prioridade menor
    const baixo = simulateOperationalImpact("EQ-SOLO", repo()); // crit 2, 500h, 0 em risco
    expect(baixo.prioridade.score).toBeLessThan(r.prioridade.score);
  });

  it("é DETERMINÍSTICO — mesmo estado, mesmo resultado (auditável)", () => {
    const a = simulateOperationalImpact("EQ-SER", repo());
    const b = simulateOperationalImpact("EQ-SER", repo());
    expect(a).toStrictEqual(b);
  });

  it("saída é objeto ESTRUTURADO serializável (JSON), não texto livre", () => {
    const r = simulateOperationalImpact("EQ-SER", repo());
    expect(() => JSON.stringify(r)).not.toThrow();
    expect(r).toHaveProperty("valorTotalEmRisco");
    expect(r).toHaveProperty("prioridade.score");
    expect(Array.isArray(r.compromissosAfetados)).toBe(true);
  });

  it("equipamento inexistente → erro claro", () => {
    expect(() => simulateOperationalImpact("NAO-EXISTE", repo())).toThrow(/não encontrado/i);
  });
});
