"use client";

import { useMemo, useSyncExternalStore } from "react";
import { maxBagLines, maxBagQuantity, parseBag, selectionKey, type BagLine } from "@/lib/bag";

const changeEvent = "diet-app:bag-change";
const temporaryBags = new Map<string, string>();
const keyFor = (customerId: string) => `diet-app:bag:${customerId}`;

function readBag(customerId: string) {
  const key = keyFor(customerId);
  const temporary = temporaryBags.get(key);
  if (temporary !== undefined) return temporary;
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeBag(customerId: string, raw: string) {
  const key = keyFor(customerId);
  try {
    if (raw) window.localStorage.setItem(key, raw);
    else window.localStorage.removeItem(key);
    temporaryBags.delete(key);
  } catch {
    temporaryBags.set(key, raw);
  }
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function requestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function useBag(customerId: string) {
  const raw = useSyncExternalStore(subscribe, () => readBag(customerId), () => null);
  return { ready: raw !== null, bag: useMemo(() => parseBag(raw), [raw]) };
}

function saveLines(customerId: string, lines: BagLine[]) {
  writeBag(customerId, lines.length ? JSON.stringify({ requestId: requestId(), lines }) : "");
}

export function addToBag(customerId: string, line: BagLine) {
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > maxBagQuantity) return `수량은 1개부터 ${maxBagQuantity}개까지 선택할 수 있습니다.`;
  const lines = parseBag(readBag(customerId))?.lines ?? [];
  const key = selectionKey(line);
  const existing = lines.find((entry) => selectionKey(entry) === key);
  if (existing) {
    if (existing.quantity + line.quantity > maxBagQuantity) return `같은 메뉴 구성은 ${maxBagQuantity}개까지 담을 수 있습니다.`;
    existing.quantity += line.quantity;
  } else {
    if (lines.length >= maxBagLines) return `장바구니에 메뉴 구성을 ${maxBagLines}개까지 담을 수 있습니다.`;
    lines.push(line);
  }
  saveLines(customerId, lines);
  return null;
}

export function setBagQuantity(customerId: string, key: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > maxBagQuantity) return;
  const bag = parseBag(readBag(customerId));
  const line = bag?.lines.find((entry) => selectionKey(entry) === key);
  if (!bag || !line || line.quantity === quantity) return;
  line.quantity = quantity;
  saveLines(customerId, bag.lines.filter((entry) => entry.quantity > 0));
}

export function finishBagCheckout(customerId: string, checkedOutId: string, declined: boolean) {
  const bag = parseBag(readBag(customerId));
  if (bag?.requestId === checkedOutId) saveLines(customerId, declined ? bag.lines : []);
}
