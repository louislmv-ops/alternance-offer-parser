import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOffer, parseSalary, parseRhythm, parseDuration,
  parseContractType, parseLevel, parseStartDate,
} from "../src/index.js";

test("salaire mensuel brut avec fourchette", () => {
  const s = parseSalary("Rémunération : 1 200 - 1 500 € brut / mois");
  assert.equal(s.min, 1200);
  assert.equal(s.max, 1500);
  assert.equal(s.period, "month");
  assert.equal(s.gross, true);
});

test("salaire annuel en k euros", () => {
  const s = parseSalary("Salaire : 22 k€ - 26 k€ brut par an");
  assert.equal(s.min, 22000);
  assert.equal(s.max, 26000);
  assert.equal(s.period, "year");
});

test("pas de salaire dans le texte", () => {
  assert.equal(parseSalary("Rémunération selon la grille légale"), null);
});

test("montant ambigu sans periode : rien", () => {
  assert.equal(parseSalary("Prime de 50 €"), null);
});

test("rythme en jours (entreprise / ecole)", () => {
  const r = parseRhythm("Rythme : 3 jours en entreprise / 2 jours en cours");
  assert.equal(r.companyDays, 3);
  assert.equal(r.schoolDays, 2);
});

test("rythme ecole d'abord", () => {
  const r = parseRhythm("2 jours en école et 3 jours en entreprise");
  assert.equal(r.schoolDays, 2);
  assert.equal(r.companyDays, 3);
});

test("rythme en semaines", () => {
  const r = parseRhythm("Rythme : 2 semaines en entreprise, 1 semaine en cours");
  assert.equal(r.companyWeeks, 2);
  assert.equal(r.schoolWeeks, 1);
});

test("rythme abrege signale comme ambigu", () => {
  const r = parseRhythm("Rythme 3j/2j");
  assert.equal(r.ambiguous, true);
});

test("duree en mois et en ans", () => {
  assert.equal(parseDuration("Durée du contrat : 24 mois").months, 24);
  assert.equal(parseDuration("Alternance sur 2 ans").months, 24);
});

test("type de contrat", () => {
  assert.equal(parseContractType("Contrat d'apprentissage"), "apprentissage");
  assert.equal(parseContractType("Contrat de professionnalisation"), "professionnalisation");
});

test("niveau d'etudes", () => {
  assert.equal(parseLevel("Bac+4/5 en école de commerce").label, "Bac+4 a Bac+5");
  assert.equal(parseLevel("Étudiant en M2").bac, 5);
  assert.equal(parseLevel("rien"), null);
});

test("date de debut", () => {
  const d = parseStartDate("Début : septembre 2027");
  assert.deepEqual(d, { year: 2027, month: 9, day: null });
  assert.deepEqual(parseStartDate("Démarrage dès que possible"), { asap: true });
});

test("offre complete", () => {
  const offer = `
    Alternance Data Analyst (H/F) - contrat d'apprentissage
    Niveau Bac+5 / Master. Début : septembre 2027, durée 24 mois.
    Rythme : 3 jours en entreprise / 2 jours en cours.
    Rémunération : 1 400 € brut par mois.
  `;
  const r = parseOffer(offer);
  assert.equal(r.contractType, "apprentissage");
  assert.equal(r.duration.months, 24);
  assert.equal(r.rhythm.companyDays, 3);
  assert.equal(r.salary.min, 1400);
  assert.equal(r.level.bac, 5);
  assert.equal(r.startDate.year, 2027);
});
