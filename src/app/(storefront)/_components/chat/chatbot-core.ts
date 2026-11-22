/**
 * RESHMAM shopping assistant.
 *
 * A guided, rule-based chat assistant: quick options, product browsing,
 * recommendations, offers, order tracking and hand-over to the support team on
 * WhatsApp. It answers only from the store's own data (catalogue, offers,
 * FAQ) and never invents prices, offers or order details.
 *
 * Framework-agnostic on purpose: the Next.js site mounts it from a client
 * component, and the static preview mounts the very same code.
 */

export type ChatVariant = { id: string; label: string; price: number; stock: number };
export type ChatProduct = {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  kind: string;
  branchName: string;
  image: string;
  imageAlt: string;
  summary: string;
  description: string[];
  uses: string[];
  notice?: string;
  variants: ChatVariant[];
};
export type ChatCategory = { slug: string; name: string; shortName: string; image: string };
export type ChatOrder = {
  orderNumber: string;
  status: string;
  total: number;
  items: { product_name: string; variant_label: string; quantity: number }[];
};

export type ChatConfig = {
  products: ChatProduct[];
  categories: ChatCategory[];
  offers: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
  phone: { display: string; tel: string };
  email: string;
  whatsappNumber: string;
  /** Turns a site path (e.g. "/images/x.webp") into a usable URL. */
  asset: (path: string) => string;
  addToCart: (variantId: string, quantity: number) => void;
  navigate: (href: string) => void;
  lookupOrder: (orderNumber: string, email: string) => Promise<{ ok: true; order: ChatOrder } | { ok: false; error: string }>;
};

const STEPS = [
  { keys: ["placed", "paid"], label: "Order Confirmed" },
  { keys: ["processing"], label: "Processing" },
  { keys: ["packed"], label: "Packed" },
  { keys: ["shipped"], label: "Shipped" },
  { keys: ["out_for_delivery"], label: "Out for Delivery" },
  { keys: ["delivered"], label: "Delivered" },
];

const NEEDS: { id: string; label: string; match: (p: ChatProduct) => boolean; note: string }[] = [
  {
    id: "everyday",
    label: "Everyday cooking",
    match: (p) => p.kind === "single" && (p.category === "groundnut-oil" || p.category === "gingelly-oil"),
    note: "Groundnut and gingelly oils are the everyday choice in most South Indian kitchens.",
  },
  {
    id: "frying",
    label: "Deep frying",
    match: (p) => p.kind === "single" && p.category === "groundnut-oil",
    note: "Groundnut oil has a mild taste and is traditionally used for frying.",
  },
  {
    id: "tempering",
    label: "Tempering & traditional dishes",
    match: (p) => p.kind === "single" && p.category === "gingelly-oil",
    note: "Gingelly (sesame) oil brings the classic aroma to tempering, kuzhambu and idli podi.",
  },
  {
    id: "hair",
    label: "Hair & skin care",
    match: (p) => p.kind === "single" && p.category === "coconut-oil",
    note: "Coconut oil is traditionally used for hair oiling and massage.",
  },
  {
    id: "family",
    label: "Large family / value packs",
    match: (p) => p.kind === "pack",
    note: "Family packs give you more oil at a better value.",
  },
  {
    id: "gift",
    label: "Gifting",
    match: (p) => p.kind === "combo",
    note: "Our gift pack brings our oils together in one box.",
  },
];

const ICON = {
  bot: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#e7f0dc"/><rect x="8" y="10" width="16" height="13" rx="5" fill="#064b2b"/><circle cx="13" cy="16.5" r="2" fill="#fff"/><circle cx="19" cy="16.5" r="2" fill="#fff"/><path d="M16 6v4" stroke="#064b2b" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="5.5" r="1.6" fill="#c99543"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.9 2 11.7c0 2.4 1.1 4.6 3 6.2L4 21.5l4.3-2.1c1.2.4 2.4.6 3.7.6 5.5 0 10-3.9 10-8.7S17.5 3 12 3Zm-4.5 10a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm4.5 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Zm4.5 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5a9.4 9.4 0 0 0-8.1 14.2L2.5 21.5l4.9-1.3A9.4 9.4 0 1 0 12 2.5Zm4.2 11.3c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z"/></svg>',
};

