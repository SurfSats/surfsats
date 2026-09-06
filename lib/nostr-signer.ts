import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools";
import { hexToBytes, isHex64 } from "./nwc";

export const NOSTR_EPHEMERAL_KEY = "surfsats_nostr_ephemeral";

export type SignedNote = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function loadEphemeralSecret(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const secret = window.sessionStorage.getItem(NOSTR_EPHEMERAL_KEY) ?? "";
    return isHex64(secret) ? secret.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function createEphemeralSecret(): string {
  const secret = bytesToHex(generateSecretKey());
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(NOSTR_EPHEMERAL_KEY, secret);
    } catch {
      // session-only identity still returned
    }
  }
  return secret;
}

export function pubkeyFromSecret(secret: string) {
  return getPublicKey(hexToBytes(secret));
}

export async function signKind1(input: {
  content: string;
  tags: string[][];
  secret?: string | null;
}): Promise<SignedNote> {
  const content = input.content.trim();
  if (!content) throw new Error("Empty note");

  if (typeof window !== "undefined" && window.nostr?.signEvent) {
    const signed = await window.nostr.signEvent({
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: input.tags,
      content,
    });
    return signed as SignedNote;
  }

  const secret = input.secret || loadEphemeralSecret();
  if (!secret) throw new Error("NO_IDENTITY");
  return finalizeEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: input.tags,
      content,
    },
    hexToBytes(secret),
  ) as SignedNote;
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: {
        kind: number;
        created_at: number;
        tags: string[][];
        content: string;
        pubkey?: string;
      }) => Promise<unknown>;
    };
  }
}
