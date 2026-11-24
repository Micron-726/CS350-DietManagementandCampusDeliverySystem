import { isUuid } from "@/lib/menu";

export const maxBagLines = 50;
export const maxBagQuantity = 20;

export type BagSelection = { itemId: string; levelIds: string[] };
export type BagLine = BagSelection & { quantity: number };
export type Bag = { requestId: string; lines: BagLine[] };

export type QuotedLine = {
  key: string;
  name: string;
  restaurantId: string | null;
  restaurantName: string | null;
  portions: string[];
  unitPrice: number | null;
  error?: string;
};
export type BagQuote = { lines: QuotedLine[]; revision: string | null };

export function selectionKey({ itemId, levelIds }: BagSelection) {
  return `${itemId}:${[...levelIds].sort().join(",")}`;
}

export function decodeJson(value: unknown): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function object(value: unknown) {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function parseSelections(value: unknown): BagSelection[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > maxBagLines) return null;
  const selections: BagSelection[] = [];
  const keys = new Set<string>();
  for (const entry of value) {
    const { itemId, levelIds } = object(entry);
    if (!isUuid(itemId) || !Array.isArray(levelIds) || levelIds.length > 100 || !levelIds.every(isUuid)) return null;
    const selection = { itemId: itemId.toLowerCase(), levelIds: levelIds.map((id) => id.toLowerCase()).sort() };
    if (new Set(selection.levelIds).size !== selection.levelIds.length) return null;
    const key = selectionKey(selection);
    if (keys.has(key)) return null;
    keys.add(key);
    selections.push(selection);
  }
  return selections;
}

export function parseBag(raw: unknown): Bag | null {
  const { requestId, lines } = object(decodeJson(raw));
  const selections = parseSelections(lines);
  if (!isUuid(requestId) || !Array.isArray(lines) || !selections) return null;
  const validated: BagLine[] = [];
  for (const [index, selection] of selections.entries()) {
    const { quantity } = object(lines[index]);
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > maxBagQuantity) return null;
    validated.push({ ...selection, quantity });
  }
  return { requestId: requestId.toLowerCase(), lines: validated };
}
