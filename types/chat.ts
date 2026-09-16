// Tipe bersama untuk percakapan chat.
// Catatan: role dibatasi ke "user" | "model" (format Gemini). Jangan gunakan "assistant".

export type Role = "user" | "model";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatRequest {
  message: string;
  history: Message[];
}
