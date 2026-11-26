// Subscriptions widget for Scriptable (iPhone home screen, lock screen, and Mac desktop via iPhone widgets).
// Shows your upcoming charges from @skpsubsssbot. The key below only reads your own list.
const KEY = "__WIDGET_KEY__";
const API = "https://skpsubs-reminders.skpsubs.workers.dev/widget?key=" + encodeURIComponent(KEY);
const OPEN_URL = "https://t.me/skpsubsssbot";

const C = {
  bg: Color.dynamic(new Color("#f2f3f5"), new Color("#0e0f10")),
  card: Color.dynamic(new Color("#ffffff"), new Color("#1a1b1d")),
  ink: Color.dynamic(new Color("#111214"), new Color("#f3f4f5")),
  muted: Color.dynamic(new Color("#6c7077"), new Color("#8d9198")),
  lime: new Color("#c4ef4a"),
  limeInk: new Color("#10140a"),
  limeText: Color.dynamic(new Color("#4f6b00"), new Color("#c4ef4a")),
};

const L = {
  uk: { title: "Підписки", month: "на місяць", today: "Сьогодні", tomorrow: "Завтра", inDays: (n) => "Через " + n + " " + plural(n, "день", "дні", "днів"),
        next: "Наступне", none: "Підписок поки немає", noneHint: "Додайте в боті", offline: "Немає зв’язку", badKey: "Ключ не підходить. Скопіюйте скрипт у боті ще раз." },
  en: { title: "Subscriptions", month: "per month", today: "Today", tomorrow: "Tomorrow", inDays: (n) => "In " + n + " days",
        next: "Next", none: "No subscriptions yet", noneHint: "Add them in the bot", offline: "Offline", badKey: "Key not recognised. Copy the script from the bot again." },
};
function plural(n, one, few, many) { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return one; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few; return many; }
function uah(v) { return Math.round(v).toLocaleString("uk-UA").replace(/ | /g, " ") + " ₴"; }
function uah2(v) { return v.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ | /g, " ") + " ₴"; }
function usd(v) { return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function price(it) { return it.currency === "USD" ? usd(it.price) : uah2(it.price); }

// ---------- data, with a cached copy for when the phone is offline ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), "skpsubs-widget.json");
async function load() {
  try {
    const req = new Request(API);
    req.timeoutInterval = 10;
    const data = await req.loadJSON();
    if (data && data.ok) { fm.writeString(cachePath, JSON.stringify(data)); return { data }; }
    return { error: data && data.error === "unknown_key" ? "badKey" : "offline" };
  } catch (e) {
    if (fm.fileExists(cachePath)) return { data: JSON.parse(fm.readString(cachePath)), stale: true };
    return { error: "offline" };
  }
}
function whenText(t, d) { return d <= 0 ? t.today : d === 1 ? t.tomorrow : t.inDays(d); }

// ---------- building blocks ----------
function text(stack, s, size, weight, color, lines) {
  const el = stack.addText(s);
  el.font = weight === "bold" ? Font.boldSystemFont(size) : weight === "semi" ? Font.semiboldSystemFont(size) : Font.systemFont(size);
  el.textColor = color;
  el.lineLimit = lines || 1;
  el.minimumScaleFactor = 0.7;
  return el;
}
function pill(stack, s) {
  const p = stack.addStack();
  p.backgroundColor = C.lime; p.cornerRadius = 7; p.setPadding(2, 6, 2, 6);
  text(p, s, 10, "semi", C.limeInk);
}
function row(parent, it, t, compact) {
  const r = parent.addStack();
  r.layoutHorizontally(); r.centerAlignContent();
  const dot = r.addStack();
  dot.size = new Size(compact ? 22 : 26, compact ? 22 : 26); dot.cornerRadius = 7;
  dot.backgroundColor = it.days <= 7 ? C.lime : C.card; dot.centerAlignContent();
  text(dot, (it.name.trim()[0] || "?").toUpperCase(), compact ? 11 : 12, "semi", it.days <= 7 ? C.limeInk : C.muted);
  r.addSpacer(8);
  const mid = r.addStack(); mid.layoutVertically();
  text(mid, it.name, compact ? 12 : 13, "semi", C.ink);
  text(mid, whenText(t, it.days), compact ? 10 : 11, "", it.days <= 7 ? C.limeText : C.muted);
  r.addSpacer();
  text(r, price(it), compact ? 12 : 13, "semi", C.ink);
}

// ---------- layouts ----------
function build(res) {
  const fam = config.widgetFamily || "medium";
  const w = new ListWidget();
  w.url = OPEN_URL;
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  const t = L[(res.data && res.data.lang) === "en" ? "en" : "uk"];

  // Lock screen
  if (fam.startsWith("accessory")) {
    const it = res.data && res.data.items[0];
    if (fam === "accessoryInline") { w.addText(it ? it.name + " · " + whenText(t, it.days) : t.title); return w; }
    if (fam === "accessoryCircular") { const s = w.addText(it ? String(Math.max(0, it.days)) : "–"); s.font = Font.boldSystemFont(20); s.centerAlignText(); return w; }
    text(w, t.next.toUpperCase(), 10, "semi", Color.white());
    text(w, it ? it.name : t.none, 14, "bold", Color.white());
    text(w, it ? whenText(t, it.days) + " · " + price(it) : "", 12, "", Color.white());
    return w;
  }

  w.backgroundColor = C.bg;
  w.setPadding(14, 14, 14, 14);
  if (res.error) {
    text(w, t.title, 15, "bold", C.ink); w.addSpacer(6);
    text(w, res.error === "badKey" ? t.badKey : t.offline, 12, "", C.muted, 4);
    return w;
  }
  const d = res.data;
  if (!d.items.length) {
    text(w, t.title, 15, "bold", C.ink); w.addSpacer();
    text(w, t.none, 13, "semi", C.ink, 2); text(w, t.noneHint, 11, "", C.muted);
    return w;
  }

  if (fam === "small") {
    const it = d.items[0];
    text(w, t.next.toUpperCase(), 10, "semi", C.muted);
    w.addSpacer(4);
    text(w, it.name, 16, "bold", C.ink, 2);
    w.addSpacer(4);
    const h = w.addStack(); pill(h, whenText(t, it.days));
    w.addSpacer(4);
    text(w, price(it), 14, "semi", C.ink);
    w.addSpacer();
    text(w, uah(d.monthUAH) + " " + t.month, 11, "", C.muted);
    return w;
  }

  // medium / large
  const head = w.addStack(); head.layoutHorizontally(); head.bottomAlignContent();
  const left = head.addStack(); left.layoutVertically();
  text(left, t.title, 13, "semi", C.muted);
  text(left, uah(d.monthUAH), fam === "medium" ? 22 : 28, "bold", C.ink);
  head.addSpacer();
  text(head, "≈ " + usd(d.monthUSD) + " " + t.month, 11, "", C.limeText);
  w.addSpacer(fam === "medium" ? 8 : 12);

  const n = fam === "medium" ? 3 : fam === "large" ? 6 : 8;
  const list = w.addStack(); list.layoutVertically();
  d.items.slice(0, n).forEach((it, i) => { if (i) list.addSpacer(fam === "medium" ? 6 : 9); row(list, it, t, fam === "medium"); });
  w.addSpacer();
  return w;
}

const res = await load();
const widget = build(res);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
