/**
 * Moteur de tarification — cahier des charges §4.
 * Fonction pure : aucune dépendance Prisma/I-O, testable unitairement.
 * Tous les montants sont en centimes entiers.
 */

export interface ForfaitNiveau1Config {
  seuilAdultes: number;
  seuilEnfants: number;
  montant: number;
  actif: boolean;
}

export interface ForfaitNiveau2Config {
  seuilGlobal: number;
  montant: number;
  actif: boolean;
}

export interface PricingInput {
  nbAdultes: number;
  nbEnfants: number;
  tarifAdulte: number;
  tarifEnfant: number;
  forfait1: ForfaitNiveau1Config | null;
  forfait2: ForfaitNiveau2Config | null;
  majorationTardiveMontant: number;
  majorationTardiveDelaiHeures: number;
  dateReservation: Date;
  dateEvenement: Date;
}

export interface PricingResult {
  coutIndividuelTotal: number;
  forfaitApplique: "NIVEAU_1" | "NIVEAU_2" | null;
  montantForfait: number | null;
  montantAvantMajoration: number;
  majorationTardiveAppliquee: boolean;
  montantMajoration: number;
  montantTotal: number;
}

export function calculerTarif(input: PricingInput): PricingResult {
  const coutIndividuelTotal =
    input.nbAdultes * input.tarifAdulte + input.nbEnfants * input.tarifEnfant;
  const totalPersonnes = input.nbAdultes + input.nbEnfants;

  let forfaitApplique: "NIVEAU_1" | "NIVEAU_2" | null = null;
  let montantForfait: number | null = null;
  let montantAvantMajoration: number;

  const f1 = input.forfait1;
  // §4.2 : éligible si nb_adultes < seuil_adultes OU nb_enfants < seuil_enfants.
  // Non éligible si les deux seuils sont atteints ou dépassés simultanément.
  const eligibleF1 =
    !!f1 && f1.actif && (input.nbAdultes < f1.seuilAdultes || input.nbEnfants < f1.seuilEnfants);

  if (eligibleF1 && f1) {
    montantForfait = f1.montant;
    montantAvantMajoration = Math.max(f1.montant, coutIndividuelTotal); // §4.3
    forfaitApplique = "NIVEAU_1";
  } else {
    const f2 = input.forfait2;
    // §4.4 : forfait 2 se substitue au forfait 1, ne s'y ajoute jamais (§4.6).
    const eligibleF2 = !!f2 && f2.actif && totalPersonnes > f2.seuilGlobal;
    if (eligibleF2 && f2) {
      montantForfait = f2.montant;
      montantAvantMajoration = Math.max(f2.montant, coutIndividuelTotal); // §4.4
      forfaitApplique = "NIVEAU_2";
    } else {
      montantAvantMajoration = coutIndividuelTotal; // §4.5 cas général
    }
  }

  // §4.7 : appliquée en dernier, sur le montant final obtenu après §4.3-4.5.
  const heuresAvantEvenement =
    (input.dateEvenement.getTime() - input.dateReservation.getTime()) / 3_600_000;
  const majorationTardiveAppliquee = heuresAvantEvenement < input.majorationTardiveDelaiHeures;
  const montantMajoration = majorationTardiveAppliquee ? input.majorationTardiveMontant : 0;

  return {
    coutIndividuelTotal,
    forfaitApplique,
    montantForfait,
    montantAvantMajoration,
    majorationTardiveAppliquee,
    montantMajoration,
    montantTotal: montantAvantMajoration + montantMajoration,
  };
}
