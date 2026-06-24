// ── OCR (client-side, Tesseract.js) + nameplate parser ────────────────────────
// Real-world nameplate photos (metal, glare, low contrast, skew) defeat raw
// Tesseract. We upscale + clean each image and run a BEST-OF-TWO-PASSES scan: a
// "gentle" pass (grayscale + auto-contrast + sharpen — lets Tesseract do its own
// thresholding, best for clean/printed plates) and a "binary" pass (denoise +
// auto-contrast + Otsu, best for faint engraved text). We parse both and keep
// whichever yields more structured fields. The parser is unit/label tolerant with
// heuristic fallbacks so it works on arbitrary plates.

import { createWorker, PSM, type Worker } from "tesseract.js";

export interface OcrWord { text: string; confidence: number }

// ── Image helpers (operate on a single-channel gray Uint8 array) ──────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar a imagem."));
    img.src = src;
  });
}

interface Scaled { gray: Uint8ClampedArray; w: number; h: number }

async function drawScaled(image: File | string): Promise<Scaled> {
  const src = typeof image === "string" ? image : URL.createObjectURL(image);
  try {
    const img = await loadImage(src);
    const longEdge = Math.max(img.width, img.height) || 1;
    const scale = longEdge > 2600 ? 2600 / longEdge : Math.min(3, Math.max(1, 1700 / longEdge));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d", { willReadFrequently: true })!;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    const gray = new Uint8ClampedArray(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return { gray, w, h };
  } finally {
    if (typeof image !== "string") URL.revokeObjectURL(src);
  }
}

function boxBlur(gray: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0, cnt = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue;
      for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; sum += gray[yy * w + xx]; cnt++; } }
    out[y * w + x] = sum / cnt;
  }
  return out;
}

// Stretch the 2nd–98th percentile to 0–255 (robust auto-contrast).
function autoContrast(gray: Uint8ClampedArray): void {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.02) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.02) { hi = v; break; } }
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < gray.length; i++) gray[i] = ((gray[i] - lo) * 255) / span;
}

// Unsharp mask: g + amount·(g − blur(g)) — crisper edges for printed text.
function unsharp(gray: Uint8ClampedArray, w: number, h: number, amount = 0.8): void {
  const blur = boxBlur(gray, w, h);
  for (let i = 0; i < gray.length; i++) gray[i] = gray[i] + amount * (gray[i] - blur[i]);
}

// Otsu global threshold → binarize; majority class forced to white so it works
// whether the plate is dark-on-light or light-on-dark.
function otsuBinarize(gray: Uint8ClampedArray): void {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0; for (let v = 0; v < 256; v++) sum += v * hist[v];
  let sumB = 0, wB = 0, max = 0, thr = 127;
  for (let v = 0; v < 256; v++) {
    wB += hist[v]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += v * hist[v];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) { max = between; thr = v; }
  }
  let black = 0;
  for (let i = 0; i < gray.length; i++) { const b = gray[i] <= thr; if (b) black++; gray[i] = b ? 0 : 255; }
  if (black > total / 2) for (let i = 0; i < gray.length; i++) gray[i] = 255 - gray[i];
}

function grayToDataURL(gray: Uint8ClampedArray, w: number, h: number): string {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d")!;
  const id = g.createImageData(w, h);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) { id.data[i] = id.data[i + 1] = id.data[i + 2] = gray[p]; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  return cv.toDataURL("image/png");
}

// Two cleaned variants of the same image (gentle, binary).
async function buildVariants(image: File | string): Promise<string[]> {
  const { gray, w, h } = await drawScaled(image);
  const gentle = gray.slice(); autoContrast(gentle); unsharp(gentle, w, h);
  const binary = boxBlur(gray, w, h); autoContrast(binary); otsuBinarize(binary);
  return [grayToDataURL(gentle, w, h), grayToDataURL(binary, w, h)];
}

// ── Tesseract worker (cached + tuned) ─────────────────────────────────────────

