import { describe, expect, it } from "vitest";
import { calculerTarif, type PricingInput } from "./pricingEngine";

const HOUR = 3_600_000;

function baseInput(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    nbAdultes: 2,
    nbEnfants: 1,
    tarifAdulte: 1500, // 15,00 €
    tarifEnfant: 800, // 8,00 €
    forfait1: null,
    forfait2: null,
    majorationTardiveMontant: 2500, // 25,00 €
    majorationTardiveDelaiHeures: 48,
    dateReservation: new Date("2026-01-01T00:00:00Z"),
    dateEvenement: new Date("2026-06-01T00:00:00Z"), // largement > 48h après la réservation
    ...overrides,
  };
}

describe("calculerTarif — cas général (§4.5)", () => {
  it("facture le coût individuel quand aucun forfait n'est configuré", () => {
    const result = calculerTarif(baseInput());
    expect(result.coutIndividuelTotal).toBe(2 * 1500 + 1 * 800);
    expect(result.forfaitApplique).toBeNull();
    expect(result.montantAvantMajoration).toBe(result.coutIndividuelTotal);
    expect(result.montantTotal).toBe(result.coutIndividuelTotal);
  });

  it("nbAdultes=0, nbEnfants=0 ne plante pas et coûte 0", () => {
    const result = calculerTarif(baseInput({ nbAdultes: 0, nbEnfants: 0 }));
    expect(result.coutIndividuelTotal).toBe(0);
    expect(result.montantTotal).toBe(0);
  });
});

describe("calculerTarif — forfait 1 (§4.2, §4.3)", () => {
  const forfait1 = { seuilAdultes: 10, seuilEnfants: 10, montant: 12000, actif: true };

  it("éligible via le seuil adultes (enfants au seuil ou au-dessus)", () => {
    const result = calculerTarif(
      baseInput({ nbAdultes: 5, nbEnfants: 10, forfait1 })
    );
    expect(result.forfaitApplique).toBe("NIVEAU_1");
  });

  it("éligible via le seuil enfants (adultes au seuil ou au-dessus)", () => {
    const result = calculerTarif(
      baseInput({ nbAdultes: 10, nbEnfants: 5, forfait1 })
    );
    expect(result.forfaitApplique).toBe("NIVEAU_1");
  });

  it("cas limite : nbAdultes == seuilAdultes ET nbEnfants == seuilEnfants -> non éligible", () => {
    const result = calculerTarif(
      baseInput({ nbAdultes: 10, nbEnfants: 10, forfait1 })
    );
    expect(result.forfaitApplique).toBeNull();
  });

  it("éligible, coût individuel > forfait -> MAX retient le coût individuel", () => {
    const result = calculerTarif(
      baseInput({ nbAdultes: 9, nbEnfants: 9, tarifAdulte: 2000, tarifEnfant: 2000, forfait1 })
    );
    // coût individuel = 18*2000 = 36000 > forfait 12000
    expect(result.montantAvantMajoration).toBe(36000);
  });

  it("éligible, forfait > coût individuel -> MAX retient le forfait", () => {
    const result = calculerTarif(baseInput({ nbAdultes: 2, nbEnfants: 1, forfait1 }));
    // coût individuel = 3800 < forfait 12000
    expect(result.montantAvantMajoration).toBe(12000);
    expect(result.montantForfait).toBe(12000);
  });

  it("forfait inactif malgré des seuils qualifiants -> cas général", () => {
    const result = calculerTarif(
      baseInput({ nbAdultes: 2, nbEnfants: 1, forfait1: { ...forfait1, actif: false } })
    );
    expect(result.forfaitApplique).toBeNull();
  });
});

