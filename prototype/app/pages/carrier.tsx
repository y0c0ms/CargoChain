import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const REGISTRY_ABI = [
  "function transferCustody(uint256 id,address to,string locationUnLocode,bytes32 proofOfHandshake) external",
  "function custodianOf(uint256 id) view returns (address)",
  "function hopCount(uint256 id) view returns (uint256)",
];

export default function Carrier() {
  const [tokenId, setTokenId] = useState("1");
  const [toAddr, setToAddr]   = useState("");
  const [loc, setLoc]         = useState("PTOPO");
  const [status, setStatus]   = useState("idle");

  async function transfer() {
    try {
      setStatus("connecting...");
      const addr = process.env.NEXT_PUBLIC_REGISTRY;
      if (!addr) {
        setStatus("error: NEXT_PUBLIC_REGISTRY not set in prototype/app/.env.local");
        return;
      }

      const { signer } = await getSigner();
      const registry = new ethers.Contract(addr, REGISTRY_ABI, signer);

      // QR-handshake nonce: in production, both parties co-sign a fresh nonce on
      // physical handover. Here we hash the timestamp as a stand-in.
      const handshake = ethers.keccak256(ethers.toUtf8Bytes(`${Date.now()}`));

      setStatus("transferring custody...");
      const tx = await registry.transferCustody(tokenId, toAddr, loc, handshake);
      await tx.wait();
      const hops = await registry.hopCount(tokenId);
      setStatus(`handover complete ✓ (hop #${hops})`);
    } catch (err) {
      setStatus(`error: ${friendlyError(err)}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-teal-700 text-sm hover:underline">&larr; Home</a>
        <h1 className="text-3xl font-bold text-teal-700 mt-2 mb-4">Carrier Dashboard</h1>
        <p className="text-slate-600 mb-6">
          Transfer custody to the next carrier. The recipient must hold an
          active <code>LicensedCarrier</code> Verifiable Credential — the
          contract enforces this; off-chain trust isn't required.
        </p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">Consignment ID</span>
            <input value={tokenId} onChange={(e) => setTokenId(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">Recipient address</span>
            <input value={toAddr} onChange={(e) => setToAddr(e.target.value)}
              placeholder="0x..."
              className="mt-1 w-full border rounded-lg p-2 font-mono text-xs" />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">Handover location (UN/LOCODE)</span>
            <input value={loc} onChange={(e) => setLoc(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <button
            onClick={transfer}
            data-testid="transfer-btn"
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
          >
            Transfer Custody
          </button>
          <div className="text-sm text-slate-500">Status: <span data-testid="status">{status}</span></div>
        </div>
      </div>
    </main>
  );
}
