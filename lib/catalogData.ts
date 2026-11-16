/**
 * Katalog produktów Azzura Group przepisany ze stron azzuragroup.com/produkty/
 * (stan: listopad 2026). Bez cen: firma podaje ceny tylko w indywidualnych ofertach.
 * Pola, których nie ma na stronie produktu, mają wartość „brak danych na stronie”.
 */

export type Produkt = {
  slug: string;
  nazwa: string;
  marka: string;
  link: string;
  opis: string;
  formaty: string[];
  grubosci: string[];
  zastosowania: string[];
  cechy: string[];
  parametry: Record<string, string>;
};

export const PRODUKTY: Produkt[] = [
  {
    "slug": "ado-kolekcja-podlog-spc",
    "nazwa": "ADO Kolekcja podłóg SPC",
    "marka": "ADO",
    "link": "https://azzuragroup.com/produkty/ado-kolekcja-podlog-spc/",
    "opis": "Wodoodporna podłoga SPC (Stone Plastic Composite) z systemem montażu na zatrzask I4F, łącząca trwałość kompozytu kamienno-polimerowego z naturalnym pięknem drewna. Idealna do pomieszczeń mieszkalnych i komercyjnych.",
    "formaty": [
      "Wymiary desek: 177,8×1219,2 / 228,6×1219,2 / 228,6×1524 / 305×610 / 152,5×610 / 400×800 mm"
    ],
    "grubosci": [
      "4,00 mm (całkowita grubość)"
    ],
    "zastosowania": [
      "Podłogi",
      "Wnętrza",
      "Pomieszczenia mieszkalne i komercyjne"
    ],
    "cechy": [
      "Klasa 33/34 — komercja",
      "100% wodoodporna",
      "I4F Click — bez kleju",
      "Naturalny wzór drewna",
      "Ogrzewanie podłogowe: Tak (max 29°C)",
      "Certyfikaty: FloorScore, GreenGuard, Phthalate Free, I4F, MMFA"
    ],
    "parametry": {
      "Całkowita grubość": "4,00 mm",
      "Warstwa użytkowa": "0,30 mm lub 0,55 mm",
      "Klasyfikacja": "Klasa 33 / 34",
      "Podkład IXPE": "1 mm lub 1,5 mm (opcjonalnie)",
      "Reakcja na ogień": "NFPA Klasa I (ASTM E648)",
      "Odporność na ścieranie": "≥ 5000–7000 cykli (ASTM D4060)",
      "Izolacja akustyczna": "STC 60 / IIC 66"
    }
  },
  {
    "slug": "ado-panele-scienne",
    "nazwa": "ADO Panele Ścienne",
    "marka": "ADO",
    "link": "https://azzuragroup.com/produkty/ado-panele-scienne/",
    "opis": "Panele ścienne ADO to wytrzymały i funkcjonalny system paneli ściennych do wnętrz oraz na zewnątrz. Dzięki kompozytowej konstrukcji SPC i wykończeniom drewnianym i kolorom tworzą trwałe i estetyczne wykończenie.",
    "formaty": [
      "2800 × 200 × 9 mm"
    ],
    "grubosci": [
      "9 mm"
    ],
    "zastosowania": [
      "Ściany i zabudowy",
      "Wnętrza i zewnętrzne"
    ],
    "cechy": [
      "Trwałość na lata",
      "Odporność na wilgoć",
      "Łatwy montaż",
      "Wodoodporność: 100% wodoodporne",
      "Klasa ogniowa: Bfl-S1",
      "Gwarancja: 15 lat"
    ],
    "parametry": {
      "Materiał": "SPC, Wood-Plastic Composite",
      "Format": "2800 × 200 × 9 mm",
      "Waga panelu": "4.6 kg",
      "Klasa zużycia": "AC4",
      "Reakcja na UV": "Stabilna pod wpływem słońca",
      "Wykończenia": "Dąb naturalny, Dąb truflowy, Orzech ciemny, Czarny mat, Antracyt, Kaszmirowy beż, Jasny szary, Dąb piaskowy"
    }
  },
  {
    "slug": "ado-vinylbond",
    "nazwa": "ADO Vinylbond – system elewacyjny",
    "marka": "ADO",
    "link": "https://azzuragroup.com/produkty/ado-vinylbond/",
    "opis": "Nowoczesny system elewacyjny oparty na dekoracyjnych panelach pokrytych zaawansowaną warstwą filmu ADO. Łączy trwałość, odporność na warunki atmosferyczne i ekspresyjny design — do zastosowań zewnętrznych i wewnętrznych.",
    "formaty": [
      "Profile m.in.: RIBBON 150 × 26 mm, FINE 125 × 26 mm, LOG 125 × 26 mm, BEVEL 26 125 × 26 mm, MAXI 165 × 18 mm"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Elewacje budynków",
      "Ściany wewnętrzne",
      "Sufity",
      "Witryny sklepowe",
      "Galerie i muzea",
      "Obiekty publiczne"
    ],
    "cechy": [
      "5× trwalsza niż tradycyjne powłoki",
      "Odporność na UV",
      "4× szybsza aplikacja",
      "Bez malowania",
      "Antybakteryjność: Tak",
      "Recykling: Tak"
    ],
    "parametry": {
      "Linie produktowe": "Ribbon, Fine, Log, Bevel 26, Maxi, Multiline, Barcode, Line, Solid, Karya",
      "Powłoka": "Dekoracyjny film ADO",
      "Odporność": "Woda, ścieranie, uderzenia, UV, ogień",
      "Izolacja akustyczna": "Wysoka",
      "Izolacja cieplna": "Wysoka"
    }
  },
  {
    "slug": "fibrex",
    "nazwa": "Azzura Fibrex",
    "marka": "Azzura",
    "link": "https://azzuragroup.com/produkty/fibrex/",
    "opis": "Płyta cementowo-włóknowa Azzura Fibrex to wszechstronny materiał do aplikacji wewnętrznych i zewnętrznych, łączący niepalność w klasie A1 z doskonałą izolacją akustyczną i termiczną. Wyjątkowa odporność na wilgoć, pleśń i ekstremalne warunki atmosferyczne gwarantuje niezawodność przez ponad 50 lat. Bezazbestowa konstrukcja, łatwy montaż na sucho i mokro oraz elastyczność projektowa.",
    "formaty": [
      "Szerokość: 1200 / 1250 mm",
      "Długość: 2500 / 2800 / 3000 mm"
    ],
    "grubosci": [
      "6, 8, 10, 12, 14, 16, 18, 20 mm"
    ],
    "zastosowania": [
      "Elewacje wentylowane",
      "Okładziny wewnętrzne",
      "Sufity podwieszane",
      "Ściany ogniowe",
      "Podłoże pod płytki w mokrych pomieszczeniach",
      "Pokrycia dachowe"
    ],
    "cechy": [
      "Klasa reakcji na ogień: A1",
      "Żywotność materiału: 50+ lat",
      "Bezazbestowa (typ NT): 0% azbestu",
      "Reakcja na ogień: A1 (EN 13501-1)"
    ],
    "parametry": {
      "Grubość": "6, 8, 10, 12, 14, 16, 18, 20 mm",
      "Długość": "2500 / 2800 / 3000 mm",
      "Szerokość": "1200 / 1250 mm",
      "Gęstość pozorna": "≥ 1,35 g/cm³",
      "Wytrzymałość na zginanie (sucho)": "≥ 10 N/mm² (kat. C, D)",
      "Wytrzymałość na zginanie (mokro)": "≥ 7 N/mm² (kat. A, B)",
      "Wytrzymałość na ściskanie": "≥ 30 N/mm²",
      "Wytrzymałość na rozciąganie": "≥ 2 N/mm² (wzdłuż ≥ 8000 N/mm²)",
      "Reakcja na ogień": "A1 (EN 13501-1)",
      "Wytwarzanie dymu": "s1 (bardzo niskie)",
      "Klasyfikacja produktu": "NT / Kategoria A / Klasa 2",
      "Azbest": "Brak (typ NT)",
      "Nieprzepuszczalność wody": "Pełna (brak kropli)",
      "Odporność na cykle namaczania/suszenia": "≥ 0,75 RL"
    }
  },
  {
    "slug": "azzura-thermofloor",
    "nazwa": "Azzura ThermoFloor",
    "marka": "Azzura",
    "link": "https://azzuragroup.com/produkty/azzura-thermofloor/",
    "opis": "Suchy system ogrzewania podłogowego oparty na panelach z płyty wiórowej P5 o grubości 28 mm, z wyfrezowanymi kanałami i aluminiowymi paskami dyfuzora. Łączy komfort cieplny, oszczędność energii i szybki montaż.",
    "formaty": [
      "1800 × 600 mm"
    ],
    "grubosci": [
      "28 mm"
    ],
    "zastosowania": [
      "Podłogi",
      "Wnętrza",
      "Montaż na betonie (remonty)",
      "Montaż na legarach (konstrukcje szkieletowe, kontenery, budynki drewniane)"
    ],
    "cechy": [
      "Szybszy montaż",
      "Idealny do konstrukcji szkieletowych",
      "Do pomieszczeń suchych i wilgotnych",
      "Dobra izolacja akustyczna",
      "100% recyklingu",
      "Reakcja na ogień: DFL-s1"
    ],
    "parametry": {
      "Materiał": "Płyta wiórowa P5 (warunki wilgotne)",
      "Łączenie": "Pióro-wpust",
      "Średnica rur": "16 mm",
      "Rozstaw rur": "150 mm",
      "Przewodność cieplna": "0,12 W/mK (EN 13986)",
      "Formaldehyd": "E1",
      "Norma": "EN 312, CE (EN 13986)"
    }
  },
  {
    "slug": "plyta-betopan",
    "nazwa": "Płyta cementowo-drzazgowa Betopan",
    "marka": "Betopan",
    "link": "https://azzuragroup.com/produkty/plyta-betopan/",
    "opis": "Kompozytowy materiał budowlany łączący zalety cementu i drewna, o płaskiej, naturalnie szarej powierzchni. Znajduje zastosowanie w budownictwie od fundamentów po dachy — wewnątrz i na zewnątrz.",
    "formaty": [
      "1250 × 2500 / 2800 / 3000 mm"
    ],
    "grubosci": [
      "8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30 mm"
    ],
    "zastosowania": [
      "Budownictwo prefabrykowane",
      "Poszycie podłóg",
      "Poszycie dachów",
      "Okładziny wewnętrzne",
      "Okładziny zewnętrzne",
      "Ogrzewanie podłogowe"
    ],
    "cechy": [
      "Reakcja na ogień: B-s1, d0",
      "Zakres grubości: 8–30 mm",
      "Maks. wymiary (mm): 1250×3000",
      "Norma: EN 13986: 2004+A1:2015"
    ],
    "parametry": {
      "Grubość": "8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30 mm",
      "Wymiary": "1250 × 2500 / 2800 / 3000 mm",
      "Gęstość pozorna (sucho)": "1300 ± 50 kg/m³",
      "Wytrzymałość na zginanie": "≥ 9 N/mm²",
      "Moduł sprężystości": "≥ 4500 N/mm²",
      "Wewnętrzna adhezja": "≥ 0,5 N/mm²",
      "Pęcznienie po 24h w wodzie": "≤ 1,5%",
      "Formaldehyd": "E1",
      "Reakcja na ogień": "B-s1, d0",
      "Przewodność cieplna λ": "0,15 W/m·K",
      "Pochłanianie dźwięku": "0,10 (250–500 Hz) / 0,30 (1000–2000 Hz)",
      "Norma": "EN 13986: 2004+A1:2015"
    }
  },
  {
    "slug": "plyta-boardex",
    "nazwa": "Płyta BoardeX",
    "marka": "BoardeX",
    "link": "https://azzuragroup.com/produkty/plyta-boardex/",
    "opis": "Płyta do poszycia zewnętrznego stosowana w ścianach elewacyjnych. Wzmocniony, odporny na wilgoć rdzeń + welony z włókna szklanego. Klasa A1 (niepalna), odporność na pleśń 10/10 (ASTM D 3273).",
    "formaty": [
      "Szerokość: 1200 mm",
      "Długość: 1200 – 2400 mm"
    ],
    "grubosci": [
      "12,5 mm / 15 mm"
    ],
    "zastosowania": [
      "Elewacje wentylowane",
      "Sufity podwieszane",
      "Ścianki działowe",
      "Konstrukcje suchej zabudowy"
    ],
    "cechy": [
      "Klasa ogniowa: A1",
      "Wymiary (mm): 1200 × 2400",
      "Klasa reakcji na ogień: A1 — niepalna (EN 13501-1)",
      "Odporność na pleśń: 10/10 (ASTM D 3273)",
      "Standard: EN 15283-1+A1 — Płyta gipsowa wzmacniana matą z włókna szklanego"
    ],
    "parametry": {
      "Standard": "EN 15283-1+A1 — Płyta gipsowa wzmacniana matą z włókna szklanego",
      "Typ": "GM - F H1 R",
      "Klasa reakcji na ogień": "A1 — niepalna (EN 13501-1)",
      "Długość": "1200 – 2400 mm",
      "Szerokość": "1200 mm",
      "Grubość": "12,5 mm / 15 mm",
      "Średnia waga": "~10,8 kg/m² (12,5 mm) / ~13,5 kg/m² (15 mm)",
      "Wytrzymałość na ścinanie": "≥ 1000 N",
      "Całkowita absorpcja wody": "≤ 5% (EN 15283-1, H1)",
      "Zmienność liniowa (wilgotność)": "0,004 mm/mt·%RH",
      "Zmienność liniowa (temperatura)": "0,015 mm/mt·°C",
      "Średnica gięcia": "1,5 m",
      "Odporność na pleśń": "10/10 (ASTM D 3273)",
      "Współczynnik oporu dyfuzyjnego μ": "10"
    }
  },
  {
    "slug": "dragonwood",
    "nazwa": "Dragonwood – opalane drewno",
    "marka": "Dragonwood",
    "link": "https://azzuragroup.com/produkty/dragonwood/",
    "opis": "Drewno opalane metodą Shou Sugi Ban — ognioodporne, odporne na wilgoć i odporne na czas. Od japońskiej tradycji po nowoczesne rozwiązania.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Elewacje",
      "Tarasy",
      "Wnętrza",
      "Ogrodzenia"
    ],
    "cechy": [
      "Metoda Shou Sugi Ban",
      "Ognioodporne",
      "Odporne na wilgoć",
      "Gatunki: modrzew, świerk, dąb, daglezja, termo sosna, Accoya",
      "Kolory m.in.: Black, Carbon, Anthracite, Natural, Teak, Stone Grey"
    ],
    "parametry": {
      "Rodzaje drewna": "Modrzew, Świerk, Dąb, Daglezja, Termo Sosna, Accoya",
      "Więcej": "dragonwood.pl"
    }
  },
  {
    "slug": "sklejka-hexa",
    "nazwa": "Sklejka HEXA",
    "marka": "HEXA",
    "link": "https://azzuragroup.com/produkty/sklejka-hexa/",
    "opis": "Wodoodporna sklejka liściasta klasy I z wzorem heksagonalnym. Arkusz 1250 × 2500 mm, odporna na ścieranie i chemię.",
    "formaty": [
      "1250 × 2500"
    ],
    "grubosci": [
      "21 mm"
    ],
    "zastosowania": [
      "Rusztowania",
      "Hale, magazyny",
      "Kontenery sanitarne",
      "Kontenery budowlane"
    ],
    "cechy": [
      "Wymiary (mm): 1250 × 2500",
      "Powierzchnia: wzór HEXA",
      "Rodzaj drewna: liściaste",
      "Odporność: ścieranie, kwasy, zasady, rozpuszczalniki",
      "Klejenie: wodoodporne (WD)"
    ],
    "parametry": {
      "Format": "1250 × 2500",
      "Grubość": "21 mm",
      "Rodzaj drewna": "liściaste",
      "Klejenie": "wodoodporne (WD)",
      "Odporność": "ścieranie, kwasy, zasady, rozpuszczalniki",
      "Powierzchnia": "folia fenolowa, wzór HEXA"
    }
  },
  {
    "slug": "sklejki-laminowane-hpl",
    "nazwa": "Sklejki laminowane HPL",
    "marka": "HPL",
    "link": "https://azzuragroup.com/produkty/sklejki-laminowane-hpl/",
    "opis": "Materiał kompozytowy łączący trwałość sklejki z estetyką warstwy HPL — gotowe rozwiązanie do mebli, wykończeń i elewacji. Odporna na wilgoć, ogień i intensywne użytkowanie.",
    "formaty": [
      "Wymiary standardowe: 3050×1300, 3050×1220, 2800×1300, 2440×1220, 2150×900 mm"
    ],
    "grubosci": [
      "4, 6, 8, 10, 12, 15 mm (do 25 mm)"
    ],
    "zastosowania": [
      "Meble kuchenne",
      "Zabudowy meblowe",
      "Blaty i fronty",
      "Elewacje i balkony",
      "Wnętrza komercyjne",
      "Szpitale i laboratoria"
    ],
    "cechy": [
      "Wytrzymałość na zginanie: ≥ 115 MPa",
      "Reakcja na ogień: B-s2, d0",
      "Gwarancja: 10 lat",
      "Rodzaje: Exterior, Interior, Lab Grade, Anti-Bacterial",
      "Norma: EN 438"
    ],
    "parametry": {
      "Wymiary standardowe": "3050×1300, 3050×1220, 2800×1300, 2440×1220, 2150×900 mm",
      "Grubości": "4, 6, 8, 10, 12, 15 mm (do 25 mm)",
      "Gęstość": "1,521 g/cm³",
      "Reakcja na ogień": "B-s2, d0 (≥ 6 mm)",
      "Wytrzymałość na zginanie": "≥ 115 MPa",
      "Moduł sprężystości": "≥ 9 400 MPa",
      "Siła mocowania (2 mm)": "≥ 1 800 N",
      "Stabilność wymiarowa": "≤ 0,80% (wzdł./poprz.)",
      "Trwałość — wilgoć": "Przyrost masy ≤ 2%",
      "Norma": "EN 438",
      "Gwarancja": "10 lat (blaknięcie, delaminacja)"
    }
  },
  {
    "slug": "masaf-panel-dachowy",
    "nazwa": "Panel dachowy z poliwęglanu Masaf Plast",
    "marka": "Masaf Plast",
    "link": "https://azzuragroup.com/produkty/masaf-panel-dachowy/",
    "opis": "Przezroczysty, 6-ścienny panel dachowy z poliwęglanu — wytrzymały, dobrze izolowany termicznie i chroniony przed UV.",
    "formaty": [
      "Szerokość: 1000 mm ±10",
      "Maks. długość: 13,5 m (zależnie od transportu)"
    ],
    "grubosci": [
      "30 / 40 mm"
    ],
    "zastosowania": [
      "Zadaszenia",
      "Świetliki",
      "Lekkie konstrukcje dachowe",
      "Przemysłowe pokrycia dachowe",
      "Fasady",
      "Systemy oświetlenia dziennego"
    ],
    "cechy": [
      "Grubość: 30 / 40 mm",
      "Waga jednostkowa: 3100 g/m² ±100",
      "Ochrona UV: pojedyncza lub podwójna"
    ],
    "parametry": {
      "Grubość": "30 / 40 mm",
      "Waga jednostkowa": "3100 g/m² ±100",
      "Szerokość": "1000 mm ±10",
      "Maks. długość": "13,5 m (zależnie od transportu)",
      "Konstrukcja": "6-ścienna",
      "Ochrona UV": "pojedyncza lub podwójna",
      "Zakres temperatur": "−40 / +120°C",
      "Kolory": "przezroczysty, opal, brąz, biały, fume, antracyt, czerwony, niebieski, zielony"
    }
  },
  {
    "slug": "masaf-poliweglan-komorowy",
    "nazwa": "Poliwęglan komorowy Masaf Plast",
    "marka": "Masaf Plast",
    "link": "https://azzuragroup.com/produkty/masaf-poliweglan-komorowy/",
    "opis": "Wielokomorowe płyty poliwęglanowe łączące wysoką odporność na uderzenia, doskonałą izolacyjność termiczną i znakomitą przepuszczalność światła.",
    "formaty": [
      "Szerokość: 2100 mm (standard)",
      "Długość: 6000 mm (standard, inne na zamówienie)"
    ],
    "grubosci": [
      "4, 6, 8, 10, 16 mm (2-ścienne); 8, 10 mm (4-ścienne)"
    ],
    "zastosowania": [
      "Pokrycia dachowe",
      "Zadaszenia i świetliki",
      "Ściany wewnętrzne",
      "Elewacje",
      "Sufity",
      "Przegrody przepuszczające światło"
    ],
    "cechy": [
      "Grubość: 4, 6, 8, 10, 16 mm (2-ścienne); 8, 10 mm (4-ścienne)",
      "Szerokość: 2100 mm (standard)",
      "Reakcja na ogień: B-s1,d0",
      "Ochrona UV: pojedyncza lub podwójna"
    ],
    "parametry": {
      "Grubość": "4, 6, 8, 10, 16 mm (2-ścienne); 8, 10 mm (4-ścienne)",
      "Szerokość": "2100 mm (standard)",
      "Długość": "6000 mm (standard, inne na zamówienie)",
      "Konstrukcja": "2 lub 4 ściany",
      "Ochrona UV": "pojedyncza lub podwójna",
      "Reakcja na ogień": "B-s1,d0",
      "Kolory": "przezroczysty, opal, brąz, biały, fume, szary, czerwony, niebieski, zielony"
    }
  },
  {
    "slug": "masaf-poliweglan-lity",
    "nazwa": "Poliwęglan lity Masaf Plast",
    "marka": "Masaf Plast",
    "link": "https://azzuragroup.com/produkty/masaf-poliweglan-lity/",
    "opis": "Praktycznie niezniszczalne lite płyty poliwęglanowe o wyjątkowej estetyce, wysokiej trwałości i doskonałej przepuszczalności światła.",
    "formaty": [
      "2050×3000, 2050×3050, 1220×2440 mm (dowolne na życzenie)"
    ],
    "grubosci": [
      "1–15 mm"
    ],
    "zastosowania": [
      "Przeszklenia odporne na uderzenia",
      "Zadaszenia i świetliki",
      "Ekrany akustyczne",
      "Osłony maszyn i przegrody",
      "Elewacje i przeszklenia architektoniczne",
      "Szklenie antywandalowe"
    ],
    "cechy": [
      "Grubość: 1–15 mm",
      "Wymiary: 2050×3000, 2050×3050, 1220×2440 mm (dowolne na życzenie)",
      "Reakcja na ogień: B-s1,d0 (UL94 V-2)",
      "Przepuszczalność światła: 85%"
    ],
    "parametry": {
      "Grubość": "1–15 mm",
      "Wymiary": "2050×3000, 2050×3050, 1220×2440 mm (dowolne na życzenie)",
      "Faktura": "gładka / teksturowana / diamentowa",
      "Przepuszczalność światła": "85%",
      "Reakcja na ogień": "B-s1,d0 (UL94 V-2)",
      "Wytrzymałość na zginanie": "90 MPa",
      "Gęstość": "1,2 g/cm³",
      "Kolory": "przezroczysty, opal, biały, zielony, niebieski, brąz, fume i inne"
    }
  },
  {
    "slug": "masaf-plyta-pmma-lita",
    "nazwa": "Płyta PMMA lita Masaf Plast",
    "marka": "Masaf Plast",
    "link": "https://azzuragroup.com/produkty/masaf-plyta-pmma-lita/",
    "opis": "Lita płyta PMMA — o połowę lżejsza i odporniejsza na uderzenia niż szkło, przepuszcza do 92% światła i nie pęka nawet przy dużych naprężeniach.",
    "formaty": [
      "Szerokość: 2440, 3000, 3050 mm",
      "Długość: 1220, 2050 mm"
    ],
    "grubosci": [
      "1–15 mm"
    ],
    "zastosowania": [
      "Przeszklenia i zamienniki szkła",
      "Zadaszenia i świetliki",
      "Balustrady i osłony",
      "Przegrody i ścianki działowe",
      "Ekrany akustyczne",
      "Elementy architektoniczne"
    ],
    "cechy": [
      "Grubość: 1–15 mm",
      "Szerokość: 2440, 3000, 3050 mm",
      "Przepuszczalność światła: do 92% (zmętnienie 0,8%)",
      "Ochrona UV: obustronna"
    ],
    "parametry": {
      "Grubość": "1–15 mm",
      "Szerokość": "2440, 3000, 3050 mm",
      "Długość": "1220, 2050 mm",
      "Przepuszczalność światła": "do 92% (zmętnienie 0,8%)",
      "Ochrona UV": "obustronna",
      "Gęstość": "1,19 g/cm³",
      "Wytrzymałość na zginanie": "110 MPa",
      "Kolory": "przezroczysty, opal, brąz, dymiony, niebieski"
    }
  },
  {
    "slug": "masaf-plyta-akrylowa-pmma",
    "nazwa": "Płyta akrylowa PMMA Masaf Plast",
    "marka": "Masaf Plast",
    "link": "https://azzuragroup.com/produkty/masaf-plyta-akrylowa-pmma/",
    "opis": "Przezroczyste, lekkie i trwałe płyty PMMA — do 25× odporniejsze na uderzenia niż szkło, odporne na UV i warunki atmosferyczne.",
    "formaty": [
      "2050×3000, 2050×3050, 1220×2440 mm (na życzenie dowolne)"
    ],
    "grubosci": [
      "1–15 mm"
    ],
    "zastosowania": [
      "Reklama i systemy POS",
      "Szyldy, kasetony i tablice",
      "Dekoracje i wystrój wnętrz",
      "Meble i witryny sklepowe",
      "Osłony i przegrody",
      "Panele podświetlane"
    ],
    "cechy": [
      "Grubość: 1–15 mm",
      "Wymiary: 2050×3000, 2050×3050, 1220×2440 mm (na życzenie dowolne)",
      "Odporność: na UV i warunki atmosferyczne",
      "Odporność na uderzenia: do 25× większa niż szkło"
    ],
    "parametry": {
      "Grubość": "1–15 mm",
      "Wymiary": "2050×3000, 2050×3050, 1220×2440 mm (na życzenie dowolne)",
      "Maks. szerokość": "2500 mm",
      "Wykończenie": "gładkie",
      "Odporność na uderzenia": "do 25× większa niż szkło",
      "Odporność": "na UV i warunki atmosferyczne",
      "Kolory": "przezroczysty, biały, czarny, zielony, czerwony, żółty, pomarańczowy (kolory na życzenie)"
    }
  },
  {
    "slug": "masaf-plyta-trapezowa",
    "nazwa": "Płyta trapezowa z poliwęglanu Masaf Plast",
    "marka": "Masaf Plast",
    "link": "https://azzuragroup.com/produkty/masaf-plyta-trapezowa/",
    "opis": "Trapezowa płyta z poliwęglanu (profil 27/200) — trwała, odporna na temperaturę i uderzenia, z ochroną UV.",
    "formaty": [
      "Szerokość: 1000 mm",
      "Długość: 6000 mm (standard)"
    ],
    "grubosci": [
      "4, 5, 6 mm"
    ],
    "zastosowania": [
      "Zadaszenia",
      "Lekkie zabudowy ścienne",
      "Wiaty i wiaty samochodowe",
      "Przegrody i osłony ścienne",
      "Pokrycia tarasów i pergoli",
      "Elewacje dekoracyjne"
    ],
    "cechy": [
      "Grubość: 4, 5, 6 mm",
      "Waga jednostkowa: 1300–1500 g/m² (wg grubości)",
      "Ochrona UV: pojedyncza lub podwójna"
    ],
    "parametry": {
      "Grubość": "4, 5, 6 mm",
      "Waga jednostkowa": "1300–1500 g/m² (wg grubości)",
      "Profil": "27/200 (trapezowy)",
      "Szerokość": "1000 mm",
      "Długość": "6000 mm (standard)",
      "Ochrona UV": "pojedyncza lub podwójna",
      "Kolory": "przezroczysty, opal, brąz, biały, fume, antracyt, czerwony, niebieski, zielony"
    }
  },
  {
    "slug": "masaf-plyta-petg",
    "nazwa": "Płyty PETG Masaf Plast",
    "marka": "Masaf Plast",
    "link": "https://azzuragroup.com/produkty/masaf-plyta-petg/",
    "opis": "Przezroczyste płyty PET-G z pierwotnego surowca — 89% przepuszczalności światła, niskie zmętnienie i łatwa obróbka.",
    "formaty": [
      "1220×2440 mm (dowolne na życzenie)"
    ],
    "grubosci": [
      "1–15 mm"
    ],
    "zastosowania": [
      "Przeszklenia przezroczyste",
      "Termoformowanie / formowanie próżniowe",
      "Wystrój wnętrz i POS",
      "Osłony maszyn i barierki",
      "Reklama i szyldy",
      "Elementy o wysokiej przejrzystości"
    ],
    "cechy": [
      "Grubość: 1–15 mm",
      "Wymiary: 1220×2440 mm (dowolne na życzenie)",
      "Przepuszczalność światła: 89%"
    ],
    "parametry": {
      "Grubość": "1–15 mm",
      "Wymiary": "1220×2440 mm (dowolne na życzenie)",
      "Maks. szerokość": "2500 mm",
      "Wykończenie": "gładkie",
      "Przepuszczalność światła": "89%",
      "Surowiec": "100% pierwotny",
      "Kolory": "przezroczysty, opal, biały (kolory na życzenie)"
    }
  },
  {
    "slug": "sklejka-rubia-wood",
    "nazwa": "Sklejka Rubia Wood",
    "marka": "Rubia Wood",
    "link": "https://azzuragroup.com/produkty/sklejka-rubia-wood/",
    "opis": "Sklejka liściasta z certyfikowanych plantacji drewna przemysłowego o jasno-kremowym kolorze i jednolitej powierzchni słojów. Średnia gęstość i maszynowo łączony rdzeń zapewniają wysoką stabilność oraz doskonałe trzymanie gwoździ i śrub.",
    "formaty": [
      "Wymiary LGC: 1220–1250 × 2440–2500 mm"
    ],
    "grubosci": [
      "3, 4, 6, 9, 12, 15, 18 mm"
    ],
    "zastosowania": [
      "Meblarstwo",
      "Aranżacja wnętrz",
      "Wykończenia",
      "Opakowania",
      "Szkutnictwo",
      "Sprzęt sportowy"
    ],
    "cechy": [
      "Wymiary (mm): 1220×2440",
      "Zakres grubości: 3–18 mm",
      "Certyfikacja: 100% PEFC"
    ],
    "parametry": {
      "Gatunek": "Neolamarckia Cadamba (Rubiawood)",
      "Kraj pochodzenia": "Malezja",
      "Certyfikacja": "100% PEFC",
      "Wymiary LGC": "1220–1250 × 2440–2500 mm",
      "Grubości": "3, 4, 6, 9, 12, 15, 18 mm",
      "Liczba warstw": "3–13 warstw (zależnie od grubości)",
      "Rodzaj kleju": "Klej fenolowy",
      "Wilgotność": "6–14% (EN 322)",
      "Gęstość": "500–550 kg/m³ (EN 323)",
      "Uwalnianie formaldehydu": "EN 13986 (ANNEX B)",
      "Łączenie": "Klasa 1, 2 i 3 (EN 314-1/2)"
    }
  },
  {
    "slug": "handycoat-all-purpose",
    "nazwa": "Handycoat All-Purpose",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-all-purpose/",
    "opis": "Wszechstronna masa szpachlowa i do spoinowania płyt — wysoka przyczepność, paroprzepuszczalna, do warstw o grubości do 4 mm.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Spoinowanie G-K",
      "Gładzie",
      "Naprawy pęknięć",
      "Ramy drzwiowe",
      "Listwy",
      "Drewno"
    ],
    "cechy": [
      "Spoiwo: Kopolimer akrylowy",
      "Wydajność: 0,5–1,5 kg/m²",
      "Norma: ASTM C-475"
    ],
    "parametry": {
      "Spoiwo": "Kopolimer akrylowy",
      "Wydajność": "0,5–1,5 kg/m²",
      "Gęstość": "1,65–1,75",
      "Lepkość": "100 000–160 000 cP",
      "Norma": "ASTM C-475"
    }
  },
  {
    "slug": "handycoat-ez-joint",
    "nazwa": "Handycoat EZ-Joint",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-ez-joint/",
    "opis": "Specjalistyczna masa do spoinowania płyt gipsowych — zatapia taśmę i siatkę z włókna szklanego, odporna na spływanie, niski skurcz.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Spoinowanie płyt G-K",
      "Zatapianie taśmy",
      "Mocowanie profili narożnikowych",
      "Naprawa pęknięć w tynku"
    ],
    "cechy": [
      "Spoiwo: Akrylan styrenu",
      "Wydajność: 1,75 kg/m² na 1 mm"
    ],
    "parametry": {
      "Spoiwo": "Akrylan styrenu",
      "Wydajność": "1,75 kg/m² na 1 mm",
      "Gęstość": "1,70",
      "Aplikacja": "Szpachelka",
      "Opakowanie": "5 kg, 25 kg"
    }
  },
  {
    "slug": "handycoat-ez-roll",
    "nazwa": "Handycoat EZ-Roll",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-ez-roll/",
    "opis": "Gotowa do użycia gładź nakładana wałkiem gąbkowym — łatwa aplikacja DIY, duża wydajność, idealna do wyrównywania ścian przed malowaniem.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Gładzie na nowych podłożach",
      "Istniejące malowane powierzchnie",
      "Wnętrza",
      "Aplikacje DIY"
    ],
    "cechy": [
      "Spoiwo: Kopolimer akrylowy",
      "Wydajność: 1,0–1,5 kg/m²"
    ],
    "parametry": {
      "Spoiwo": "Kopolimer akrylowy",
      "Wydajność": "1,0–1,5 kg/m²",
      "Grubość warstwy": "maks. 2 mm/warstwę",
      "Gęstość": "1,75",
      "Opakowanie": "5 kg, 25 kg"
    }
  },
  {
    "slug": "handycoat-ez-skim",
    "nazwa": "Handycoat EZ-Skim",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-ez-skim/",
    "opis": "Szybkoschnąca, łatwa do szlifowania masa do wygładzania ścian i sufitów na większości powierzchni budowlanych — daje równą, gotową do malowania powierzchnię.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Gładzie na płytach gipsowych",
      "Tynki cementowo-piaskowe",
      "Beton",
      "Beton lekki"
    ],
    "cechy": [
      "Spoiwo: Kopolimer akrylowy",
      "Wydajność: 0,5–1,5 kg/m²",
      "Norma: ASTM C-475"
    ],
    "parametry": {
      "Spoiwo": "Kopolimer akrylowy",
      "Wydajność": "0,5–1,5 kg/m²",
      "Grubość warstwy": "maks. 2 mm/warstwę",
      "Gęstość": "1,65",
      "Norma": "ASTM C-475"
    }
  },
  {
    "slug": "handycoat-exterior",
    "nazwa": "Handycoat Exterior",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-exterior/",
    "opis": "Elastyczna, szybkoschnąca masa szpachlowa do napraw i wyrównywania powierzchni zewnętrznych i wewnętrznych — z doskonałą odpornością na warunki atmosferyczne.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Elewacje",
      "Sufity i podbitki",
      "Naprawy tynków",
      "Drewno",
      "Beton licowy",
      "Metal ocynkowany"
    ],
    "cechy": [
      "Spoiwo: Akrylan styrenu",
      "Wydajność: 0,5–1,5 kg/m²"
    ],
    "parametry": {
      "Spoiwo": "Akrylan styrenu",
      "Wydajność": "0,5–1,5 kg/m²",
      "Grubość warstwy": "maks. 1 mm",
      "Gęstość": "1,65 ± 0,05",
      "Opakowanie": "5 kg, 25 kg"
    }
  },
  {
    "slug": "handycoat-flex",
    "nazwa": "Handycoat Flex",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-flex/",
    "opis": "Jednoskładnikowy, akrylowy wypełniacz trwale elastyczny (±15%), tworzący wodoodporną spoinę do napraw pęknięć wewnątrz i na zewnątrz budynków.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Pęknięcia w tynku i betonie",
      "Połączenia płyt G-K",
      "Okolice drzwi i okien",
      "Listwy i ościeżnice"
    ],
    "cechy": [
      "Spoiwo: Kopolimer akrylowy",
      "Rozszerzalność: ±15%",
      "Norma: EN 13963:2005"
    ],
    "parametry": {
      "Spoiwo": "Kopolimer akrylowy",
      "Rozszerzalność": "±15%",
      "Gęstość": "1,40",
      "Norma": "EN 13963:2005",
      "Opakowanie": "5 kg, 20 kg"
    }
  },
  {
    "slug": "handycoat-interior",
    "nazwa": "Handycoat Interior",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-interior/",
    "opis": "Uniwersalna, paroprzepuszczalna masa szpachlowa i do spoinowania płyt — do wykonywania gładzi, napraw i wypełnień przed malowaniem.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Spoinowanie płyt gipsowych",
      "Gładzie",
      "Naprawy pęknięć",
      "Otwory po gwoździach",
      "Opaski drzwiowe"
    ],
    "cechy": [
      "Spoiwo: Kopolimer akrylowy",
      "Wydajność: 0,5–1,5 kg/m²",
      "Norma: ASTM C-475"
    ],
    "parametry": {
      "Spoiwo": "Kopolimer akrylowy",
      "Wydajność": "0,5–1,5 kg/m²",
      "Grubość warstwy": "do 4 mm",
      "Gęstość": "1,75",
      "Norma": "ASTM C-475"
    }
  },
  {
    "slug": "handycoat-interior-lite",
    "nazwa": "Handycoat Interior Lite",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-interior-lite/",
    "opis": "Lekka (o 30% lżejsza), elastyczna masa szpachlowa o niskim skurczu — łatwa w aplikacji warstwą do 6 mm i prosta w szlifowaniu.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Spoinowanie G-K",
      "Gładzie",
      "Naprawy pęknięć włoskowatych",
      "Listwy przypodłogowe"
    ],
    "cechy": [
      "Spoiwo: Kopolimer akrylowy",
      "Wydajność: 0,3–1,0 kg/m²",
      "Skurcz: < 5%",
      "Norma: ASTM C-475"
    ],
    "parametry": {
      "Spoiwo": "Kopolimer akrylowy",
      "Wydajność": "0,3–1,0 kg/m²",
      "Grubość warstwy": "maks. 6 mm",
      "Gęstość": "1,25",
      "Skurcz": "< 5%",
      "Norma": "ASTM C-475"
    }
  },
  {
    "slug": "handycoat-lite-exterior",
    "nazwa": "Handycoat Lite Exterior",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-lite-exterior/",
    "opis": "Lekka (do 30% lżejsza), elastyczna masa szpachlowa do prac zewnętrznych i wewnętrznych — łatwa w aplikacji i szlifowaniu, idealna do napraw przed malowaniem.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Elewacje",
      "Ściany i sufity",
      "Podbitki",
      "Drewno",
      "Naprawy tynków i powłok",
      "Odsłonięty beton"
    ],
    "cechy": [
      "Spoiwo: Akrylan styrenu",
      "Wydajność: 0,3–1,0 kg/m³"
    ],
    "parametry": {
      "Spoiwo": "Akrylan styrenu",
      "Wydajność": "0,3–1,0 kg/m³",
      "Grubość warstwy": "maks. 2 mm",
      "Gęstość": "1,10",
      "Opakowanie": "4 kg, 18 kg"
    }
  },
  {
    "slug": "handycoat-washable",
    "nazwa": "Handycoat Washable",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handycoat-washable/",
    "opis": "Zmywalna, wodoodporna masa szpachlowa i spoinująca przeznaczona do pomieszczeń wilgotnych — kuchni, łazienek i korytarzy.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Łazienki",
      "Kuchnie",
      "Korytarze",
      "Spoinowanie G-K",
      "Pomieszczenia wilgotne"
    ],
    "cechy": [
      "Spoiwo: Akrylan styrenu",
      "Wydajność: 0,5–1,5 kg/m²"
    ],
    "parametry": {
      "Spoiwo": "Akrylan styrenu",
      "Wydajność": "0,5–1,5 kg/m²",
      "Grubość warstwy": "maks. 2 mm",
      "Gęstość": "1,65",
      "Opakowanie": "5 kg, 25 kg"
    }
  },
  {
    "slug": "handymate",
    "nazwa": "Handymate Multi-Purpose Filler",
    "marka": "Terraco",
    "link": "https://azzuragroup.com/produkty/handymate/",
    "opis": "Lekki, gotowy do użycia wypełniacz do drobnych napraw ścian i sufitów — schnie w 2–4 godziny, można malować i wiercić po wyschnięciu.",
    "formaty": [
      "brak danych na stronie"
    ],
    "grubosci": [
      "brak danych na stronie"
    ],
    "zastosowania": [
      "Ściany",
      "Sufity",
      "Parapety",
      "Listwy",
      "Gniazdka",
      "Ościeżnice okien i drzwi"
    ],
    "cechy": [
      "Gęstość: 1,20 ± 0,05",
      "pH: 8,0–8,5",
      "Czas schnięcia: 2–4 h"
    ],
    "parametry": {
      "Gęstość": "1,20 ± 0,05",
      "pH": "8,0–8,5",
      "Lepkość": "120 000–140 000 cps",
      "Grubość warstwy": "do 10 mm",
      "Czas schnięcia": "2–4 h",
      "Opakowanie": "Tuba 0,3 l, wiaderka 0,5/1,0/2,5 l"
    }
  },
  {
    "slug": "tromer-crea",
    "nazwa": "Tromer Crea",
    "marka": "Tromer",
    "link": "https://azzuragroup.com/produkty/tromer-crea/",
    "opis": "Panele akustyczne wykonane w 100% z wełny skalnej, zapewniające optymalną absorpcję dźwięku oraz wysoką odporność ogniową. Idealne do różnorodnych zastosowań wewnętrznych w przestrzeniach komercyjnych i edukacyjnych.",
    "formaty": [
      "Wymiary modułu: 600×600 mm, 1200×600 mm"
    ],
    "grubosci": [
      "15 / 20 / 22 / 40 / 50 mm"
    ],
    "zastosowania": [
      "Biura",
      "Sale lekcyjne",
      "Sklepy i markety",
      "Strefy rozrywki",
      "Przestrzenie komercyjne",
      "Restauracje"
    ],
    "cechy": [
      "Materiał rdzenia: 100% wełna skalna (mineralna)",
      "Grubość: 15 / 20 / 22 / 40 / 50 mm",
      "Reakcja na ogień: A1 (niepalny)",
      "Klasa absorpcji: αw 1.00 (Klasa A), NRC 1.00",
      "Norma: EN 13964:2014"
    ],
    "parametry": {
      "Materiał rdzenia": "100% wełna skalna (mineralna)",
      "Grubość": "15 / 20 / 22 / 40 / 50 mm",
      "Wymiary modułu": "600×600 mm, 1200×600 mm",
      "Typy krawędzi": "A15, A24, E15, E24, X, B",
      "Reakcja na ogień": "A1 (niepalny)",
      "Klasa absorpcji": "αw 1.00 (Klasa A), NRC 1.00",
      "Odbicie światła": "87%",
      "Przewodność cieplna": "max. 0,035 W/Mk",
      "Norma": "EN 13964:2014"
    }
  },
  {
    "slug": "tromer-desibel",
    "nazwa": "Tromer Desibel",
    "marka": "Tromer",
    "link": "https://azzuragroup.com/produkty/tromer-desibel/",
    "opis": "Ekologiczne panele akustyczne z wełny skalnej o grubości 12 mm, zapewniające skuteczną absorpcję dźwięku w dużych przestrzeniach handlowych i przemysłowych. Niska emisja i odporność ogniowa A1 czynią je idealnymi do wymagających zastosowań wewnętrznych.",
    "formaty": [
      "Wymiary modułu: 600×600 mm, 1200×600 mm"
    ],
    "grubosci": [
      "12 mm"
    ],
    "zastosowania": [
      "Centra handlowe",
      "Galerie handlowe",
      "Fabryki",
      "Hale przemysłowe",
      "Obiekty komercyjne"
    ],
    "cechy": [
      "Materiał rdzenia: 100% wełna skalna (mineralna)",
      "Grubość: 12 mm",
      "Reakcja na ogień: A1 (niepalny)",
      "Klasa absorpcji: αw 0.80 (Klasa A)",
      "Norma: EN 13964:2014"
    ],
    "parametry": {
      "Materiał rdzenia": "100% wełna skalna (mineralna)",
      "Grubość": "12 mm",
      "Wymiary modułu": "600×600 mm, 1200×600 mm",
      "Typy krawędzi": "A15, A24",
      "Reakcja na ogień": "A1 (niepalny)",
      "Klasa absorpcji": "αw 0.80 (Klasa A)",
      "Odbicie światła": "86%",
      "Przewodność cieplna": "max. 0,036 W/Mk",
      "Norma": "EN 13964:2014"
    }
  },
  {
    "slug": "tromer-kyra",
    "nazwa": "Tromer Kyra",
    "marka": "Tromer",
    "link": "https://azzuragroup.com/produkty/tromer-kyra/",
    "opis": "Panele akustyczne z wełny skalnej z powlekaną krawędzią typu E, oferujące wysoką absorpcję dźwięku i estetyczne wykończenie. Łatwe w utrzymaniu czystości, idealne do przestrzeni publicznych i komercyjnych.",
    "formaty": [
      "Wymiary modułu: 600×600 mm, 1200×600 mm"
    ],
    "grubosci": [
      "15 mm"
    ],
    "zastosowania": [
      "Biura",
      "Sale lekcyjne",
      "Korytarze",
      "Centra handlowe",
      "Biblioteki"
    ],
    "cechy": [
      "Materiał rdzenia: 100% wełna skalna (mineralna)",
      "Grubość: 15 mm",
      "Reakcja na ogień: A1 (niepalny)",
      "Klasa absorpcji: αw 0.95 (Klasa A), NRC 0.90",
      "Norma: EN 13964:2014"
    ],
    "parametry": {
      "Materiał rdzenia": "100% wełna skalna (mineralna)",
      "Grubość": "15 mm",
      "Wymiary modułu": "600×600 mm, 1200×600 mm",
      "Typy krawędzi": "A15, A24, E15, E24",
      "Reakcja na ogień": "A1 (niepalny)",
      "Klasa absorpcji": "αw 0.95 (Klasa A), NRC 0.90",
      "Odbicie światła": "86%",
      "Przewodność cieplna": "max. 0,035 W/Mk",
      "Norma": "EN 13964:2014"
    }
  },
  {
    "slug": "tromer-mediceil",
    "nazwa": "Tromer Mediceil",
    "marka": "Tromer",
    "link": "https://azzuragroup.com/produkty/tromer-mediceil/",
    "opis": "Specjalistyczne panele akustyczne z wełny skalnej, powlekane jednostronnie, zaprojektowane z myślą o placówkach medycznych. Łączą wysoką absorpcję dźwięku z odpornością na rozwój mikroorganizmów i łatwością utrzymania higieny.",
    "formaty": [
      "Wymiary modułu: 600×600 mm, 1200×600 mm"
    ],
    "grubosci": [
      "15 / 20 mm"
    ],
    "zastosowania": [
      "Szpitale",
      "Centra zdrowia",
      "Placówki medyczne",
      "Gabinety lekarskie",
      "Kliniki"
    ],
    "cechy": [
      "Materiał rdzenia: 100% wełna skalna, powlekana jednostronnie",
      "Grubość: 15 / 20 mm",
      "Reakcja na ogień: A1 (niepalny)",
      "Klasa absorpcji: αw 0.95 (Klasa A), NRC 0.90",
      "Norma: EN 13964:2014"
    ],
    "parametry": {
      "Materiał rdzenia": "100% wełna skalna, powlekana jednostronnie",
      "Grubość": "15 / 20 mm",
      "Wymiary modułu": "600×600 mm, 1200×600 mm",
      "Typy krawędzi": "A15, A24, E15, E24",
      "Reakcja na ogień": "A1 (niepalny)",
      "Klasa absorpcji": "αw 0.95 (Klasa A), NRC 0.90",
      "Odbicie światła": "86%",
      "Przewodność cieplna": "max. 0,035 W/Mk",
      "Norma": "EN 13964:2014"
    }
  },
  {
    "slug": "tromer-mood",
    "nazwa": "Tromer Mood",
    "marka": "Tromer",
    "link": "https://azzuragroup.com/produkty/tromer-mood/",
    "opis": "Stylowe panele akustyczne z wełny skalnej, zaprojektowane do wnętrz, w których estetyka spotyka się z funkcjonalnością. Doskonała absorpcja dźwięku i wysoka jakość wykończenia sprawiają, że idealnie sprawdzają się w butikach, hotelach i przestrzeniach premium.",
    "formaty": [
      "Wymiary modułu: 600×600 mm, 1200×600 mm"
    ],
    "grubosci": [
      "15 mm"
    ],
    "zastosowania": [
      "Butiki i sklepy",
      "Galerie sztuki",
      "Showroomy",
      "Wnętrza na zamówienie",
      "Hotele",
      "Apartamenty premium"
    ],
    "cechy": [
      "Materiał rdzenia: 100% wełna skalna (mineralna)",
      "Grubość: 15 mm",
      "Reakcja na ogień: A1 (niepalny)",
      "Klasa absorpcji: αw 0.90 (Klasa A), NRC 0.90",
      "Norma: EN 13964:2014"
    ],
    "parametry": {
      "Materiał rdzenia": "100% wełna skalna (mineralna)",
      "Grubość": "15 mm",
      "Wymiary modułu": "600×600 mm, 1200×600 mm",
      "Typy krawędzi": "A15, A24, E15, E24",
      "Reakcja na ogień": "A1 (niepalny)",
      "Klasa absorpcji": "αw 0.90 (Klasa A), NRC 0.90",
      "Odbicie światła": "85%",
      "Przewodność cieplna": "max. 0,035 W/Mk",
      "Norma": "EN 13964:2014"
    }
  },
  {
    "slug": "tromer-prime",
    "nazwa": "Tromer Prime",
    "marka": "Tromer",
    "link": "https://azzuragroup.com/produkty/tromer-prime/",
    "opis": "Doskonałe połączenie elegancji, trwałości i funkcjonalności — stworzone z myślą o nowoczesnych przestrzeniach komercyjnych. Prime to idealny wybór dla supermarketów, sklepów detalicznych i budynków biurowych, wszędzie tam, gdzie estetyka spotyka się z funkcjonalnością.",
    "formaty": [
      "Wymiary modułu: 600×600 mm, 1200×600 mm"
    ],
    "grubosci": [
      "15 mm"
    ],
    "zastosowania": [
      "Centra handlowe",
      "Supermarkety",
      "Biura",
      "Placówki edukacyjne"
    ],
    "cechy": [
      "Materiał rdzenia: 100% wełna skalna (mineralna)",
      "Grubość: 15 mm",
      "Reakcja na ogień: A1 (niepalny)",
      "Klasa absorpcji: αw 0.90 (Klasa A)",
      "Norma: EN 13964:2014"
    ],
    "parametry": {
      "Materiał rdzenia": "100% wełna skalna (mineralna)",
      "Grubość": "15 mm",
      "Wymiary modułu": "600×600 mm, 1200×600 mm",
      "Typy krawędzi": "A15, A24",
      "Reakcja na ogień": "A1 (niepalny)",
      "Klasa absorpcji": "αw 0.90 (Klasa A)",
      "Odbicie światła": "82%",
      "Przewodność cieplna": "max. 0,036 W/Mk",
      "Norma": "EN 13964:2014"
    }
  },
  {
    "slug": "tromer-rainbow",
    "nazwa": "Tromer Rainbow",
    "marka": "Tromer",
    "link": "https://azzuragroup.com/produkty/tromer-rainbow/",
    "opis": "Panele akustyczne z wełny skalnej dostępne w 10 kolorach, łączące doskonałą absorpcję dźwięku z efektowną estetyką. Idealne do sal kinowych, teatralnych i innych przestrzeni, w których liczy się zarówno akustyka, jak i wygląd.",
    "formaty": [
      "Wymiary modułu: 600×600 mm, 1200×600 mm"
    ],
    "grubosci": [
      "15 mm"
    ],
    "zastosowania": [
      "Sale kinowe",
      "Sale teatralne",
      "Amfiteatry",
      "Studia nagrań",
      "Biura"
    ],
    "cechy": [
      "Materiał rdzenia: 100% wełna skalna (mineralna)",
      "Kolory: 10 kolorów (szary, żółty, ciemny szary, beżowy, niebieski, pomarańczowy, zielony, czerwony, jasnoniebieski, ciemnozielony)",
      "Reakcja na ogień: A1 (niepalny)",
      "Klasa absorpcji: αw 0.95 (Klasa A), NRC 0.90",
      "Norma: EN 13964:2014"
    ],
    "parametry": {
      "Materiał rdzenia": "100% wełna skalna (mineralna)",
      "Kolory": "10 kolorów (szary, żółty, ciemny szary, beżowy, niebieski, pomarańczowy, zielony, czerwony, jasnoniebieski, ciemnozielony)",
      "Grubość": "15 mm",
      "Wymiary modułu": "600×600 mm, 1200×600 mm",
      "Typy krawędzi": "A15, A24, E15, E24",
      "Reakcja na ogień": "A1 (niepalny)",
      "Klasa absorpcji": "αw 0.95 (Klasa A), NRC 0.90",
      "Odbicie światła": "Zmienne (zależne od koloru)",
      "Norma": "EN 13964:2014"
    }
  }
];