describe("calculerTarif — forfait 2 (§4.4, §4.6)", () => {
  const forfait2 = { seuilGlobal: 50, montant: 50000, actif: true };

  it("s'applique quand forfait 1 non éligible et total > seuil global", () => {
    const result = calculerTarif(
      baseInput({ nbAdultes: 40, nbEnfants: 20, forfait1: null, forfait2 })
    );
    expect(result.forfaitApplique).toBe("NIVEAU_2");
  });

  it("cas limite : totalPersonnes == seuilGlobal -> non éligible (strict >)", () => {
    const result = calculerTarif(
      baseInput({ nbAdultes: 30, nbEnfants: 20, forfait1: null, forfait2 })
    );
    expect(result.forfaitApplique).toBeNull();
  });

  it("forfait2 inactif malgré seuil dépassé -> cas général", () => {
    const result = calculerTarif(
      baseInput({
        nbAdultes: 40,
        nbEnfants: 20,
        forfait1: null,
        forfait2: { ...forfait2, actif: false },
      })
    );
    expect(result.forfaitApplique).toBeNull();
  });

  it("forfait1 éligible ET seuil forfait2 dépassé simultanément -> forfait1 gagne, jamais de cumul", () => {
    const forfait1 = { seuilAdultes: 45, seuilEnfants: 45, montant: 12000, actif: true };
    const result = calculerTarif(
      baseInput({ nbAdultes: 40, nbEnfants: 20, forfait1, forfait2 })
    );
    expect(result.forfaitApplique).toBe("NIVEAU_1");
  });
});

describe("calculerTarif — majoration tardive (§4.7)", () => {
  it("cas limite : exactement 48h avant l'événement -> non appliquée (strict <)", () => {
    const dateReservation = new Date("2026-06-01T00:00:00Z");
    const dateEvenement = new Date(dateReservation.getTime() + 48 * HOUR);
    const result = calculerTarif(baseInput({ dateReservation, dateEvenement }));
    expect(result.majorationTardiveAppliquee).toBe(false);
    expect(result.montantMajoration).toBe(0);
  });

  it("47h59 avant l'événement -> appliquée", () => {
    const dateReservation = new Date("2026-06-01T00:00:00Z");
    const dateEvenement = new Date(dateReservation.getTime() + (48 * HOUR - 60_000));
    const result = calculerTarif(baseInput({ dateReservation, dateEvenement }));
    expect(result.majorationTardiveAppliquee).toBe(true);
    expect(result.montantMajoration).toBe(2500);
  });

  it("s'applique en dernier, par-dessus le cas général", () => {
    const dateReservation = new Date("2026-06-01T00:00:00Z");
    const dateEvenement = new Date(dateReservation.getTime() + HOUR);
    const result = calculerTarif(baseInput({ dateReservation, dateEvenement }));
    expect(result.montantTotal).toBe(result.montantAvantMajoration + 2500);
  });

  it("s'applique en dernier, par-dessus le forfait 1", () => {
    const forfait1 = { seuilAdultes: 10, seuilEnfants: 10, montant: 12000, actif: true };
    const dateReservation = new Date("2026-06-01T00:00:00Z");
    const dateEvenement = new Date(dateReservation.getTime() + HOUR);
    const result = calculerTarif(baseInput({ forfait1, dateReservation, dateEvenement }));
    expect(result.montantTotal).toBe(12000 + 2500);
  });

  it("s'applique en dernier, par-dessus le forfait 2", () => {
    const forfait2 = { seuilGlobal: 5, montant: 50000, actif: true };
    const dateReservation = new Date("2026-06-01T00:00:00Z");
    const dateEvenement = new Date(dateReservation.getTime() + HOUR);
    const result = calculerTarif(
      baseInput({ nbAdultes: 4, nbEnfants: 4, forfait2, dateReservation, dateEvenement })
    );
    expect(result.montantTotal).toBe(50000 + 2500);
  });
});

describe("calculerTarif — précision monétaire", () => {
  it("calcule en centimes entiers sans dérive flottante", () => {
    const result = calculerTarif(baseInput({ nbAdultes: 3, tarifAdulte: 1250, nbEnfants: 0 }));
    expect(result.coutIndividuelTotal).toBe(3750);
    expect(Number.isInteger(result.montantTotal)).toBe(true);
  });
});
