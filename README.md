# alternance-offer-parser

Petite bibliothèque JavaScript, sans dépendance, qui extrait des informations structurées d'une offre d'alternance rédigée en français : salaire, rythme, durée, niveau d'études, type de contrat et date de début.

Les offres d'alternance sont écrites en texte libre ("3j/2j", "1 200 - 1 500 € brut/mois", "Bac+4/5"). Ce module les transforme en données exploitables.

## Principe de conception

Le parseur préfère ne rien retourner plutôt que de se tromper. Un montant sans période claire et d'un ordre de grandeur ambigu renvoie `null`. Un rythme abrégé comme `3j/2j` est marqué `ambiguous: true`, car l'ordre entreprise/école n'est pas garanti.

## Installation

```bash
git clone <url-du-depot>
cd alternance-offer-parser
npm test
```

Node 18 ou plus. Le module est en ESM.

## Utilisation

```js
import { parseOffer } from "./src/index.js";

const offre = `
  Alternance Data Analyst, contrat d'apprentissage.
  Niveau Bac+5. Début : septembre 2027, durée 24 mois.
  Rythme : 3 jours en entreprise / 2 jours en cours.
  Rémunération : 1 400 € brut par mois.
`;

console.log(parseOffer(offre));
```

Résultat :

```js
{
  contractType: "apprentissage",
  level: { bac: 5, bacMax: null, label: "Bac+5" },
  duration: { months: 24 },
  rhythm: { companyDays: 3, schoolDays: 2, raw: "..." },
  salary: { min: 1400, max: 1400, unit: "EUR", period: "month", gross: true },
  startDate: { year: 2027, month: 9, day: null }
}
```

## API

| Fonction | Retourne |
| --- | --- |
| `parseOffer(text)` | Tous les champs ci-dessous |
| `parseSalary(text)` | `{ min, max, unit, period, gross }` ou `null` |
| `parseRhythm(text)` | `{ companyDays, schoolDays }` ou `{ companyWeeks, schoolWeeks }` ou `null` |
| `parseDuration(text)` | `{ months }` ou `null` |
| `parseContractType(text)` | `"apprentissage"`, `"professionnalisation"`, `"alternance"` ou `null` |
| `parseLevel(text)` | `{ bac, bacMax, label }` ou `null` |
| `parseStartDate(text)` | `{ year, month, day }`, `{ asap: true }` ou `null` |

## Limites connues

- Français uniquement.
- Une seule fourchette de salaire est retournée (la première trouvée).
- Les formulations très atypiques ne sont pas couvertes. Les contributions sont bienvenues : ajoute un cas de test dans `test/parser.test.js` avec le texte réel qui échoue.

## Contribuer

1. Ouvre une issue avec le texte d'offre qui pose problème (sans données personnelles).
2. Ajoute un test, puis corrige le parseur.
3. Lance `npm test`.

## Licence

MIT
