/**
 * Logika planera social media: dni postów, przesunięcia ze świąt, okazje i rotacja produktów.
 * Czyste funkcje bez sieci i bez importów lokalnych (testowane bezpośrednio w Node).
 */

export type Holiday = { data: string; nazwa: string };

export type PlannedPost = {
  data: string;
  dzienTygodnia: string;
  /** Pierwotny dzień (pon./śr./pt.), jeśli post przesunięto ze święta. */
  przesunieto?: { z: string; dzien: string; powod: string };
  /** Święta z Nager.Date powiązane z postem; null = nie udało się sprawdzić świąt. */
  okazje: string[] | null;
};

export type PlannedWeek = { nr: number; od: string; do: string; posty: PlannedPost[] };

export type MonthPlan = {
  miesiac: string;
  tygodnie: PlannedWeek[];
  pominiete: { data: string; powod: string }[];
};

/** Dni postów: poniedziałek, środa, piątek (0 = niedziela). */
export const POST_WEEKDAYS = [1, 3, 5];

const WEEKDAYS_PL = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

const toDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const weekday = (isoDate: string) => toDate(isoDate).getUTCDay();
export const weekdayPl = (isoDate: string) => WEEKDAYS_PL[weekday(isoDate)];

function addDays(isoDate: string, days: number) {
  const d = toDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** Wszystkie dni miesiąca „RRRR-MM”. */
export function monthDays(month: string) {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

/** Poniedziałek tygodnia, do którego należy dzień. */
function mondayOf(isoDate: string) {
  const wd = weekday(isoDate);
  return addDays(isoDate, wd === 0 ? -6 : 1 - wd);
}

/**
 * Plan miesiąca: posty w pon./śr./pt. Gdy taki dzień jest świętem, post przechodzi
 * na najbliższy wolny dzień roboczy (pon.–pt.) w tym samym tygodniu i miesiącu.
 * `holidays = null` oznacza, że święta nie zostały sprawdzone (brak danych) –
 * wtedy nic nie przesuwamy, a okazje mają wartość null.
 */
export function planMonth(month: string, holidays: Holiday[] | null): MonthPlan {
  const days = monthDays(month);
  const inMonth = new Set(days);
  const holidayByDate = new Map<string, string[]>();
  for (const h of holidays ?? []) {
    holidayByDate.set(h.data, [...(holidayByDate.get(h.data) ?? []), h.nazwa]);
  }
  const isHoliday = (d: string) => holidayByDate.has(d);
  const isWorkday = (d: string) => weekday(d) >= 1 && weekday(d) <= 5;

  // Tygodnie od poniedziałku, przycięte do miesiąca.
  const weekStarts = [...new Set(days.map(mondayOf))];
  const tygodnie: PlannedWeek[] = [];
  const pominiete: MonthPlan["pominiete"] = [];

  weekStarts.forEach((monday) => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => inMonth.has(d));
    const targets = weekDays.filter((d) => POST_WEEKDAYS.includes(weekday(d)));
    // Najpierw rezerwujemy dni, które nie są świętami.
    const taken = new Set(targets.filter((d) => !isHoliday(d)));
    const posty: PlannedPost[] = [];

    for (const target of targets) {
      if (!isHoliday(target)) {
        posty.push({ data: target, dzienTygodnia: weekdayPl(target), okazje: [] });
        continue;
      }
      // Najbliższy dzień roboczy w tym tygodniu: +1, −1, +2, −2 …
      const candidates = [1, -1, 2, -2, 3, -3, 4, -4]
        .map((delta) => addDays(target, delta))
        .filter((d) => weekDays.includes(d) && isWorkday(d) && !isHoliday(d) && !taken.has(d));
      const reason = holidayByDate.get(target)!.join(", ");
      const moved = candidates[0];
      if (!moved) {
        pominiete.push({ data: target, powod: `${reason} – brak wolnego dnia roboczego w tym tygodniu` });
        continue;
      }
      taken.add(moved);
      posty.push({
        data: moved,
        dzienTygodnia: weekdayPl(moved),
        przesunieto: { z: target, dzien: weekdayPl(target), powod: reason },
        okazje: [],
      });
    }

    posty.sort((a, b) => a.data.localeCompare(b.data));
    // Święto, z którego przesunięto post, należy tylko do tego posta.
    const movedFrom = new Set(posty.flatMap((p) => (p.przesunieto ? [p.przesunieto.z] : [])));
    // Okazje: święta od dnia posta do dnia przed kolejnym postem w tym tygodniu
    // (+ święto, z którego post przesunięto). Każde święto trafia do jednego posta.
    posty.forEach((post, i) => {
      if (holidays === null) {
        post.okazje = null;
        return;
      }
      const end = posty[i + 1]?.data ?? addDays(monday, 7);
      const names = new Set<string>();
      if (post.przesunieto) names.add(post.przesunieto.powod);
      for (const d of weekDays) {
        if (d >= post.data && d < end && !movedFrom.has(d)) for (const n of holidayByDate.get(d) ?? []) names.add(n);
      }
      post.okazje = [...names];
    });

    if (posty.length > 0 || targets.length > 0) {
      tygodnie.push({ nr: tygodnie.length + 1, od: weekDays[0], do: weekDays[weekDays.length - 1], posty });
    }
  });

  return { miesiac: month, tygodnie, pominiete };
}

/** Ile postów mniej więcej przypada na miesiąc (3 w tygodniu). */
const POSTS_PER_MONTH = 13;

/**
 * Początek rotacji dla miesiąca: kolejne miesiące idą dalej po katalogu,
 * więc produkty z poprzedniego miesiąca nie wracają od razu.
 */
function seed(month: string) {
  const [y, m] = month.split("-").map(Number);
  return (y * 12 + (m - 1)) * POSTS_PER_MONTH;
}

/** Krok rotacji względnie pierwszy z liczbą produktów → przechodzi przez wszystkie bez powtórek. */
function rotationStep(n: number) {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  for (const step of [7, 5, 11, 13, 3, 1]) if (step < n && gcd(step, n) === 1) return step;
  return 1;
}

/**
 * Kolejność produktów dla miesiąca. Najpierw stała kolejność całego katalogu
 * (krok względnie pierwszy, żeby marki się mieszały), potem każdy miesiąc
 * zaczyna tam, gdzie skończył poprzedni. Pierwsze `n` pozycji się nie powtarza.
 */
export function productRotation(slugs: string[], month: string) {
  const n = slugs.length;
  if (n === 0) return [];
  const step = rotationStep(n);
  const base = Array.from({ length: n }, (_, i) => slugs[(i * step) % n]);
  const offset = seed(month) % n;
  return [...base.slice(offset), ...base.slice(0, offset)];
}

/** Następny produkt z rotacji, którego nie ma w `exclude` (np. „Inny produkt”). */
export function nextProduct(slugs: string[], month: string, current: string, exclude: string[]) {
  const order = productRotation(slugs, month);
  const blocked = new Set([...exclude, current]);
  const from = Math.max(0, order.indexOf(current));
  for (let i = 1; i <= order.length; i++) {
    const candidate = order[(from + i) % order.length];
    if (!blocked.has(candidate)) return candidate;
  }
  return null;
}

/** Czy w tekście jest kwota (szkic nie może podawać cen). */
export function containsPrice(text: string) {
  return /\d[\d\s.,]*\s?(zł|pln|eur|€|euro|usd|\$)/i.test(text) || /\bcen[aęy]\b|\bcenie\b/i.test(text);
}
