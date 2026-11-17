// Testy narzędzia sprawdzFirme na danych lokalnych. Nie łączą się z internetem.
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCompany, isValidNip, normalizeKrs, normalizeNip, sprawdzFirme } from "../lib/company.ts";

const NOW = () => new Date("2026-11-16T10:00:00Z");
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
function fakeFetch(responses) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return { fn, calls };
}

const WL = {
  result: {
    subject: {
      name: "PRZYKŁAD SPÓŁKA Z O.O.", nip: "5260250274", statusVat: "Czynny", regon: "000002217", krs: "0000028860",
      pesel: "12345678901", workingAddress: "UL. PROSTA 1, 00-001 WARSZAWA", registrationLegalDate: "2015-03-01",
      removalDate: null, registrationDenialDate: null, accountNumbers: ["11111111111111111111111111", "22222222222222222222222222"],
      representatives: [{ firstName: "Jan", lastName: "Nowak", pesel: "99999999999" }],
    },
    requestDateTime: "16-11-2026 11:00:00",
  },
};
const krsOdpis = (nazwa, dzial6 = {}) => ({
  odpis: {
    naglowekA: { numerKRS: "0000028860", dataRejestracjiWKRS: "19.07.2001", dataOstatniegoWpisu: "09.10.2026" },
    dane: {
      dzial1: {
        danePodmiotu: { nazwa, formaPrawna: "SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ", identyfikatory: { nip: "5260250274", regon: "000002217" } },
        siedzibaIAdres: { adres: { ulica: "UL. PROSTA", nrDomu: "1", kodPocztowy: "00-001", miejscowosc: "WARSZAWA" } },
        kapital: { wysokoscKapitaluZakladowego: { wartosc: "50000,00", waluta: "PLN" } },
      },
      dzial2: { reprezentacja: { nazwaOrganu: "ZARZĄD", sklad: [{ nazwisko: { nazwiskoICzlon: "N****" }, identyfikator: { pesel: "1***" }, funkcjaWOrganie: "PREZES ZARZĄDU" }] } },
      dzial6,
    },
  },
});

test("walidacja NIP i KRS", () => {
  assert.equal(isValidNip("5260250274"), true);
  assert.equal(isValidNip("5260250275"), false);
  assert.equal(normalizeNip("PL 526-025-02-74"), "5260250274");
  assert.equal(normalizeKrs("28860"), "0000028860");
  assert.equal(normalizeKrs("abc"), null);
});

test("po NIP: Biała lista + KRS, sygnały i brak danych osobowych", async () => {
  const { fn, calls } = fakeFetch([json(WL), json(krsOdpis("PRZYKŁAD SPÓŁKA Z O.O."))]);
  const r = await checkCompany({ nip: "526-025-02-74" }, fn, NOW);
  assert.equal(calls[0], "https://wl-api.mf.gov.pl/api/search/nip/5260250274?date=2026-11-16");
  assert.match(calls[1], /OdpisAktualny\/0000028860\?rejestr=P/);
  assert.equal(r.nazwa, "PRZYKŁAD SPÓŁKA Z O.O.");
  assert.equal(r.bialaListaVat.statusVat, "Czynny");
  assert.equal(r.bialaListaVat.liczbaZgloszonychKontBankowych, 2);
  assert.equal(r.krsDane.latWRejestrze, 25);
  assert.equal(r.krsDane.kapitalZakladowy, "50000,00 PLN");
  assert.deepEqual(r.krsDane.funkcjeWZarzadzie, ["PREZES ZARZĄDU"]);
  assert.deepEqual(r.sygnalyOstrzegawcze, []);
  assert.ok(r.sygnalyPozytywne.includes("czynny podatnik VAT"));
  assert.equal(r.pobrano, "2026-11-16T10:00:00.000Z");
  const text = JSON.stringify(r);
  assert.doesNotMatch(text, /pesel|99999999999|12345678901|Nowak|1111111111/i);
  assert.match(r.uwaga, /nie ocena/);
});

