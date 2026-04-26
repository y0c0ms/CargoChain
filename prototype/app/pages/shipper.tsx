import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const CONSIGNMENT_ABI = [
  "function mint(address shipper,string metadataURI,tuple(string hbl,string originCode,string destCode,uint32 weightKg,string commodity,int16 tempMinTenthsC,int16 tempMaxTenthsC,uint64 mintedAt) m) returns (uint256)",
  "event ConsignmentMinted(uint256 indexed tokenId,address indexed shipper,string hbl,string originCode,string destCode)",
];

export default function Shipper() {
  const [tokenId, setTokenId] = useState<string>("");
  const [hbl, setHbl] = useState("HBL-2026-042");
  const [status, setStatus] = useState<string>("idle");
  const [mode, setMode] = useState<string>("");

  async function mint() {
    try {
      setStatus("connecting...");
      const addr = process.env.NEXT_PUBLIC_CONSIGNMENT;
      if (!addr) {
        setStatus("error: NEXT_PUBLIC_CONSIGNMENT not set in prototype/app/.env.local");
        return;
      }

      const { signer, address, mode: m } = await getSigner();
      setMode(`${m} · ${address.slice(0, 6)}…${address.slice(-4)}`);

      const nft = new ethers.Contract(addr, CONSIGNMENT_ABI, signer);
      const manifest = {
        hbl,
        originCode: "PTLIS",
        destCode: "AOLAD",
        weightKg: 1200,
        commodity: "PHARMACEUTICAL_VACCINE_CLASS_2",
        tempMinTenthsC: 20,
        tempMaxTenthsC: 80,
        mintedAt: 0,
      };

      setStatus("signing...");
      const tx = await nft.mint(address, `ipfs://manifest/${hbl}`, manifest);
      setStatus("waiting for confirmation...");
      const rcpt = await tx.wait();
      const evt = (rcpt.logs as ethers.Log[])
        .map((l): ethers.LogDescription | null => {
          try { return nft.interface.parseLog(l); } catch { return null; }
        })
        .find((e): e is ethers.LogDescription => e?.name === "ConsignmentMinted");
      setTokenId(evt ? evt.args[0].toString() : "?");
      setStatus("minted \u2713");
    } catch (err) {
      setStatus(`error: ${friendlyError(err)}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-teal-700 text-sm hover:underline">&larr; Home</a>
        <h1 className="text-3xl font-bold text-teal-700 mt-2 mb-4">Shipper Dashboard</h1>
        <p className="text-slate-600 mb-6">Tokenise a consignment as an ERC-721 NFT.</p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">House Bill of Lading</span>
            <input
              value={hbl}
              onChange={(e) => setHbl(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2"
            />
          </label>
          <button
            onClick={mint}
            data-testid="mint-btn"
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
          >
            Mint Consignment
          </button>
          <div className="text-sm text-slate-500">Status: <span data-testid="status">{status}</span></div>
          {mode && <div className="text-xs text-slate-400">Wallet: {mode}</div>}
          {tokenId && (
            <div className="text-sm text-teal-700" data-testid="minted-id">
              Token ID minted: <code>{tokenId}</code>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
