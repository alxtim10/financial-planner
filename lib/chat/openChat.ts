// Jembatan ringan antar-komponen klien untuk membuka ChatDrawer dari mana pun
// (mis. chat bar di homepage) tanpa mengangkat state ke context global.
//
// Homepage memancarkan event dengan `emitOpenChat(prompt)`; ChatDrawer berlangganan
// via `onOpenChat(handler)`. Payload `prompt` opsional: bila ada, diteruskan ke
// ChatInterface sebagai prompt pertama yang otomatis dikirim.

export const OPEN_CHAT_EVENT = "tabungin:open-chat";

export interface OpenChatDetail {
  /** Teks yang langsung dikirim sebagai pesan pertama (opsional). */
  prompt?: string;
}

/** Memancarkan permintaan membuka chat. Aman dipanggil hanya di browser. */
export function emitOpenChat(prompt?: string): void {
  if (typeof window === "undefined") return;
  const detail: OpenChatDetail = { prompt };
  window.dispatchEvent(new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail }));
}

/**
 * Berlangganan permintaan membuka chat. Mengembalikan fungsi unsubscribe.
 * Aman dipanggil hanya di browser (no-op di server).
 */
export function onOpenChat(handler: (detail: OpenChatDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  function listener(e: Event) {
    const ce = e as CustomEvent<OpenChatDetail>;
    handler(ce.detail ?? {});
  }
  window.addEventListener(OPEN_CHAT_EVENT, listener);
  return () => window.removeEventListener(OPEN_CHAT_EVENT, listener);
}
