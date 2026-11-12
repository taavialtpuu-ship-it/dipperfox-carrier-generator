import { describe, expect, it } from "vitest";
import { parseMachineText, parseSpecs } from "@/lib/intake/parse";

const now = new Date("2026-11-12T00:00:00Z");

describe("machine description parser", () => {
  it("reads the prompt's canonical example", () => {
    expect(parseMachineText("I have a 2021 CAT 308 excavator", now)).toMatchObject({ manufacturer: "Caterpillar", model: "308", year: 2021, carrierType: "excavator", specs: [] });
  });

  it("does not guess a carrier type from the model name", () => {
    expect(parseMachineText("Bobcat T76", now)).toMatchObject({ manufacturer: "Bobcat", model: "T76", carrierType: null, year: null });
  });

  it("recognises backhoe loaders", () => {
    expect(parseMachineText("JCB 4CX backhoe loader", now)).toMatchObject({ manufacturer: "JCB", model: "4CX", carrierType: "backhoe_loader" });
  });

  it("keeps model suffixes and long-reach type", () => {
    expect(parseMachineText("Caterpillar 320 GC long reach, 2019", now)).toMatchObject({ model: "320 GC", carrierType: "long_reach_excavator", year: 2019 });
    expect(parseMachineText("komatsu PC210LC-11 crawler excavator", now)).toMatchObject({ manufacturer: "Komatsu", model: "PC210LC-11", carrierType: "excavator" });
  });

  it("reads values with units and ignores bare numbers", () => {
    const p = parseMachineText("Volvo EC140E, 14 500 kg, 102 kW, aux 140 l/min at 250 bar, about 300 hours", now);
    expect(p.manufacturer).toBe("Volvo");
    expect(p.model).toBe("EC140E");
    const by = Object.fromEntries(p.specs.map((s) => [s.field, s.canonical]));
    expect(by.operating_weight_t).toBeCloseTo(14.5, 10);
    expect(by.engine_power_kw).toBe(102);
    expect(by.aux_flow_lpm).toBe(140);
    expect(by.aux_pressure_bar).toBe(250);
    expect(p.specs).toHaveLength(4);
  });

  it("handles US units and decimals", () => {
    const s = parseSpecs("mini digger 5.5 tonnes, 35 hp, 18 gpm, 3000 psi");
    const by = Object.fromEntries(s.map((x) => [x.field, x]));
    expect(by.operating_weight_t.canonical).toBeCloseTo(5.5, 10);
    expect(by.engine_power_kw.unit).toBe("hp");
    expect(by.aux_flow_lpm.unit).toBe("gpm");
    expect(by.aux_pressure_bar.unit).toBe("psi");
  });

  it("drops a field when the text gives two different values", () => {
    expect(parseSpecs("flow 100 l/min or maybe 120 l/min").find((s) => s.field === "aux_flow_lpm")).toBeUndefined();
  });

  it("ignores implausible values and ambiguous 'tons'", () => {
    expect(parseSpecs("it weighs 8 tons")).toHaveLength(0);
    expect(parseSpecs("9999 bar")).toHaveLength(0);
  });

  it("does not treat the word 'case' as a manufacturer", () => {
    expect(parseMachineText("In case it matters, my excavator is a Kubota KX057-4", now)).toMatchObject({ manufacturer: "Kubota", model: "KX057-4" });
    expect(parseMachineText("Case CX145D SR excavator", now)).toMatchObject({ manufacturer: "Case", model: "CX145D SR" });
  });

  it("returns nothing for text without a machine", () => {
    expect(parseMachineText("hello", now)).toMatchObject({ manufacturer: null, model: null, carrierType: null, year: null, specs: [] });
  });
});
