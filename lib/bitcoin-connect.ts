export const bitcoinConnectInit = {
  appName: "SurfSats",
  showBalance: false,
} as const;

export const WEBLN_READY_EVENT = "webln:ready";

export type BitcoinConnectProvider = {
  enable: () => Promise<void>;
  sendPayment: (bolt11: string) => Promise<{ preimage?: string }>;
};

export type BitcoinConnectHost = {
  webln?: BitcoinConnectProvider;
};

export type WeblnAnnouncer = {
  dispatchEvent: (event: Event) => unknown;
};

function isBitcoinConnectProvider(
  value: unknown,
): value is BitcoinConnectProvider {
  if (value == null || typeof value !== "object") return false;
  if (!("enable" in value) || !("sendPayment" in value)) return false;
  return (
    typeof value.enable === "function" &&
    typeof value.sendPayment === "function"
  );
}

export function applyBitcoinConnectProvider({
  host,
  provider,
  announce,
}: {
  host: BitcoinConnectHost;
  provider: unknown;
  announce?: WeblnAnnouncer;
}): void {
  if (provider === null) {
    delete host.webln;
    announce?.dispatchEvent(new Event(WEBLN_READY_EVENT));
    return;
  }

  if (!isBitcoinConnectProvider(provider)) return;

  host.webln = provider;
  announce?.dispatchEvent(new Event(WEBLN_READY_EVENT));
}
