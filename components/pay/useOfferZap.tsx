"use client";

import { useCallback, useRef, useState } from "react";
import { BrutalistQRModal } from "@/components/pay/BrutalistQRModal";
import { useSurfSatsWebLN } from "@/components/pay/useSurfSatsWebLN";
import { useNWC } from "@/hooks/useNWC";
import { drop21Presentation } from "@/lib/drop-21";

export function useOfferZap({
  amountSats = 21,
  onPreimage,
}: {
  amountSats?: number;
  onPreimage: (preimage: string) => void;
}) {
  const { isConnected, send21SatZap } = useSurfSatsWebLN();
  const nwc = useNWC();
  const [bolt11, setBolt11] = useState("");
  const [open, setOpen] = useState(false);
  const onPreimageRef = useRef(onPreimage);
  const connectedRef = useRef(isConnected);
  const sendRef = useRef(send21SatZap);
  const nwcRef = useRef(nwc);
  onPreimageRef.current = onPreimage;
  connectedRef.current = isConnected;
  sendRef.current = send21SatZap;
  nwcRef.current = nwc;

  const handlePreimage = useCallback((preimage: string) => {
    setOpen(false);
    onPreimageRef.current(preimage);
  }, []);

  const offer = useCallback(async (invoice: string) => {
    const bolt = invoice.trim();
    if (!bolt.toLowerCase().startsWith("ln")) return;
    setBolt11(bolt);
    if (nwcRef.current.isConnected) {
      try {
        const paid = await nwcRef.current.payInvoice(bolt);
        handlePreimage(paid.preimage);
        return;
      } catch {
        setOpen(true);
        return;
      }
    }
    if (drop21Presentation(connectedRef.current) === "zap") {
      try {
        await sendRef.current(bolt, handlePreimage);
        return;
      } catch {
        setOpen(true);
      }
    } else {
      setOpen(true);
    }
  }, [handlePreimage]);

  const modal = (
    <BrutalistQRModal
      isOpen={open && Boolean(bolt11)}
      onClose={() => setOpen(false)}
      bolt11Invoice={bolt11}
      amountSats={amountSats}
      onPreimageConfirmed={handlePreimage}
    />
  );

  return { offer, modal, close: () => setOpen(false) };
}