const MENU = [
  { id: "explore", label: "Explore Products", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>' },
  { id: "recommend", label: "Find the Right Product", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>' },
  { id: "details", label: "Product Details", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>' },
  { id: "offers", label: "Offers & Delivery", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12.5V4h8.5l8.5 8.5-8 8-9-8Z"/><circle cx="8" cy="8.5" r="1.4"/></svg>' },
  { id: "track", label: "Track My Order", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/></svg>' },
  { id: "support", label: "Talk to Customer Support", icon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19c0 1.5-2 2.5-5 2.5"/></svg>' },
];

const CSS = `
.rc-root{--g9:#003b22;--g8:#064b2b;--leaf:#4d8a38;--leaf1:#e7f0dc;--cream:#fff9ea;--beige:#f4ebd8;--b3:#e6d8ba;--gold:#c99543;--ink:#202820;--soft:#4a524a;
  font-family:"Inter","Inter Variable",ui-sans-serif,system-ui,sans-serif;font-size:14px;color:var(--ink);line-height:1.45}
.rc-root *{box-sizing:border-box}
.rc-launch{position:fixed;z-index:55;right:calc(20px + env(safe-area-inset-right,0px));bottom:calc(20px + env(safe-area-inset-bottom,0px));display:flex;align-items:flex-end;gap:10px}
.rc-fab{position:relative;width:60px;height:60px;border-radius:50%;border:3px solid #fff;background:var(--g8);color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 24px -6px rgb(0 59 34/.55);transition:transform .2s}
.rc-fab:hover{transform:scale(1.05)} .rc-fab svg{width:28px;height:28px}
.rc-fab:focus-visible,.rc-root button:focus-visible,.rc-root a:focus-visible,.rc-root input:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.rc-dot{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#c62828;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;border:2px solid #fff}
.rc-tip{background:#fff;border:1px solid var(--b3);border-radius:14px 14px 4px 14px;padding:10px 14px;box-shadow:0 6px 20px -8px rgb(0 0 0/.25);font-size:13px;max-width:190px;position:relative}
.rc-tip strong{display:block;color:var(--g9)} .rc-tip button{position:absolute;top:-8px;left:-8px;width:22px;height:22px;border-radius:50%;border:1px solid var(--b3);background:#fff;cursor:pointer;display:grid;place-items:center;padding:0;color:var(--soft)}
.rc-tip button svg{width:12px;height:12px}
.rc-panel{position:fixed;z-index:56;right:calc(20px + env(safe-area-inset-right,0px));bottom:calc(20px + env(safe-area-inset-bottom,0px));width:min(390px,calc(100vw - 32px));height:min(640px,calc(100vh - 110px));background:#fff;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 60px -12px rgb(0 30 15/.45);border:1px solid var(--b3)}
@media (max-width:520px){.rc-panel{inset:0;width:auto;height:auto;border-radius:0;border:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);background:var(--g8)}.rc-panel>*{background:#fff}.rc-head{background:var(--g8)!important}}
.rc-head{background:var(--g8);color:#fff;display:flex;align-items:center;gap:10px;padding:12px 12px 12px 14px}
.rc-head .rc-av{width:40px;height:40px;border-radius:50%;background:#fff;display:grid;place-items:center;flex:none}
.rc-head .rc-av svg{width:34px;height:34px}
.rc-head h2{margin:0;font-size:15px;font-weight:700;font-family:inherit}
.rc-head p{margin:0;font-size:12px;color:#d6e8cf;display:flex;align-items:center;gap:6px}
.rc-head p::before{content:"";width:8px;height:8px;border-radius:50%;background:#7bd389}
.rc-head .rc-hb{margin-left:auto;display:flex;gap:2px}
.rc-head button{width:36px;height:36px;border-radius:50%;border:0;background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center}
.rc-head button:hover{background:rgb(255 255 255/.12)} .rc-head button svg{width:20px;height:20px}
.rc-log{flex:1;min-height:0;overflow-y:auto;padding:16px 14px;background:var(--cream);display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}
.rc-log>*{flex-shrink:0}
.rc-row{display:flex;gap:8px;align-items:flex-start}
.rc-row .rc-mini{width:30px;height:30px;flex:none} .rc-row .rc-mini svg{width:30px;height:30px}
.rc-bub{background:#fff;border:1px solid var(--b3);border-radius:4px 14px 14px 14px;padding:10px 12px;max-width:100%;min-width:0;flex:1}
.rc-bub p{margin:0} .rc-bub p+p{margin-top:6px}
.rc-user{align-self:flex-end;background:var(--g8);color:#fff;border-radius:14px 14px 4px 14px;padding:9px 13px;max-width:80%;overflow-wrap:anywhere}
.rc-opts{display:flex;flex-direction:column;gap:8px;margin-left:38px}
.rc-opt{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#fff;border:1px solid var(--b3);border-radius:12px;padding:10px 12px;cursor:pointer;font:inherit;color:var(--g9);font-weight:600;min-height:44px}
.rc-opt:hover{border-color:var(--g8);background:#fbfff7}
.rc-opt .rc-oi{width:30px;height:30px;border-radius:8px;background:var(--leaf1);color:var(--g8);display:grid;place-items:center;flex:none}.rc-opt .rc-oi svg{width:18px;height:18px}
.rc-opt .rc-ch{margin-left:auto;width:16px;height:16px;color:var(--soft)}
.rc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-left:38px}
.rc-chip{border:1px solid var(--g8);background:#fff;color:var(--g8);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;min-height:36px}
.rc-chip:hover{background:var(--g8);color:#fff}
.rc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-left:38px}
.rc-cat{border:1px solid var(--b3);border-radius:12px;background:#fff;overflow:hidden;cursor:pointer;padding:0;font:inherit;text-align:center}
.rc-cat img{width:100%;aspect-ratio:3/2;object-fit:contain;display:block;background:#fff;padding:4px;box-sizing:border-box}
.rc-cat span{display:block;padding:7px 6px;font-weight:600;font-size:13px;color:var(--g9)}
.rc-cat:hover{border-color:var(--g8)}
.rc-list{display:flex;flex-direction:column;gap:8px;margin-left:38px}
.rc-prod{display:flex;gap:10px;align-items:center;border:1px solid var(--b3);border-radius:12px;background:#fff;padding:8px}
.rc-prod img{width:76px;height:64px;object-fit:cover;border-radius:8px;flex:none;background:var(--beige)}
.rc-prod .rc-pi{min-width:0;flex:1}
.rc-prod strong{display:block;font-size:13px;color:var(--g9);line-height:1.3}
.rc-prod small{display:block;color:var(--soft);font-size:11px;margin-top:2px}
.rc-prod .rc-pr{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px}.rc-prod .rc-price{font-weight:700;font-size:15px}
.rc-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:8px;background:var(--g8);color:#fff;font:inherit;font-weight:600;font-size:13px;padding:7px 12px;cursor:pointer;min-height:34px;text-decoration:none}
.rc-btn:hover{background:var(--g9)} .rc-btn[disabled]{opacity:.5;cursor:not-allowed}
.rc-btn.rc-wide{width:100%;min-height:42px;font-size:14px}
.rc-btn.rc-ghost{background:#fff;color:var(--g8);border:1px solid var(--g8)}
.rc-btn.rc-wa{background:#188643} .rc-btn.rc-wa:hover{background:#11703a} .rc-btn svg{width:18px;height:18px}
.rc-card{margin-left:38px;border:1px solid var(--b3);border-radius:14px;background:#fff;overflow:hidden}
.rc-card .rc-top{display:flex;gap:12px;padding:12px}
.rc-card .rc-top img{width:96px;height:96px;object-fit:cover;border-radius:10px;flex:none;background:var(--beige)}
.rc-card h3{margin:0;font-size:15px;color:var(--g9);font-family:inherit}
.rc-card .rc-price{font-size:20px;font-weight:700;margin-top:4px}
.rc-card .rc-sum{font-size:12px;color:var(--soft);margin-top:4px}
.rc-badge{display:inline-block;margin-top:4px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:999px;background:var(--leaf1);color:var(--g8)}
.rc-note{margin:0 12px 10px;padding:8px 10px;border-radius:8px;background:#fdf1e6;color:#8a4a12;font-size:12px;font-weight:600}
.rc-sizes{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px}
.rc-size{border:1px solid var(--b3);background:#fff;border-radius:8px;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer;min-height:34px}
.rc-size[aria-pressed=true]{background:var(--g8);color:#fff;border-color:var(--g8)}
.rc-size[disabled]{text-decoration:line-through;opacity:.55}
.rc-buy{display:flex;gap:8px;align-items:center;padding:12px}
.rc-qty{display:inline-flex;align-items:center;border:1px solid var(--b3);border-radius:8px}
.rc-qty button{width:34px;height:38px;border:0;background:transparent;font-size:18px;color:var(--g8);cursor:pointer}
.rc-qty span{width:26px;text-align:center;font-weight:700}
.rc-buy .rc-btn{flex:1;min-height:40px}
.rc-more{border-top:1px solid var(--b3)}
.rc-more details{border-bottom:1px solid var(--b3)} .rc-more details:last-child{border-bottom:0}
.rc-more summary{cursor:pointer;padding:10px 12px;font-weight:600;color:var(--g9);list-style:none;display:flex;justify-content:space-between}
.rc-more summary::-webkit-details-marker{display:none}
.rc-more summary::after{content:"+";color:var(--g8)} .rc-more details[open] summary::after{content:"–"}
.rc-more ul{margin:0;padding:0 12px 10px 28px;color:var(--soft);font-size:13px}
.rc-offer{margin-left:38px;border:1px solid var(--b3);border-radius:12px;background:#fff;padding:10px 12px}
.rc-offer strong{color:var(--g9);display:block}
.rc-offer.rc-hero{background:linear-gradient(135deg,#fff7e3,#f3e3bd);border-color:var(--gold)}
.rc-form{margin-left:38px;border:1px solid var(--b3);border-radius:12px;background:#fff;padding:12px;display:flex;flex-direction:column;gap:10px}
.rc-form label{font-size:12px;font-weight:600;color:var(--g9);display:flex;flex-direction:column;gap:4px}
.rc-form input,.rc-form textarea{font:inherit;border:1px solid var(--b3);border-radius:8px;padding:9px 10px;width:100%;background:#fff;color:var(--ink)}
.rc-form input:focus,.rc-form textarea:focus{outline:2px solid var(--g8);outline-offset:0;border-color:var(--g8)}
.rc-err{color:#b3261e;font-size:12px;font-weight:600;margin:0}
.rc-time{list-style:none;margin:8px 0 0;padding:0}
.rc-time li{position:relative;padding:0 0 12px 28px;font-size:13px;color:var(--soft)}
.rc-time li::before{content:"";position:absolute;left:9px;top:18px;bottom:-2px;width:2px;background:var(--b3)}
.rc-time li:last-child::before{display:none}
.rc-time li.rc-done{color:var(--g9);font-weight:600} .rc-time li.rc-done::before{background:var(--leaf)}
.rc-time i{position:absolute;left:0;top:0;width:20px;height:20px;border-radius:50%;border:2px solid var(--b3);background:#fff;display:grid;place-items:center}
.rc-time li.rc-done i{background:var(--leaf);border-color:var(--leaf);color:#fff} .rc-time i svg{width:11px;height:11px}
.rc-wa-card{margin-left:38px;border:1px solid var(--b3);border-radius:14px;background:#fff;padding:14px;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center}
.rc-wa-card .rc-wa-ic{width:48px;height:48px;border-radius:50%;background:#188643;color:#fff;display:grid;place-items:center} .rc-wa-card .rc-wa-ic svg{width:28px;height:28px}
.rc-wa-card strong{color:var(--g9);font-size:15px}
.rc-small{font-size:12px;color:var(--soft);margin:0}
.rc-typing{display:inline-flex;gap:4px;padding:4px 0} .rc-typing span{width:6px;height:6px;border-radius:50%;background:var(--soft);animation:rc-b 1s infinite}
.rc-typing span:nth-child(2){animation-delay:.15s} .rc-typing span:nth-child(3){animation-delay:.3s}
@keyframes rc-b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.rc-foot{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--b3);background:#fff}
.rc-foot input{flex:1;min-width:0;border:1px solid var(--b3);border-radius:999px;padding:10px 14px;font:inherit;background:var(--cream)}
.rc-foot input:focus{outline:2px solid var(--g8);outline-offset:0}
.rc-foot button{width:42px;height:42px;border-radius:50%;border:0;background:var(--g8);color:#fff;cursor:pointer;display:grid;place-items:center;flex:none}
.rc-foot button svg{width:18px;height:18px}
.rc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.rc-log{scroll-behavior:auto}.rc-typing span{animation:none}.rc-fab{transition:none}}
`;

function esc(s: unknown) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
function h(html: string) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}
function store(key: string, value?: string) {
  try {
    if (value === undefined) return window.localStorage.getItem(key);
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
  return null;
}

export function mountChatbot(host: HTMLElement, cfg: ChatConfig) {
  const root = document.createElement("div");
  root.className = "rc-root";
  const style = document.createElement("style");
  style.textContent = CSS;
  root.appendChild(style);
  host.appendChild(root);

  const waLink = (text: string) => `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(text)}`;
  const priceText = (p: ChatProduct) => {
    const prices = p.variants.map((v) => v.price);
    const min = Math.min(...prices), max = Math.max(...prices);
    return min === max ? inr(min) : `${inr(min)} – ${inr(max)}`;
  };

  /* ---------- launcher ---------- */
  const tipSeen = store("rc-tip-seen") === "1";
  const launch = h(`<div class="rc-launch">
      ${tipSeen ? "" : `<div class="rc-tip" role="note"><button type="button" aria-label="Dismiss">${ICON.close}</button><strong>Need help?</strong>Chat with Reshmam</div>`}
      <button type="button" class="rc-fab" aria-label="Open chat with Reshmam shopping assistant" aria-expanded="false" aria-controls="rc-panel">
        ${ICON.chat}${tipSeen ? "" : '<span class="rc-dot" aria-hidden="true">1</span>'}
      </button></div>`);
  root.appendChild(launch);
  const fab = launch.querySelector(".rc-fab") as HTMLButtonElement;
  launch.querySelector(".rc-tip button")?.addEventListener("click", () => {
    launch.querySelector(".rc-tip")?.remove();
    store("rc-tip-seen", "1");
  });

  /* ---------- panel ---------- */
  const panel = h(`<section id="rc-panel" class="rc-panel" role="dialog" aria-modal="false" aria-labelledby="rc-title" hidden>
      <header class="rc-head">
        <span class="rc-av">${ICON.bot}</span>
        <div><h2 id="rc-title">Reshmam Assistant</h2><p>Online – Ready to help</p></div>
        <div class="rc-hb">
          <button type="button" data-act="restart" aria-label="Start over">${ICON.restart}</button>
          <button type="button" data-act="close" aria-label="Close chat">${ICON.close}</button>
        </div>
      </header>
      <div class="rc-log" role="log" aria-live="polite" aria-label="Conversation"></div>
      <form class="rc-foot" autocomplete="off">
        <label class="rc-sr" for="rc-input">Type your message</label>
        <input id="rc-input" type="text" placeholder="Type your message…" maxlength="300">
        <button type="submit" aria-label="Send message">${ICON.send}</button>
      </form>
    </section>`);
  root.appendChild(panel);
  const log = panel.querySelector(".rc-log") as HTMLElement;
  const input = panel.querySelector("#rc-input") as HTMLInputElement;
  let started = false;

  function open() {
    panel.hidden = false;
    launch.hidden = true;
    fab.setAttribute("aria-expanded", "true");
    store("rc-tip-seen", "1");
    if (!started) {
      started = true;
      welcome();
    }
    input.focus();
  }
  function close() {
    panel.hidden = true;
    launch.hidden = false;
    launch.querySelector(".rc-tip")?.remove();
    launch.querySelector(".rc-dot")?.remove();
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }
  fab.addEventListener("click", open);
  panel.querySelector('[data-act="close"]')!.addEventListener("click", close);
  panel.querySelector('[data-act="restart"]')!.addEventListener("click", () => {
    log.innerHTML = "";
    welcome();
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !panel.hidden) close();
  };
  document.addEventListener("keydown", onKey);

  /* ---------- message helpers ---------- */
  function scroll() {
    requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));
  }
  function bot(html: string) {
    const row = h(`<div class="rc-row"><span class="rc-mini">${ICON.bot}</span><div class="rc-bub">${html}</div></div>`);
    log.appendChild(row);
    scroll();
    return row;
  }
  function user(text: string) {
    log.appendChild(h(`<div class="rc-user">${esc(text)}</div>`));
    scroll();
  }
  function block(el: HTMLElement) {
    log.appendChild(el);
    scroll();
    return el;
  }
  function chips(items: { label: string; run: () => void }[]) {
    const wrap = h('<div class="rc-chips"></div>');
    items.forEach((it) => {
      const b = h(`<button type="button" class="rc-chip">${esc(it.label)}</button>`);
      b.addEventListener("click", () => {
        user(it.label);
        it.run();
      });
      wrap.appendChild(b);
    });
    return block(wrap);
  }
  const backChips = (extra: { label: string; run: () => void }[] = []) =>
    chips([...extra, { label: "Main menu", run: menu }]);

  /* ---------- flows ---------- */
  function welcome() {
    bot(
      `<p><strong>Hello! Welcome to Reshmam.</strong></p><p>I'm your shopping assistant. I can help you find the right oil, check prices, track an order or connect you with our team. How can I help you today?</p>`,
    );
    menuOptions();
  }
  function menu() {
    bot("<p>What would you like to do next?</p>");
    menuOptions();
  }
  function menuOptions() {
    const wrap = h('<div class="rc-opts"></div>');
    MENU.forEach((m) => {
      const b = h(
        `<button type="button" class="rc-opt"><span class="rc-oi" aria-hidden="true">${m.icon}</span>${esc(m.label)}<span class="rc-ch">${ICON.chevron}</span></button>`,
      );
      b.addEventListener("click", () => {
        user(m.label);
        route(m.id);
      });
      wrap.appendChild(b);
    });
    block(wrap);
  }
  function route(id: string) {
    ({ explore: categories, recommend, details: detailsPrompt, offers, track: trackForm, support } as Record<string, () => void>)[
      id
    ]();
  }

  function categories() {
    bot("<p>Here are our product categories. Please select one to explore.</p>");
    const grid = h('<div class="rc-grid"></div>');
    cfg.categories.forEach((c) => {
      const b = h(
        `<button type="button" class="rc-cat"><img src="${esc(cfg.asset(c.image))}" alt="" loading="lazy"><span>${esc(c.shortName)}</span></button>`,
      );
      b.addEventListener("click", () => {
        user(`Show me ${c.shortName}`);
        listing(cfg.products.filter((p) => p.category === c.slug && p.kind !== "combo"), `Here are our ${c.shortName} products. Choose a product for more details.`);
      });
      grid.appendChild(b);
    });
    block(grid);
  }

  function listing(list: ChatProduct[], intro: string, after?: string) {
    if (!list.length) {
      bot("<p>I couldn't find products for that right now.</p>");
      backChips([{ label: "Browse categories", run: categories }]);
      return;
    }
    bot(`<p>${esc(intro)}</p>`);
    const wrap = h('<div class="rc-list"></div>');
    list.slice(0, 8).forEach((p) => {
      const card = h(`<div class="rc-prod">
          <img src="${esc(cfg.asset(p.image))}" alt="${esc(p.imageAlt)}" loading="lazy">
          <div class="rc-pi"><strong>${esc(p.name)}</strong><small>${esc(p.branchName)} · ${esc(p.variants.map((v) => v.label).join(" / "))}</small>
          <div class="rc-pr"><span class="rc-price">${priceText(p)}</span><button type="button" class="rc-btn">View Details</button></div></div></div>`);
      card.querySelector("button")!.addEventListener("click", () => {
        user(`Tell me about ${p.shortName}`);
        detail(p);
      });
      wrap.appendChild(card);
    });
    block(wrap);
    if (after) bot(`<p>${esc(after)}</p>`);
    backChips([{ label: "Browse categories", run: categories }]);
  }

  function detail(p: ChatProduct) {
    const first = p.variants.find((v) => v.stock > 0) ?? p.variants[0];
    let variant = first;
    let qty = 1;
    const card = h(`<div class="rc-card">
        <div class="rc-top"><img src="${esc(cfg.asset(p.image))}" alt="${esc(p.imageAlt)}">
          <div><h3>${esc(p.name)}</h3><span class="rc-badge">${esc(p.branchName)}</span>
          <div class="rc-price" aria-live="polite"></div><div class="rc-sum">${esc(p.summary)}</div></div></div>
        ${p.notice ? `<p class="rc-note">${esc(p.notice)}</p>` : ""}
        <div class="rc-sizes" role="group" aria-label="Choose size"></div>
        <div class="rc-buy">
          <div class="rc-qty"><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><span aria-live="polite">1</span><button type="button" data-q="1" aria-label="Increase quantity">+</button></div>
          <button type="button" class="rc-btn" data-add>Add to Cart</button>
        </div>
        <div class="rc-more">
          <details><summary>Product Benefits</summary><ul>${p.description.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></details>
          <details><summary>Uses</summary><ul>${p.uses.map((u) => `<li>${esc(u)}</li>`).join("")}</ul></details>
          <details><summary>Storage</summary><ul><li>Keep the container tightly closed in a cool, dry place away from direct sunlight.</li><li>Use a clean, dry spoon or pourer.</li></ul></details>
        </div></div>`);
    const sizes = card.querySelector(".rc-sizes") as HTMLElement;
    const price = card.querySelector(".rc-price") as HTMLElement;
    const qtyEl = card.querySelector(".rc-qty span") as HTMLElement;
    const add = card.querySelector("[data-add]") as HTMLButtonElement;
    function sync() {
      price.textContent = `${inr(variant.price)} · ${variant.label}`;
      qtyEl.textContent = String(qty);
      add.disabled = variant.stock <= 0;
      add.textContent = variant.stock > 0 ? "Add to Cart" : "Out of Stock";
      sizes.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === variant.id)));
    }
    p.variants.forEach((v) => {
      const b = h(`<button type="button" class="rc-size" data-id="${esc(v.id)}"${v.stock <= 0 ? " disabled" : ""}>${esc(v.label)}${v.stock <= 0 ? '<span class="rc-sr"> (out of stock)</span>' : ""}</button>`);
      b.addEventListener("click", () => {
        variant = v;
        qty = Math.min(qty, Math.max(1, v.stock));
        sync();
      });
      sizes.appendChild(b);
    });
    card.querySelectorAll("[data-q]").forEach((b) =>
      b.addEventListener("click", () => {
        qty = Math.max(1, Math.min(50, variant.stock, qty + Number((b as HTMLElement).dataset.q)));
        sync();
      }),
    );
    add.addEventListener("click", () => {
      if (variant.stock <= 0) return;
      cfg.addToCart(variant.id, qty);
      bot(`<p>Added <strong>${qty} × ${esc(p.shortName)} (${esc(variant.label)})</strong> to your cart.</p>`);
      backChips([
        { label: "View cart", run: () => cfg.navigate("/cart") },
        { label: "Keep shopping", run: categories },
      ]);
    });
    sync();
    bot(`<p>Here are the details for <strong>${esc(p.name)}</strong>.</p>`);
    block(card);
    backChips([
      { label: "Open product page", run: () => cfg.navigate(`/products/${p.slug}`) },
      { label: "Browse categories", run: categories },
    ]);
  }

  function detailsPrompt() {
    bot("<p>Which product would you like to know about? Choose one below, or type its name (for example “coconut oil”).</p>");
    listing(cfg.products, "Our products:");
  }

  function recommend() {
    bot("<p>Great! Tell me what you need the product for and I'll suggest the best match.</p>");
    chips(
      NEEDS.filter((n) => cfg.products.some(n.match)).map((n) => ({
        label: n.label,
        run: () => listing(cfg.products.filter(n.match), `Great choice! These are ideal for ${n.label.toLowerCase()}:`, n.note + " Need help choosing? Just ask."),
      })),
    );
  }

  function offers() {
    bot("<p>Here are our current offers and delivery benefits:</p>");
    cfg.offers.forEach((o, i) =>
      block(h(`<div class="rc-offer${i === 0 ? " rc-hero" : ""}"><strong>${esc(o.title)}</strong>${esc(o.text)}</div>`)),
    );
    bot("<p>There are no coupon codes running right now. Any new offers will appear here.</p>");
    backChips([
      { label: "Shop products", run: categories },
      { label: "Bulk enquiry", run: () => cfg.navigate("/contact?subject=bulk-orders#enquiry") },
    ]);
  }

  function trackForm() {
    bot("<p>Sure! Please enter your Order ID and the email address used for the order to check its status.</p>");
    const form = h(`<form class="rc-form" novalidate>
        <label>Order ID<input name="order" placeholder="e.g. RSH-20261030-ABC123" autocomplete="off" required></label>
        <label>Email address<input name="email" type="email" autocomplete="email" required></label>
        <p class="rc-err" hidden></p>
        <button type="submit" class="rc-btn rc-wide">Track Order</button></form>`) as HTMLFormElement;
    const err = form.querySelector(".rc-err") as HTMLElement;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const order = (form.elements.namedItem("order") as HTMLInputElement).value.trim();
      const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
      if (order.length < 5 || !/^\S+@\S+\.\S+$/.test(email)) {
        err.textContent = "Please enter your Order ID and a valid email address.";
        err.hidden = false;
        return;
      }
      err.hidden = true;
      const btn = form.querySelector("button") as HTMLButtonElement;
      btn.disabled = true;
      user(order);
      const typing = bot('<span class="rc-typing" aria-label="Checking"><span></span><span></span><span></span></span>');
      const res = await cfg.lookupOrder(order, email).catch(() => ({ ok: false as const, error: "We couldn't reach the server." }));
      typing.remove();
      btn.disabled = false;
      if (!res.ok) {
        bot(`<p>${esc(res.error)}</p><p>Our support team can check it for you.</p>`);
        backChips([{ label: "Talk to support", run: support }]);
        return;
      }
      const cur = STEPS.findIndex((s) => s.keys.includes(res.order.status));
      const steps =
        cur < 0
          ? `<p>Status: <strong>${esc(res.order.status.replace(/_/g, " "))}</strong></p>`
          : `<ul class="rc-time">${STEPS.map((s, i) => `<li class="${i <= cur ? "rc-done" : ""}"><i>${i <= cur ? ICON.check : ""}</i>${esc(s.label)}${i === cur ? " <em>(current)</em>" : ""}</li>`).join("")}</ul>`;
      bot(`<p>Here's the status of order <strong>${esc(res.order.orderNumber)}</strong> (${inr(res.order.total)}):</p>${steps}`);
      backChips([{ label: "Track another order", run: trackForm }]);
    });
    block(form);
  }

  function support() {
    bot("<p>I can connect you with our support team. You can continue this conversation on WhatsApp for quick assistance.</p>");
    block(
      h(`<div class="rc-wa-card"><span class="rc-wa-ic">${ICON.wa}</span><strong>Chat with Reshmam Support on WhatsApp</strong>
        <a class="rc-btn rc-wa rc-wide" href="${esc(waLink("Hello Reshmam, I need help with "))}" target="_blank" rel="noopener noreferrer">${ICON.wa} Open WhatsApp Chat</a>
        <p class="rc-small">Or call <strong>${esc(cfg.phone.display)}</strong> · email <strong>${esc(cfg.email)}</strong></p></div>`),
    );
    bot("<p>Our support team will be happy to help you with any product, order or general enquiry.</p>");
    backChips([{ label: "Request a call back", run: handover }]);
  }

  function handover() {
    bot("<p>I'll connect you with our team. Please share your name and phone number.</p>");
    const form = h(`<form class="rc-form" novalidate>
        <label>Your name<input name="name" autocomplete="name" required></label>
        <label>Phone number<input name="phone" type="tel" autocomplete="tel" placeholder="+91" required></label>
        <label>What do you need help with? (optional)<textarea name="msg" rows="2"></textarea></label>
        <p class="rc-err" hidden></p>
        <button type="submit" class="rc-btn rc-wa rc-wide">${ICON.wa} Connect to Support Team</button>
        <p class="rc-small">This opens WhatsApp with your details filled in. Tap send to reach our team.</p></form>`) as HTMLFormElement;
    const err = form.querySelector(".rc-err") as HTMLElement;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
      const phone = (form.elements.namedItem("phone") as HTMLInputElement).value.trim();
      const msg = (form.elements.namedItem("msg") as HTMLTextAreaElement).value.trim();
      if (name.length < 2 || !/^[+]?[\d\s-]{10,16}$/.test(phone)) {
        err.textContent = "Please enter your name and a valid phone number.";
        err.hidden = false;
        return;
      }
      err.hidden = true;
      const text = `Hello Reshmam, I'd like help from your team.\nName: ${name}\nPhone: ${phone}${msg ? `\nRequest: ${msg}` : ""}`;
      window.open(waLink(text), "_blank", "noopener");
      bot(
        `<p>I've opened WhatsApp with your details. Please tap <strong>send</strong> there so our team receives your message.</p><p>If WhatsApp didn't open, <a href="${esc(waLink(text))}" target="_blank" rel="noopener noreferrer">tap here</a> or call ${esc(cfg.phone.display)}.</p>`,
      );
      backChips();
    });
    block(form);
  }

  /* ---------- free text ---------- */
  const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const STOP = new Set(["oil", "the", "a", "i", "want", "need", "me", "show", "for", "of", "and", "is", "to", "do", "you", "have", "price", "buy", "about", "tell", "please", "what", "my", "can", "your"]);
  const SYN: Record<string, string> = { sesame: "gingelly", til: "gingelly", nallennai: "gingelly", peanut: "groundnut", kadalai: "groundnut", thengai: "coconut", gift: "combo" };

  function answer(text: string) {
    const t = text.toLowerCase();
    if (/^(hi|hello|hey|vanakkam|good (morning|evening|afternoon))\b/.test(t)) return welcome();
    if (/track|where.*order|order status|delivery status/.test(t)) return trackForm();
    if (/offer|discount|coupon|code|deal|sale/.test(t)) return offers();
    if (/whatsapp|human|agent|person|call ?back|talk|speak|support|complain/.test(t)) return support();
    if (/recommend|suggest|which (oil|one)|best|right product|help me choose/.test(t)) return recommend();
    if (/cancel/.test(t)) return faq("cancel", "/cancellation-policy");
    if (/refund|return|damaged|broken|leak/.test(t)) return faq("refund", "/returns-refund-policy");
    if (/ship|deliver|courier|how long/.test(t)) return faq("delivery", "/shipping-delivery");
    if (/pay|upi|card|cod|cash/.test(t)) return faq("payment", "/faq");
    if (/bulk|wholesale|dealer|retail/.test(t)) {
      bot("<p>We offer special rates for bulk orders and retail partnerships.</p>");
      return backChips([{ label: "Send bulk enquiry", run: () => cfg.navigate("/contact?subject=bulk-orders#enquiry") }]);
    }

    // product / category search
    const terms = words(t)
      .map((w) => SYN[w] ?? w)
      .filter((w) => !STOP.has(w) && w.length > 2);
    const cat = cfg.categories.find((c) => terms.some((w) => c.slug.startsWith(w) || c.slug === w));
    const scored = cfg.products
      .map((p) => {
        const hay = `${p.name} ${p.shortName} ${p.category} ${p.branchName} ${p.kind}`.toLowerCase();
        return { p, score: terms.filter((w) => hay.includes(w)).length };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length) {
      const top = scored.filter((x) => x.score === scored[0].score).map((x) => x.p);
      if (top.length === 1) return detail(top[0]);
      return listing(top, `I found ${top.length} matching products. Choose one for more details.`);
    }
    if (cat) return listing(cfg.products.filter((p) => p.category === cat.slug), `Here are our ${cat.shortName} products.`);
    if (/product|categor|shop|browse|oil/.test(t)) return categories();

    bot("<p>Sorry, I didn't quite catch that. You can choose an option below, or type a product name like “groundnut oil”.</p>");
    menuOptions();
  }

  function faq(topic: string, href: string) {
    const key: Record<string, RegExp> = {
      cancel: /cancel/i,
      refund: /refund|damaged/i,
      delivery: /deliver/i,
      payment: /payment/i,
    };
    const hits = cfg.faqs.filter((f) => key[topic].test(f.q)).slice(0, 2);
    bot(hits.map((f) => `<p><strong>${esc(f.q)}</strong><br>${esc(f.a)}</p>`).join("") || "<p>Our support team can help with that.</p>");
    backChips([
      { label: "Read full policy", run: () => cfg.navigate(href) },
      { label: "Talk to support", run: support },
    ]);
  }

  panel.querySelector("form.rc-foot")!.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    user(text);
    answer(text);
  });

  return {
    open,
    close,
    destroy() {
      document.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