const normalize = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase();

const slowaZ = (t: string) => normalize(t).split(/[^a-z0-9]+/).filter((s) => s.length >= 2);

/**
 * Rdzeń słowa bez polskiej końcówki, żeby „szpitala” pasowało do „szpitale”,
 * a „podłogowe” do „podłogowego”. Krótkie słowa porównujemy dokładnie.
 */
const rdzen = (s: string) => s.slice(0, Math.max(4, s.length - 2));

const pasuje = (slowo: string, slowaPola: string[]) =>
  slowaPola.some((w) => (slowo.length >= 5 ? w.startsWith(rdzen(slowo)) : w === slowo));

const POLA = PRODUKTY.map((p) => ({
  p,
  nazwa: slowaZ(`${p.nazwa} ${p.slug}`),
  marka: slowaZ(p.marka),
  zast: slowaZ(p.zastosowania.join(" ")),
  reszta: slowaZ(`${p.opis} ${p.cechy.join(" ")}`),
}));

/**
 * Wyszukuje produkty po nazwie, marce, zastosowaniu lub opisie.
 * Słowa występujące w wielu produktach (np. „płyta”) ważą mniej.
 * Zwraca najwyżej `limit` najlepiej pasujących produktów.
 */
export function szukajProduktow(zapytanie: string, limit = 5): Produkt[] {
  const slowa = slowaZ(zapytanie).filter((s) => s.length >= 3);
  if (slowa.length === 0) return [];
  const waga = new Map(
    slowa.map((s) => {
      const ile = POLA.filter((f) => pasuje(s, [...f.nazwa, ...f.marka, ...f.zast, ...f.reszta])).length;
      return [s, ile === 0 ? 0 : 1 / ile];
    }),
  );
  return POLA.map((f) => {
    let punkty = 0;
    for (const s of slowa) {
      const w = waga.get(s) ?? 0;
      if (pasuje(s, f.nazwa)) punkty += 5 * w;
      if (pasuje(s, f.marka)) punkty += 4 * w;
      if (pasuje(s, f.zast)) punkty += 3 * w;
      if (pasuje(s, f.reszta)) punkty += 1 * w;
    }
    return { p: f.p, punkty };
  })
    .filter((w) => w.punkty > 0)
    .sort((a, b) => b.punkty - a.punkty)
    .slice(0, limit)
    .map((w) => w.p);
}

export const MARKI = [...new Set(PRODUKTY.map((p) => p.marka))];

