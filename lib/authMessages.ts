/**
 * Logowanie i rejestracja: sprawdzanie pól i komunikaty błędów po polsku.
 * Czysta logika bez importów (testowana bezpośrednio w Node).
 */

export const MIN_PASSWORD = 8;

export type AuthMode = "login" | "signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AUTH_MESSAGES = {
  emptyEmail: "Wpisz adres e-mail.",
  badEmail: "Wpisz poprawny adres e-mail, np. jan@firma.pl.",
  emptyPassword: "Wpisz hasło.",
  shortPassword: `Hasło jest za krótkie – musi mieć co najmniej ${MIN_PASSWORD} znaków.`,
  wrongPassword: "Zły e-mail lub hasło. Sprawdź je i spróbuj ponownie.",
  accountExists: "Konto z tym adresem e-mail już istnieje. Zaloguj się w zakładce „Zaloguj się”.",
  weakPassword: `Hasło jest za słabe. Użyj co najmniej ${MIN_PASSWORD} znaków, najlepiej liter i cyfr.`,
  notConfirmed: "Najpierw potwierdź adres e-mail – kliknij link z wiadomości, którą wysłaliśmy.",
  tooMany: "Za dużo prób. Odczekaj kilka minut i spróbuj ponownie.",
  signupDisabled: "Zakładanie nowych kont jest wyłączone. Poproś administratora o dostęp.",
  network: "Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.",
  unknown: "Coś poszło nie tak. Spróbuj ponownie za chwilę.",
} as const;

/** Błąd w polach formularza albo null, gdy można wysłać. */
export function validateCredentials(email: string, password: string, mode: AuthMode): string | null {
  const e = email.trim();
  if (!e) return AUTH_MESSAGES.emptyEmail;
  if (!EMAIL_RE.test(e)) return AUTH_MESSAGES.badEmail;
  if (!password) return AUTH_MESSAGES.emptyPassword;
  if (mode === "signup" && password.length < MIN_PASSWORD) return AUTH_MESSAGES.shortPassword;
  return null;
}

/** Błąd Supabase Auth (kod albo angielski komunikat) → zdanie po polsku. */
export function authErrorMessage(error: { code?: unknown; message?: unknown; status?: unknown } | null | undefined): string {
  if (!error) return AUTH_MESSAGES.unknown;
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";

  switch (code) {
    case "invalid_credentials":
      return AUTH_MESSAGES.wrongPassword;
    case "user_already_exists":
    case "email_exists":
    case "identity_already_exists":
      return AUTH_MESSAGES.accountExists;
    case "weak_password":
      return AUTH_MESSAGES.weakPassword;
    case "email_not_confirmed":
      return AUTH_MESSAGES.notConfirmed;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return AUTH_MESSAGES.tooMany;
    case "email_address_invalid":
      return AUTH_MESSAGES.badEmail;
    case "signup_disabled":
    case "email_provider_disabled":
      return AUTH_MESSAGES.signupDisabled;
  }

  // Starsze odpowiedzi bez kodu – rozpoznajemy po treści.
  if (message.includes("invalid login credentials")) return AUTH_MESSAGES.wrongPassword;
  if (message.includes("already registered") || message.includes("already exists")) return AUTH_MESSAGES.accountExists;
  if (message.includes("password should be")) return AUTH_MESSAGES.weakPassword;
  if (message.includes("email not confirmed")) return AUTH_MESSAGES.notConfirmed;
  if (error.status === 429 || message.includes("rate limit")) return AUTH_MESSAGES.tooMany;
  if (message.includes("fetch") || message.includes("network")) return AUTH_MESSAGES.network;
  return AUTH_MESSAGES.unknown;
}

type SignUpData = { session?: unknown; user?: { identities?: unknown[] | null } | null } | null | undefined;

/**
 * Wynik rejestracji:
 * - "signed-in": konto założone i od razu zalogowane (potwierdzanie e-maila wyłączone),
 * - "confirm": trzeba kliknąć link w e-mailu,
 * - "exists": adres już zajęty (Supabase przy włączonym potwierdzaniu nie zwraca wtedy błędu,
 *   tylko użytkownika bez tożsamości – żeby nie zdradzać, kto ma konto),
 * - "error": nieoczekiwana odpowiedź.
 */
export function signUpOutcome(data: SignUpData): "signed-in" | "confirm" | "exists" | "error" {
  if (data?.session) return "signed-in";
  const user = data?.user;
  if (!user) return "error";
  if (Array.isArray(user.identities) && user.identities.length === 0) return "exists";
  return "confirm";
}

/** Komunikat na /login po nieudanym powrocie (?blad=…). Nieznana wartość – brak komunikatu. */
export function loginErrorMessage(reason: unknown): string {
  switch (reason) {
    case "link":
      return "Link potwierdzający jest nieprawidłowy albo wygasł. Zaloguj się albo załóż konto jeszcze raz.";
    case "google":
      return "Nie udało się zalogować przez Google. Spróbuj ponownie albo zaloguj się e-mailem.";
    case "google-anulowane":
      return "Logowanie przez Google zostało anulowane. Możesz spróbować jeszcze raz albo zalogować się e-mailem.";
    case "google-wygaslo":
      return "Logowanie przez Google trwało zbyt długo i wygasło. Kliknij „Zaloguj przez Google” jeszcze raz.";
    default:
      return "";
  }
}