let workerPromise: Promise<Worker> | null = null;
let progressCb: ((p: number) => void) | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const w = await createWorker("por+eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text" && progressCb) progressCb(m.progress);
        },
      });
      await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: "1" });
      return w;
    })().catch((e) => { workerPromise = null; throw e; });
  }
  return workerPromise;
}

async function recognize(input: File | string): Promise<{ text: string; words: OcrWord[]; confidence: number }> {
  const worker = await getWorker();
  const { data } = await worker.recognize(input);
  const words: OcrWord[] = ((data as { words?: { text: string; confidence: number }[] }).words ?? [])
    .map((w) => ({ text: w.text, confidence: w.confidence }));
  return { text: data.text, words, confidence: data.confidence ?? 0 };
}

// Raw OCR on a single (gently preprocessed) image — kept for completeness.
export async function runOCR(
  image: File | string,
  onProgress?: (p: number) => void,
): Promise<{ text: string; words: OcrWord[]; confidence: number }> {
  progressCb = onProgress ?? null;
  let input: File | string = image;
  try { input = (await buildVariants(image))[0]; } catch { /* fall back to raw */ }
  return recognize(input);
}

// ── Nameplate parser ──────────────────────────────────────────────────────────

export type NameplateKey = "fabricante" | "modelo" | "serie" | "potencia" | "rotacao" | "tensao" | "corrente" | "ip";

export interface OcrField { value: string; confidence: number }
export interface NameplateResult {
  raw: string;
  fields: Partial<Record<NameplateKey, OcrField>>;
  overallConfidence: number;
  fieldCount: number;
}

const BRANDS = [
  "WEG", "KSB", "ABB", "SIEMENS", "ATLAS COPCO", "ATLAS", "GE", "GENERAL ELECTRIC",
  "SEW", "SEW-EURODRIVE", "DEMAG", "MULTIVAC", "FISHER", "BALDOR", "TOSHIBA", "NIDEC",
  "BOSCH", "SCHNEIDER", "DANFOSS", "GRUNDFOS", "SULZER", "LEROY SOMER", "LEROY-SOMER",
  "MARATHON", "REGAL", "LEESON", "VOGES", "KOLLMORGEN", "BONFIGLIOLI", "NORD", "FLENDER",
  "VOITH", "GOULDS", "WILO", "EBARA", "FRANKLIN", "YASKAWA", "FANUC", "MITSUBISHI",
  "HYUNDAI", "PARKER", "REXROTH", "ROCKWELL", "ALLEN BRADLEY", "EMERSON", "HONEYWELL",
  "WANNER", "VACON", "TECO", "HITACHI", "LENZE", "STÖBER", "STOBER",
];

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const fixDigits = (s: string) => s.replace(/[OoQ]/g, "0").replace(/[lI]/g, "1");
const STOP = new Set(["MOTOR","BOMBA","PUMP","TYPE","TIPO","MODEL","MODELO","SERIE","SERIAL","TRIFASICO","TRIFÁSICO","INDUCTION","INDUÇÃO","ELETRICO","ELÉTRICO","MADE","BRASIL","BRAZIL","CHINA","GERMANY","ISOL","CLASSE","CLASS","FRAME","CARCAÇA","CARCACA","NEMA","CAT","NO","Nº","N°"]);

