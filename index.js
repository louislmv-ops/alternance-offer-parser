/**
 * alternance-offer-parser
 * Extrait des informations structurees d'une offre d'alternance ecrite en francais.
 * Zero dependance. Fonctionne sous Node 18+ et dans le navigateur.
 */

const MONTHS = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

/** Minuscule + suppression des accents, pour des regex simples. */
function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ | /g, " ")
    .toLowerCase();
}

/** "1 200", "1.200", "1200,50" -> nombre */
function toNumber(raw) {
  const cleaned = raw.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Salaire. Retourne { min, max, unit, period, gross } ou null.
 * unit: "EUR", period: "month" | "year" | "hour".
 * N'invente jamais de valeur : si rien n'est clairement indique, retourne null.
 */
export function parseSalary(text) {
  const t = normalize(text);
  const num = "(\\d{1,3}(?:[ .]\\d{3})+|\\d+(?:[.,]\\d+)?)";
  const k = "\\s*(k)?";
  const cur = "\\s*(?:€|eur(?:os?)?)";
  const re = new RegExp(
    `${num}${k}${cur}?\\s*(?:(?:-|–|a|et|/)\\s*${num}${k}${cur}?)?\\s*(?:€|eur(?:os?)?)\\s*(brut|net)?[^.\\n]{0,25}?(?:/\\s*|par\\s+|\\s)?(mois|an|annee|annuel|heure|h)?`,
    "g"
  );

  for (const m of t.matchAll(re)) {
    let min = toNumber(m[1]);
    let max = m[3] ? toNumber(m[3]) : null;
    if (min == null) continue;
    if (m[2]) min *= 1000;
    if (max != null && m[4]) max *= 1000;
    if (max != null && max < min && max < 1000 && min >= 1000 && !m[4]) max = null;

    const rawPeriod = m[6];
    let period = null;
    if (rawPeriod === "mois") period = "month";
    else if (rawPeriod && /^(an|annee|annuel)$/.test(rawPeriod)) period = "year";
    else if (rawPeriod && /^(heure|h)$/.test(rawPeriod)) period = "hour";

    // Heuristique prudente : sans periode explicite, on ne devine que si l'ordre de grandeur est sans ambiguite.
    if (!period) {
      const ref = max ?? min;
      if (ref >= 15000) period = "year";
      else if (ref >= 400 && ref <= 4000) period = "month";
      else continue; // ambigu : on prefere ne rien retourner
    }
    // Garde-fou : un montant de moins de 100 par mois n'est pas un salaire.
    if (period === "month" && (max ?? min) < 100) continue;

    return {
      min,
      max: max ?? min,
      unit: "EUR",
      period,
      gross: m[5] === "brut" ? true : m[5] === "net" ? false : null,
    };
  }
  return null;
}

/**
 * Rythme d'alternance. Retourne { schoolDays, companyDays, raw } ou null.
 * Gere "3 jours en entreprise / 2 jours en cours", "3j/2j", "1 semaine / 1 semaine".
 */
export function parseRhythm(text) {
  const t = normalize(text);

  let m = t.match(/(\d)\s*(?:jours?|j)\s*(?:en\s*)?(?:entreprise|societe)[^\d]{0,25}(\d)\s*(?:jours?|j)\s*(?:en\s*)?(?:cours|ecole|formation|centre)/);
  if (m) return { companyDays: +m[1], schoolDays: +m[2], raw: m[0].trim() };

  m = t.match(/(\d)\s*(?:jours?|j)\s*(?:en\s*)?(?:cours|ecole|formation|centre)[^\d]{0,25}(\d)\s*(?:jours?|j)\s*(?:en\s*)?(?:entreprise|societe)/);
  if (m) return { schoolDays: +m[1], companyDays: +m[2], raw: m[0].trim() };

  m = t.match(/(?:rythme[^\d]{0,15})?(\d)\s*j\s*\/\s*(\d)\s*j/);
  if (m) return { companyDays: +m[1], schoolDays: +m[2], raw: m[0].trim(), ambiguous: true };

  m = t.match(/(\d)\s*semaines?\s*(?:en\s*)?(?:entreprise)[^\d]{0,25}(\d)\s*semaines?\s*(?:en\s*)?(?:cours|ecole|formation)/);
  if (m) return { companyWeeks: +m[1], schoolWeeks: +m[2], raw: m[0].trim() };

  m = t.match(/(\d)\s*semaines?\s*\/\s*(\d)\s*semaines?/);
  if (m) return { companyWeeks: +m[1], schoolWeeks: +m[2], raw: m[0].trim(), ambiguous: true };

  return null;
}

/** Duree du contrat en mois : "12 mois", "2 ans", "24 mois". */
export function parseDuration(text) {
  const t = normalize(text);
  let m = t.match(/(?:duree|contrat|pour|de)\s*(?:de\s*)?(\d{1,2})\s*mois/);
  if (m) return { months: +m[1] };
  m = t.match(/(\d{1,2})\s*mois/);
  if (m && +m[1] >= 6 && +m[1] <= 36) return { months: +m[1] };
  m = t.match(/(\d)\s*ans?\b/);
  if (m && +m[1] >= 1 && +m[1] <= 3 && /(alternance|contrat|duree|apprentissage)/.test(t)) {
    return { months: +m[1] * 12 };
  }
  return null;
}

/** Type de contrat : apprentissage ou professionnalisation. */
export function parseContractType(text) {
  const t = normalize(text);
  if (/professionnalisation|pro\b.*alternance/.test(t)) return "professionnalisation";
  if (/apprentissage|apprenti/.test(t)) return "apprentissage";
  if (/alternan/.test(t)) return "alternance";
  return null;
}

/** Niveau d'etudes vise. Retourne ex. { bac: 5, label: "Bac+5" } ou null. */
export function parseLevel(text) {
  const t = normalize(text);
  let m = t.match(/bac\s*\+\s*([2-8])(?:\s*(?:a|\/|ou|-)\s*(?:bac\s*\+?\s*)?([2-8]))?/);
  if (m) {
    const low = +m[1];
    const high = m[2] ? +m[2] : null;
    return { bac: low, bacMax: high, label: high ? `Bac+${low} a Bac+${high}` : `Bac+${low}` };
  }
  if (/\bm2\b/.test(t)) return { bac: 5, label: "M2 (Bac+5)" };
  if (/\bm1\b/.test(t)) return { bac: 4, label: "M1 (Bac+4)" };
  if (/\bmaster\b|ecole d'ingenieur|ecole de commerce/.test(t)) return { bac: 5, label: "Master (Bac+5)" };
  if (/\blicence\b|\bl3\b|\bbachelor\b/.test(t)) return { bac: 3, label: "Licence / Bachelor (Bac+3)" };
  if (/\bbts\b|\bdut\b|\bbut\b/.test(t)) return { bac: 2, label: "BTS / DUT / BUT (Bac+2)" };
  return null;
}

/** Date de debut : "septembre 2027", "a partir du 1er septembre 2027", "des que possible". */
export function parseStartDate(text, now = new Date()) {
  const t = normalize(text);
  if (/des que possible|immediat|asap/.test(t)) return { asap: true };

  const names = Object.keys(MONTHS).join("|");
  let m = t.match(new RegExp(`(?:(\\d{1,2})(?:er)?\\s+)?(${names})\\s*(\\d{4})?`));
  if (m && /(debut|demarrage|rentree|partir|prise de poste|septembre|octobre|janvier|fevrier|mars|avril|mai|juin|juillet|aout|novembre|decembre)/.test(t)) {
    const month = MONTHS[m[2]];
    let year = m[3] ? +m[3] : now.getFullYear();
    if (!m[3] && month < now.getMonth() + 1) year += 1;
    return { year, month, day: m[1] ? +m[1] : null };
  }
  return null;
}

/** Point d'entree : analyse une offre complete. */
export function parseOffer(text, options = {}) {
  return {
    contractType: parseContractType(text),
    level: parseLevel(text),
    duration: parseDuration(text),
    rhythm: parseRhythm(text),
    salary: parseSalary(text),
    startDate: parseStartDate(text, options.now),
  };
}
