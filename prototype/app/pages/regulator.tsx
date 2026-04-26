import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const NFT_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getManifest(uint256 tokenId) view returns (tuple(string hbl,string originCode,string destCode,uint32 weightKg,string commodity,int16 tempMinTenthsC,int16 tempMaxTenthsC,uint64 mintedAt))",
];
const CUSTODY_ABI = [
  "function historyOf(uint256 tokenId) view returns (tuple(address from,address to,uint64 timestamp,string locationUnLocode,bytes32 proofOfHandshake)[])",
  "function hopCount(uint256 tokenId) view returns (uint256)",
];
const MERKLE_ABI = [
  "function batchesOf(uint256 tokenId) view returns (uint256[])",
];

export default function Regulator() {
  const [tokenId, setTokenId] = useState("1");
  const [status, setStatus] = useState("idle");
  const [audit, setAudit] = useState<string>("");

  async function run() {
    try {
      setStatus("fetching audit trail...");
      setAudit("");
      const { signer } = await getSigner();
      const nft = new ethers.Contract(process.env.NEXT_PUBLIC_CONSIGNMENT!, NFT_ABI, signer);
      const cust = new ethers.Contract(process.env.NEXT_PUBLIC_CUSTODY!, CUSTODY_ABI, signer);
      const merkle = new ethers.Contract(process.env.NEXT_PUBLIC_MERKLE!, MERKLE_ABI, signer);

      const [owner, manifest, history, batches] = await Promise.all([
        nft.ownerOf(tokenId).catch(() => "?"),
        nft.getManifest(tokenId).catch(() => null),
        cust.historyOf(tokenId).catch(() => []),
        merkle.batchesOf(tokenId).catch(() => []),
      ]);

      const lines: string[] = [];
      lines.push(`Token ${tokenId}`);
      lines.push(`Current custodian: ${owner}`);
      if (manifest) {
        lines.push(`HBL: ${manifest.hbl}`);
        lines.push(`Route: ${manifest.originCode} -> ${manifest.destCode}`);
        lines.push(`Weight: ${manifest.weightKg} kg`);
        lines.push(`Commodity: ${manifest.commodity}`);
        lines.push(`Temp range: ${Number(manifest.tempMinTenthsC)/10}\u00b0C to ${Number(manifest.tempMaxTenthsC)/10}\u00b0C`);
      }
      lines.push(`Custody hops: ${history.length}`);
      for (const h of history) {
        lines.push(`  ${new Date(Number(h.timestamp) * 1000).toISOString()}  ${h.locationUnLocode}  ${h.from.slice(0,8)}\u2026 -> ${h.to.slice(0,8)}\u2026`);
      }
      lines.push(`IoT batches anchored: ${batches.length}`);
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
          Full audit trail for any consignment. Shows custody, manifest, and
          IoT anchor count &mdash; never the commercial pricing.
        </p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">Token ID</span>
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