export function parseNameplate(text: string, words: OcrWord[] = []): NameplateResult {
  const T = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  const U = T.toUpperCase();
  const fields: Partial<Record<NameplateKey, OcrField>> = {};

  const conf = (match: string) => {
    const toks = match.toUpperCase().split(/\s+/).filter((t) => t.length > 1);
    const ws = words.filter((w) => toks.some((t) => w.text.toUpperCase().includes(t) || t.includes(w.text.toUpperCase())));
    const c = ws.length ? ws.reduce((a, w) => a + w.confidence, 0) / ws.length : 80;
    return Math.round(Math.max(55, Math.min(99, c)));
  };
  const set = (k: NameplateKey, value: string, match: string, c?: number) => {
    if (value && !fields[k]) fields[k] = { value: value.trim(), confidence: c ?? conf(match) };
  };

  const brand = BRANDS.find((b) => new RegExp(`(^|[^A-Z])${b.replace(/[-]/g, "[- ]?")}([^A-Z]|$)`).test(U));
  if (brand) {
    set("fabricante", titleCase(brand.startsWith("ATLAS") ? "Atlas Copco" : brand), brand);
  } else {
    const cand = (U.slice(0, 60).match(/\b([A-ZÀ-Ý][A-ZÀ-Ý&.\-]{2,18})\b/g) ?? []).find((t) => !STOP.has(t) && !/^\d/.test(t));
    if (cand) set("fabricante", titleCase(cand), cand, 60);
  }

  const pot = U.match(/(\d{1,4}[.,]?\d{0,2})\s*(KW|CV|HP)\b/);
  if (pot) set("potencia", `${fixDigits(pot[1]).replace(",", ".")} ${pot[2] === "KW" ? "kW" : pot[2].toLowerCase()}`, pot[0]);

  const rpm = U.match(/(\d{2,4}[.,]?\d{0,3})\s*(?:RPM|R\.?\/?MIN|MIN-?\s?1|U\/?MIN|1\/MIN)\b/);
  if (rpm) set("rotacao", `${fixDigits(rpm[1]).replace(/[.,]/g, "")} rpm`, rpm[0]);

  const volt = U.match(/(\d{2,3}(?:\s*[-/]\s*\d{2,3})?)\s*V(?:OLTS?|AC|~)?\b/);
  const freq = U.match(/(\d{2})\s*HZ\b/);
  if (volt || freq) {
    const v = volt ? volt[1].replace(/\s/g, "") + "V" : "";
    const f = freq ? freq[1] + "Hz" : "";
    set("tensao", [v, f].filter(Boolean).join(" / "), `${volt?.[0] ?? ""} ${freq?.[0] ?? ""}`);
  }

  const amp = U.match(/(?:^|[\s:=])(\d{1,3}[.,]?\d{0,2})\s?A(?:MP|MPS|MPERE)?(?=$|[\s,;)])/);
  if (amp) set("corrente", `${fixDigits(amp[1]).replace(",", ".")} A`, amp[0]);

  const ip = U.match(/IP\s?(\d{2})\b/);
  if (ip) set("ip", `IP${ip[1]}`, ip[0]);

  const sn = T.match(/(?:S\/?N|SERIAL\s*N?[ºo]?|N[º°o]?\.?\s*(?:DE\s*)?S[ÉE]RIE|S[ÉE]RIE|SER\.?)\s*[:#.]?\s*([A-Za-z0-9][A-Za-z0-9\-\/]{4,})/i);
  if (sn) {
    set("serie", sn[1].toUpperCase(), sn[1]);
  } else {
    const serial = (U.match(/\b[A-Z0-9][A-Z0-9\-\/]{5,}\b/g) ?? [])
      .find((t) => /[A-Z]/.test(t) && /\d{3,}/.test(t) && !/(KW|RPM|VAC|HZ)/.test(t));
    if (serial) set("serie", serial, serial, 65);
  }

  let mod = T.match(/(?:MODELO|MODEL|TYPE|TIPO|TIPE)\s*[:#.]?\s*([A-Za-z0-9][A-Za-z0-9\-\/ ]{1,28})/i);
  if (!mod) mod = T.match(/(?:MOTOR|BOMBA|PUMP|COMPRESSOR)\s+([A-Za-z0-9][A-Za-z0-9\-\/ ]{2,24})/i);
  if (mod) {
    const cleaned = mod[1].trim().split(/\s{2,}|\b(?:S\/?N|SN|N[ºo°]|SERIE|SERIAL|IP\d|KW|CV|HP|RPM|HZ|VOLT)\b/i)[0].trim();
    set("modelo", cleaned, mod[1]);
  } else {
    const code = U.match(/\b([A-Z]{1,4}\d{2,}[A-Z0-9\-]{0,10})\b/);
    if (code && !/(IP|KW|CV|HP)/.test(code[1])) set("modelo", code[1], code[1], 62);
  }

  const vals = Object.values(fields);
  const overall = vals.length ? Math.round(vals.reduce((a, f) => a + f.confidence, 0) / vals.length) : 0;
  return { raw: text, fields, overallConfidence: overall, fieldCount: vals.length };
}

// ── Vision OCR (primary): a vision model reads the plate via the secure proxy ──

const VISION_KEYS: NameplateKey[] = ["fabricante", "modelo", "serie", "potencia", "rotacao", "tensao", "corrente", "ip"];

// Downscale to a sane size and export JPEG for the vision request payload.
async function toVisionDataURL(image: File | string): Promise<string> {
  const src = typeof image === "string" ? image : URL.createObjectURL(image);
  try {
    const img = await loadImage(src);
    const longEdge = Math.max(img.width, img.height) || 1;
    const scale = Math.min(1, 1500 / longEdge);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    cv.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return cv.toDataURL("image/jpeg", 0.85);
  } finally {
    if (typeof image !== "string") URL.revokeObjectURL(src);
  }
}

export async function scanNameplateVision(image: File | string): Promise<NameplateResult> {
  const url = await toVisionDataURL(image);
  const resp = await fetch("/api/vision-ocr", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: url }),
  });
  if (!resp.ok) {
    let msg = `Vision OCR indisponível (${resp.status}).`;
    try { msg = (await resp.json())?.error || msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  const data = (await resp.json()) as Record<string, unknown>;
  const confianca = Math.max(55, Math.min(99, Math.round(Number(data.confianca) || 85)));
  const fields: Partial<Record<NameplateKey, OcrField>> = {};
  for (const k of VISION_KEYS) {
    const v = data[k];
    const s = v == null ? "" : String(v).trim();
    if (s && s.toLowerCase() !== "null") fields[k] = { value: s, confidence: confianca };
  }
  const vals = Object.values(fields);
  const overall = vals.length ? Math.round(vals.reduce((a, f) => a + f.confidence, 0) / vals.length) : 0;
  return { raw: JSON.stringify(data), fields, overallConfidence: overall, fieldCount: vals.length };
}

// ── High-level scan: vision model first, Tesseract (best-of-2) as fallback ────

async function scanTesseract(image: File | string, onProgress?: (p: number) => void): Promise<NameplateResult> {
  let variants: string[];
  try { variants = await buildVariants(image); }
  catch { variants = [typeof image === "string" ? image : URL.createObjectURL(image)]; }

  let best: NameplateResult | null = null;
  for (let i = 0; i < variants.length; i++) {
    progressCb = (p: number) => onProgress?.((i + p) / variants.length);
    const { text, words } = await recognize(variants[i]);
    const parsed = parseNameplate(text, words);
    if (!best || parsed.fieldCount > best.fieldCount ||
        (parsed.fieldCount === best.fieldCount && parsed.overallConfidence > best.overallConfidence)) {
      best = parsed;
    }
  }
  onProgress?.(1);
  return best ?? { raw: "", fields: {}, overallConfidence: 0, fieldCount: 0 };
}

export async function scanNameplate(
  image: File | string,
  onProgress?: (p: number) => void,
): Promise<NameplateResult> {
  // Primary: vision model (reads real photos far better than client-side OCR).
  try {
    onProgress?.(0.15);
    const v = await scanNameplateVision(image);
    if (v.fieldCount > 0) { onProgress?.(1); return v; }
  } catch { /* no key / offline / vision failure → fall back to local OCR */ }
  // Fallback: local Tesseract with best-of-2 preprocessing.
  return scanTesseract(image, onProgress);
}

// Dev-only: expose for OCR debugging/tuning in the browser console.
if (import.meta.env?.DEV && typeof window !== "undefined") {
  (window as unknown as { __ocr: unknown }).__ocr = { runOCR, scanNameplate, scanNameplateVision, parseNameplate, buildVariants };
}
