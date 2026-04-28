import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const REGISTRY_ABI = [
  "function consignments(uint256) view returns (address shipper,address currentCustodian,uint8 status,bytes32 manifestHash,string manifestURI,uint64 createdAt)",
  "function historyOf(uint256 id) view returns (tuple(address from,address to,uint64 timestamp,string locationUnLocode,bytes32 proofOfHandshake)[])",
  "function hopCount(uint256 id) view returns (uint256)",
];
const MERKLE_ABI = [
  "function batchesOf(uint256 tokenId) view returns (uint256[])",
];

const STATUS = ["Created", "InTransit", "Delivered", "Disputed"];

export default function Regulator() {
  const [tokenId, setTokenId] = useState("1");
  const [status, setStatus] = useState("idle");
  const [audit, setAudit] = useState<string>("");

  async function run() {
    try {
      setStatus("fetching audit trail...");
      setAudit("");
      const { signer } = await getSigner();
      const registry = new ethers.Contract(process.env.NEXT_PUBLIC_REGISTRY!, REGISTRY_ABI, signer);
      const merkle   = new ethers.Contract(process.env.NEXT_PUBLIC_MERKLE!,   MERKLE_ABI,   signer);

      const [c, history, batches] = await Promise.all([
        registry.consignments(tokenId).catch(() => null),
        registry.historyOf(tokenId).catch(() => []),
        merkle.batchesOf(tokenId).catch(() => []),
      ]);

      const lines: string[] = [];
      lines.push(`Consignment #${tokenId}`);
      if (c && c.shipper !== ethers.ZeroAddress) {
        lines.push(`Shipper          : ${c.shipper}`);
        lines.push(`Current custodian: ${c.currentCustodian}`);
        lines.push(`Status           : ${STATUS[Number(c.status)] ?? c.status}`);
        lines.push(`Manifest hash    : ${c.manifestHash}`);
        lines.push(`Manifest URI     : ${c.manifestURI}`);
        lines.push(`Created          : ${new Date(Number(c.createdAt) * 1000).toISOString()}`);
        lines.push(``);
        lines.push(`Note: full manifest data lives off-chain at the URI.`);
        lines.push(`      Fetch the JSON, hash it, and compare to the hash above`);
        lines.push(`      to verify it has not been tampered with.`);
      } else {
        lines.push(`(no consignment with id ${tokenId})`);
      }
      lines.push(``);
      lines.push(`Custody hops: ${history.length}`);
      for (const h of history) {
        lines.push(`  ${new Date(Number(h.timestamp) * 1000).toISOString()}  ${h.locationUnLocode}  ${h.from.slice(0,8)}… → ${h.to.slice(0,8)}…`);
      }
      lines.push(``);
      lines.push(`IoT batches anchored: ${batches.length}`);
      for (const b of batches) lines.push(`  batch #${b}`);

      setAudit(lines.join("\n"));
      setStatus("done");
    } catch (err) {
      setStatus(`error: ${friendlyError(err)}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-teal-700 text-sm hover:underline">&larr; Home</a>
        <h1 className="text-3xl font-bold text-teal-700 mt-2 mb-4">Regulator Dashboard</h1>
        <p className="text-slate-600 mb-6">
          Full audit trail for any consignment. Shows custody, manifest hash,
          and IoT-anchor count — all readable by anyone, no permissions needed.
        </p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">Consignment ID</span>
            <input value={tokenId} onChange={(e) => setTokenId(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <button onClick={run} data-testid="audit-btn"
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
            Run Audit
          </button>
          <div className="text-sm text-slate-500">Status: <span data-testid="status">{status}</span></div>
          {audit && (
            <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded whitespace-pre-wrap" data-testid="audit">{audit}</pre>
          )}
        </div>
      </div>
    </main>
  );
}
