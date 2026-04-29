import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const REGISTRY_ABI = [
  "function transferCustody(uint256 id,address to,string locationUnLocode,bytes32 proofOfHandshake) external",
  "function markDelivered(uint256 id) external",
  "function custodianOf(uint256 id) view returns (address)",
  "function hopCount(uint256 id) view returns (uint256)",
];

export default function Carrier() {
  const [tokenId, setTokenId] = useState("1");
  const [toAddr, setToAddr]   = useState("");
  const [loc, setLoc]         = useState("PTOPO");
  const [status, setStatus]   = useState("idle");

  function getRegistry(signer: ethers.Signer) {
    const addr = process.env.NEXT_PUBLIC_REGISTRY;
    if (!addr) throw new Error("NEXT_PUBLIC_REGISTRY not set in prototype/app/.env.local");
    return new ethers.Contract(addr, REGISTRY_ABI, signer);
  }

  async function transfer() {
    try {
      setStatus("connecting...");
      const { signer } = await getSigner();
      const registry = getRegistry(signer);
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

  async function markDelivered() {
    try {
      setStatus("connecting...");
      const { signer } = await getSigner();
      const registry = getRegistry(signer);

      setStatus("marking delivered...");
      const tx = await registry.markDelivered(tokenId);
      await tx.wait();
      setStatus(`delivered ✓ (status now: Delivered)`);
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
          Transfer custody to the next carrier (must hold a <code>LicensedCarrier</code> VC),
          or mark the consignment delivered when it reaches its destination.
          Both actions must be signed by the <strong>current custodian</strong> —
          use the picker in the top-right to switch identities.
        </p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">Consignment ID</span>
            <input value={tokenId} onChange={(e) => setTokenId(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>

          <fieldset className="border border-slate-200 rounded-lg p-4">
            <legend className="text-xs uppercase tracking-wider text-slate-500 px-1">Hand off</legend>
            <label className="block">
              <span className="text-sm text-slate-700">Recipient address</span>
              <input value={toAddr} onChange={(e) => setToAddr(e.target.value)}
                placeholder="0x..."
                className="mt-1 w-full border rounded-lg p-2 font-mono text-xs" />
            </label>
            <label className="block mt-3">
              <span className="text-sm text-slate-700">Handover location (UN/LOCODE)</span>
              <input value={loc} onChange={(e) => setLoc(e.target.value)}
                className="mt-1 w-full border rounded-lg p-2" />
            </label>
            <button
              onClick={transfer}
              data-testid="transfer-btn"
              className="mt-3 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
            >
              Transfer Custody
            </button>
          </fieldset>

          <fieldset className="border border-slate-200 rounded-lg p-4">
            <legend className="text-xs uppercase tracking-wider text-slate-500 px-1">Final delivery</legend>
            <p className="text-xs text-slate-500 mb-2">
              Only the current custodian can mark a consignment delivered.
            </p>
            <button
              onClick={markDelivered}
              data-testid="deliver-btn"
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
            >
              Mark Delivered
            </button>
          </fieldset>

          <div className="text-sm text-slate-500">Status: <span data-testid="status">{status}</span></div>
        </div>
      </div>
    </main>
  );
}
