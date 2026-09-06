import { TerminalCard } from "@/components/ui/TerminalCard";

export function TheMoneyCard() {
  return (
    <TerminalCard title="THE_MONEY" tag="NETWORK_RULES" status="idle">
      <ul className="list-none space-y-2 font-mono text-xs tracking-wide text-salt uppercase">
        <li>● 21 SATS standard input for graffiti / arcade.</li>
        <li>● 100% of sat inflows are zapped to creators/relays.</li>
        <li>● No accounts. No tracking. Sovereign keys required.</li>
        <li className="text-zinc-raw">● Treasury balance: 0 SATS.</li>
      </ul>
    </TerminalCard>
  );
}