test("ostrzeżenia: likwidacja w nazwie i w dziale 6, wykreślenie z VAT", async () => {
  const wl = structuredClone(WL);
  Object.assign(wl.result.subject, { statusVat: "Niezarejestrowany", removalDate: "2025-01-10", removalBasis: "Art. 96", accountNumbers: [] });
  const { fn } = fakeFetch([json(wl), json(krsOdpis("PRZYKŁAD SP. Z O.O. W LIKWIDACJI", { likwidacja: [{ likwidatorzy: [] }] }))]);
  const r = await checkCompany({ nip: "5260250274" }, fn, NOW);
  assert.deepEqual(r.sygnalyOstrzegawcze, [
    "status VAT: Niezarejestrowany",
    "wykreślony z rejestru VAT 2025-01-10",
    "brak zgłoszonych kont bankowych na Białej liście",
    "KRS, dział 6: likwidacja",
    "w nazwie: „w likwidacji”",
  ]);
});

test("po KRS: najpierw KRS, potem Biała lista po NIP z KRS", async () => {
  const { fn, calls } = fakeFetch([json(krsOdpis("PRZYKŁAD")), json(WL)]);
  const r = await checkCompany({ krs: "28860" }, fn, NOW);
  assert.match(calls[0], /api-krs/);
  assert.match(calls[1], /wl-api.*5260250274/);
  assert.equal(r.nip, "5260250274");
});

test("firma bez KRS (np. jednoosobowa): tylko Biała lista i wyjaśnienie", async () => {
  const wl = structuredClone(WL);
  wl.result.subject.krs = null;
  const { fn, calls } = fakeFetch([json(wl)]);
  const r = await checkCompany({ nip: "5260250274" }, fn, NOW);
  assert.equal(calls.length, 1);
  assert.match(r.krsDane.blad, /Brak numeru KRS/);
});

test("połączenie lub przekształcenie trafia do innych informacji, nie do ostrzeżeń", async () => {
  const { fn } = fakeFetch([json(WL), json(krsOdpis("PRZYKŁAD", { polaczeniePodzialPrzeksztalcenie: [{ opis: "x" }] }))]);
  const r = await checkCompany({ nip: "5260250274" }, fn, NOW);
  assert.deepEqual(r.sygnalyOstrzegawcze, []);
  assert.deepEqual(r.inneInformacje, ["KRS, dział 6: połączenie, podział lub przekształcenie"]);
});

test("błędy: zły NIP bez zapytania, brak w rejestrach, limit i awaria", async () => {
  const none = fakeFetch([]);
  assert.match((await checkCompany({ nip: "1234567890" }, none.fn, NOW)).blad, /niepoprawny/);
  assert.equal(none.calls.length, 0);

  const missing = fakeFetch([json({ result: { subject: null } })]);
  assert.match((await checkCompany({ nip: "5260250274" }, missing.fn, NOW)).blad, /nie figuruje na Białej liście/);

  const limit = fakeFetch([new Response("", { status: 429 })]);
  assert.match((await checkCompany({ nip: "5260250274" }, limit.fn, NOW)).blad, /limit/);

  const krsGone = fakeFetch([new Response(null, { status: 204 }), new Response("", { status: 404 })]);
  assert.match((await checkCompany({ krs: "442130" }, krsGone.fn, NOW)).blad, /wykreślony/);

  const offline = fakeFetch([new Error("offline")]);
  assert.match((await checkCompany({ nip: "5260250274" }, offline.fn, NOW)).blad, /nie odpowiada/);
});

test("schemat wymaga NIP albo KRS i odrzuca tekst", () => {
  assert.equal(sprawdzFirme.inputSchema.safeParse({}).success, false);
  assert.equal(sprawdzFirme.inputSchema.safeParse({ nip: "Firma ABC" }).success, false);
  assert.equal(sprawdzFirme.inputSchema.safeParse({ nip: "526-025-02-74" }).success, true);
});
