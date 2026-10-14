import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Hashing password memakai scrypt bawaan Node (tanpa dependency tambahan).
// Format tersimpan: "scrypt$<saltHex>$<hashHex>" agar self-describing.

const scrypt = promisify(scryptCb);
const KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Membuat hash password untuk disimpan di DB.
 * Pure-ish: hanya memakai RNG + KDF, tanpa I/O.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * Memverifikasi password terhadap hash tersimpan. Memakai perbandingan
 * waktu-konstan agar tidak membocorkan info lewat timing.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const derived = (await scrypt(password, salt, expected.length || KEYLEN)) as Buffer;

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
