"use client";

import { useState } from "react";
import AppHeader from "./AppHeader";
import type { PlannerPlan, ProductCard } from "@/lib/planner";
import type { PlannedPost, PlannedWeek } from "@/lib/plannerCore";

type Draft = { data: string; linkedin: string; instagram: string; uwagi: string[]; przygotowano: string; zrodla: string[] };
type Status = "ok" | "loading" | "missing";

const STATUS_LABEL: Record<Status, string> = { ok: "OK", loading: "Ładuję…", missing: "Brak danych" };
const DAY_HEADERS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" });
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", timeZone: "UTC" });
const isHttp = (url: string) => /^https?:\/\//i.test(url);

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit" }).format(new Date());
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Pasek 7 dni tygodnia (pon.–niedz.) z zaznaczonymi dniami postów. */
function WeekStrip({ week, month }: { week: PlannedWeek; month: string }) {
  const first = new Date(`${week.od}T12:00:00Z`).getUTCDay();
  const monday = addDays(week.od, first === 0 ? -6 : 1 - first);
  const postDays = new Set(week.posty.map((p) => p.data));
  return (
    <div className="week-strip" aria-hidden="true">
      {DAY_HEADERS.map((label, i) => {
        const day = addDays(monday, i);
        const inMonth = day.startsWith(month);
        return (
          <div key={day} className={`week-day${inMonth ? "" : " week-day-out"}${postDays.has(day) ? " week-day-post" : ""}`}>
            <span>{label}</span>
            <strong>{inMonth ? Number(day.slice(8)) : "·"}</strong>
          </div>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button type="button" className="button-secondary inline-btn" onClick={copy}>
      {copied ? "Skopiowano ✓" : "Kopiuj"}
    </button>
  );
}

export default function SocialPlanner() {
  const [month, setMonth] = useState(currentMonth);
  const [plan, setPlan] = useState<PlannerPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [products, setProducts] = useState<Record<string, ProductCard>>({});
  const [productTimes, setProductTimes] = useState<Record<string, string>>({});
  const [productLoading, setProductLoading] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [weekLoading, setWeekLoading] = useState<Record<number, boolean>>({});
  const [weekError, setWeekError] = useState<Record<number, string>>({});

  async function post(body: unknown) {
    const res = await fetch("/api/planer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) throw new Error("Sesja wygasła. Odśwież stronę i zaloguj się.");
    const data = await res.json().catch(() => null);
    if (!data?.ok) throw new Error(data?.message ?? "Coś poszło nie tak. Spróbuj ponownie.");
    return data;
  }

  async function makePlan(e: React.FormEvent) {
    e.preventDefault();
    if (planLoading) return;
    setPlanLoading(true);
    setPlanError("");
    try {
      const data = await post({ mode: "plan", miesiac: month });
      setPlan(data.plan);
      setProducts(data.plan.produkty);
      setProductTimes({});
      setDrafts({});
      setWeekError({});
    } catch (err) {
      setPlan(null);
      setPlanError(err instanceof Error ? err.message : "Nie udało się przygotować planu.");
    } finally {
      setPlanLoading(false);
    }
  }

  async function changeProduct(date: string) {
    if (!plan) return;
    const current = products[date];
    if (!current) return;
    setProductLoading((s) => ({ ...s, [date]: true }));
    try {
      const data = await post({
        mode: "produkt",
        miesiac: plan.miesiac,
        obecny: current.slug,
        wyklucz: Object.values(products).map((p) => p.slug),
      });
      setProducts((s) => ({ ...s, [date]: data.produkt }));
      setProductTimes((s) => ({ ...s, [date]: data.przygotowano }));
      // Szkic dotyczył poprzedniego produktu – trzeba go rozpisać od nowa.
      setDrafts((s) => {
        const next = { ...s };
        delete next[date];
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nie udało się zmienić produktu.");
    } finally {
      setProductLoading((s) => ({ ...s, [date]: false }));
    }
  }

  async function draftWeek(week: PlannedWeek) {
    const posts = week.posty.filter((p) => products[p.data]).map((p) => ({ data: p.data, slug: products[p.data].slug }));
    if (posts.length === 0 || weekLoading[week.nr]) return;
    setWeekLoading((s) => ({ ...s, [week.nr]: true }));
    setWeekError((s) => ({ ...s, [week.nr]: "" }));
    try {
      const data = await post({ mode: "tydzien", posty: posts });
      setDrafts((s) => {
        const next = { ...s };
        for (const d of data.szkice) next[d.data] = { ...d, przygotowano: data.przygotowano, zrodla: data.zrodla };
        return next;
      });
    } catch (err) {
      setWeekError((s) => ({ ...s, [week.nr]: err instanceof Error ? err.message : "Nie udało się rozpisać tygodnia." }));
    } finally {
      setWeekLoading((s) => ({ ...s, [week.nr]: false }));
    }
  }

  function statusOf(week: PlannedWeek, p: PlannedPost): Status {
    if (weekLoading[week.nr] || productLoading[p.data]) return "loading";
    if (p.okazje === null || !products[p.data] || weekError[week.nr]) return "missing";
    return "ok";
  }

  return (
    <main className="page page-wide">
      <AppHeader />
      <p className="back-link">
        <a href="/">← Wróć do czatu</a>
      </p>
      <h2 style={{ margin: "0 0 4px" }}>Planer social media</h2>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        3 posty w tygodniu (pon., śr., pt.) z produktem dnia z katalogu Azzura Group. Najpierw plan, potem szkice –
        tydzień po tygodniu.
      </p>

      <form className="card trip-form" onSubmit={makePlan}>
        <label>
          <span>Miesiąc</span>
          <input type="month" value={month} min="2024-01" max="2035-12" onChange={(e) => setMonth(e.target.value)} required />
        </label>
        <button type="submit" disabled={!month || planLoading}>
          {planLoading ? "Planuję…" : "Zaplanuj miesiąc"}
        </button>
      </form>

      {planError && (
        <div role="alert" className="error" style={{ marginTop: 16 }}>
          {planError}
        </div>
      )}

      {plan && (
        <section style={{ marginTop: 20 }} aria-live="polite">
          {plan.swietaBlad && (
            <p className="warning">
              Nie udało się sprawdzić świąt ({plan.swietaBlad}). Posty nie zostały przesunięte, okazje: brak danych.
            </p>
          )}
          {plan.pominiete.length > 0 && (
            <p className="warning">
              Pominięte dni: {plan.pominiete.map((p) => `${longDate(p.data)} (${p.powod})`).join("; ")}.
            </p>
          )}

          {plan.tygodnie.map((week) => (
            <div key={week.nr} className="planner-week">
              <div className="trip-head">
                <div>
                  <h3 style={{ margin: 0 }}>
                    Tydzień {week.nr} · {longDate(week.od)} – {longDate(week.do)}
                  </h3>
                  <p className="note" style={{ marginTop: 2 }}>
                    {week.posty.length === 0 ? "Brak postów w tym tygodniu." : `${week.posty.length} ${week.posty.length === 1 ? "post" : "posty"}`}
                  </p>
                </div>
                {week.posty.length > 0 && (
                  <button type="button" onClick={() => draftWeek(week)} disabled={weekLoading[week.nr]}>
                    {weekLoading[week.nr] ? "Ładuję…" : week.posty.every((p) => drafts[p.data]) ? "Rozpisz tydzień ponownie" : "Rozpisz tydzień"}
                  </button>
                )}
              </div>
              <WeekStrip week={week} month={plan.miesiac} />
              {weekError[week.nr] && (
                <p role="alert" className="error" style={{ margin: "8px 0" }}>
                  {weekError[week.nr]}
                </p>
              )}

              <div className="planner-cards">
                {week.posty.map((p) => {
                  const product = products[p.data];
                  const draft = drafts[p.data];
                  const status = statusOf(week, p);
                  const sources = draft ? draft.zrodla : plan.zrodla;
                  const time = draft?.przygotowano ?? productTimes[p.data] ?? plan.przygotowano;
                  return (
                    <article key={p.data} className="trip-card planner-card">
                      <div className="planner-card-head">
                        <h4>
                          {p.dzienTygodnia.charAt(0).toUpperCase() + p.dzienTygodnia.slice(1)}, {longDate(p.data)}
                        </h4>
                        <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>
                      </div>
                      {p.przesunieto && (
                        <p className="planner-moved">
                          ↪ Przesunięto z: {p.przesunieto.dzien}, {longDate(p.przesunieto.z)} ({p.przesunieto.powod})
                        </p>
                      )}

                      <div className="planner-field">
                        <span className="planner-label">Okazja / święto</span>
                        {p.okazje === null ? (
                          <span className="trip-value-missing">Brak danych</span>
                        ) : p.okazje.length === 0 ? (
                          <span>brak okazji</span>
                        ) : (
                          <span>{p.okazje.join(", ")}</span>
                        )}
                      </div>

                      <div className="planner-field">
                        <span className="planner-label">Produkt dnia</span>
                        {product ? (
                          <span>
                            {isHttp(product.link) ? (
                              <a href={product.link} target="_blank" rel="noopener noreferrer">
                                {product.nazwa} ↗
                              </a>
                            ) : (
                              product.nazwa
                            )}{" "}
                            <span className="note">({product.marka})</span>
                          </span>
                        ) : (
                          <span className="trip-value-missing">Brak danych</span>
                        )}
                        <button
                          type="button"
                          className="button-secondary inline-btn"
                          onClick={() => changeProduct(p.data)}
                          disabled={!product || productLoading[p.data] || weekLoading[week.nr]}
                        >
                          {productLoading[p.data] ? "Ładuję…" : "Inny produkt"}
                        </button>
                      </div>

                      {draft ? (
                        <>
                          {(["linkedin", "instagram"] as const).map((kind) => (
                            <div key={kind} className="planner-draft">
                              <div className="planner-draft-head">
                                <span className="planner-label">{kind === "linkedin" ? "Szkic LinkedIn" : "Szkic Instagram"}</span>
                                <CopyButton text={draft[kind]} />
                              </div>
                              <pre>{draft[kind]}</pre>
                            </div>
                          ))}
                          {draft.uwagi.map((u) => (
                            <p key={u} className="warning" style={{ margin: 0 }}>
                              {u}
                            </p>
                          ))}
                        </>
                      ) : (
                        <p className="note">
                          {weekLoading[week.nr] ? "Ładuję szkice…" : "Szkice pojawią się po kliknięciu „Rozpisz tydzień”."}
                        </p>
                      )}

                      <p className="trip-source">
                        Źródła: {sources.join(" · ")} · przygotowano {clock(time)}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="planner-footer">
            ⚠️ To szkice — sprawdź przed publikacją. Planer niczego nie publikuje automatycznie.
          </p>
        </section>
      )}
    </main>
  );
}
