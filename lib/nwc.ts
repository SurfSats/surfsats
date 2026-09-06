export const NWC_STORAGE_KEY = "surfsats_nwc_secret";
export const NWC_CHANGED_EVENT = "surfsats-nwc";
export const NWC_WALLET_REQUEST_KIND = 23194;
export const NWC_WALLET_RESPONSE_KIND = 23195;
export const NWC_PAY_TIMEOUT_MS = 45_000;

export type NwcConnection = {
  pubkey: string;
  relays: string[];
  secret: string;
  lud16: string | null;
};

export type NwcPayResult = {
  preimage: string;
};

export type NwcEvent = {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  content: string;
  tags: string[][];
  sig: string;
};

export type NwcFilter = {
  kinds: number[];
  authors?: string[];
  "#p"?: string[];
  "#e"?: string[];
};

export type NwcTransport = {
  loadUri?: () => string;
  getPublicKey: (secret: Uint8Array) => string;
  makeRequest: (
    walletPubkey: string,
    secretKey: Uint8Array,
    invoice: string,
  ) => Promise<NwcEvent>;
  publish: (relays: string[], event: NwcEvent) => Promise<void>;
  subscribe: (
    relays: string[],
    filter: NwcFilter,
    handlers: { onevent: (event: NwcEvent) => void },
  ) => { close: () => void };
  decrypt: (secret: string, walletPubkey: string, content: string) => string;
  latch?: () => void;
  timeoutMs?: number;
};

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function memoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

function defaultStorage(): StorageLike {
  if (typeof window === "undefined") return memoryStorage();
  try {
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
}

export function isHex64(value: string) {
  return /^[0-9a-f]{64}$/i.test(value.trim());
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function parseNwcUri(raw: string): NwcConnection | null {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("nostr+walletconnect://")) return null;
  try {
    const url = new URL(trimmed);
    const pubkey = (url.pathname.replace(/^\//, "") || url.host).trim();
    const relays = url.searchParams.getAll("relay").map((entry) => entry.trim());
    const secret = (url.searchParams.get("secret") ?? "").trim();
    const lud16 = (url.searchParams.get("lud16") ?? "").trim() || null;
    if (!isHex64(pubkey) || !isHex64(secret) || relays.length === 0) return null;
    if (!relays.every((relay) => /^wss?:\/\//i.test(relay))) return null;
    return {
      pubkey: pubkey.toLowerCase(),
      relays,
      secret: secret.toLowerCase(),
      lud16,
    };
  } catch {
    return null;
  }
}

export function isValidNwcUri(raw: string) {
  return parseNwcUri(raw) !== null;
}

export function loadNwcUri(storage: StorageLike = defaultStorage()) {
  try {
    return (storage.getItem(NWC_STORAGE_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

export function saveNwcUri(uri: string, storage: StorageLike = defaultStorage()) {
  const parsed = parseNwcUri(uri);
  if (!parsed) return false;
  storage.setItem(NWC_STORAGE_KEY, uri.trim());
  emitNwcChange();
  return true;
}

export function clearNwcUri(storage: StorageLike = defaultStorage()) {
  storage.removeItem(NWC_STORAGE_KEY);
  emitNwcChange();
}

function emitNwcChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NWC_CHANGED_EVENT));
}

export function nwcIsConnected(storage: StorageLike = defaultStorage()) {
  return parseNwcUri(loadNwcUri(storage)) !== null;
}

export function extractPreimage(decrypted: string): string | null {
  try {
    const payload = JSON.parse(decrypted) as {
      error?: { code?: string; message?: string } | null;
      result?: { preimage?: unknown } | null;
    };
    if (payload.error && payload.error.message) return null;
    const preimage =
      typeof payload.result?.preimage === "string"
        ? payload.result.preimage.trim().toLowerCase()
        : "";
    return isHex64(preimage) ? preimage : null;
  } catch {
    return null;
  }
}

export async function payWithNWC(
  invoice: string,
  transport: NwcTransport,
): Promise<NwcPayResult> {
  const bolt11 = invoice.trim();
  if (!bolt11.toLowerCase().startsWith("ln")) {
    throw new Error("Invalid invoice");
  }
  const uri = (transport.loadUri ?? loadNwcUri)();
  const connection = parseNwcUri(uri);
  if (!connection) {
    throw new Error("NWC disconnected");
  }

  const secretKey = hexToBytes(connection.secret);
  const clientPubkey = transport.getPublicKey(secretKey);
  const request = await transport.makeRequest(
    connection.pubkey,
    secretKey,
    bolt11,
  );

  const timeoutMs = transport.timeoutMs ?? NWC_PAY_TIMEOUT_MS;
  const latch = transport.latch ?? (() => {});

  return new Promise<NwcPayResult>((resolve, reject) => {
    let settled = false;
    let sub = { close() {} };

    const timer = setTimeout(() => {
      finish(() => reject(new Error("NWC timeout")));
    }, timeoutMs);

    function finish(action: () => void) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub.close();
      action();
    }

    sub = transport.subscribe(
      connection.relays,
      {
        kinds: [NWC_WALLET_RESPONSE_KIND],
        authors: [connection.pubkey],
        "#p": [clientPubkey],
        "#e": [request.id],
      },
      {
        onevent(event) {
          try {
            const decrypted = transport.decrypt(
              connection.secret,
              connection.pubkey,
              event.content,
            );
            const preimage = extractPreimage(decrypted);
            if (!preimage) {
              finish(() => reject(new Error("NWC pay failed")));
              return;
            }
            finish(() => {
              latch();
              resolve({ preimage });
            });
          } catch (error) {
            finish(() =>
              reject(error instanceof Error ? error : new Error("NWC decrypt failed")),
            );
          }
        },
      },
    );

    void transport.publish(connection.relays, request).catch((error) => {
      finish(() =>
        reject(error instanceof Error ? error : new Error("NWC publish failed")),
      );
    });
  });
}
