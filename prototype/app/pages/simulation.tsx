import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const MERKLE_ABI = [
  "function batchesOf(uint256 tokenId) view returns (uint256[])",
  "function batches(uint256) view returns (uint256 tokenId,bytes32 merkleRoot,uint32 readingCount,uint64 firstTs,uint64 lastTs,address submitter)",
  "function verifyReading(uint256 batchId,bytes32 leaf,bytes32[] proof) view returns (bool)",
];

interface BatchInfo {
  batchId:      string;
  tokenId:      string;
  merkleRoot:   string;
  readingCount: number;
  firstTs:      number;
  lastTs:       number;
}

interface Reading {
  index:       number;
  ts:          number;
  tempC:       string;
  tempTenthsC: number;
  gpsHash:     string;
  leafHex:     string;
  proof:       string[];
}

type VerifyState = "idle" | "loading" | "valid" | "invalid";

export default function Simulation() {
  const [tokenId, setTokenId]                 = useState("1");
  const [watching, setWatching]               = useState(false);
  const [batches, setBatches]                 = useState<BatchInfo[]>([]);
  const [readings, setReadings]               = useState<Record<string, Reading[]>>({});
  const [verifyResults, setVerifyResults]     = useState<Record<string, VerifyState>>({});
  const [status, setStatus]                   = useState("idle");
  const [lastPolled, setLastPolled]           = useState<string>("");
  const intervalRef                            = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollBatches = useCallback(async () => {
    try {
      const { signer } = await getSigner();
      const merkle = new ethers.Contract(
        process.env.NEXT_PUBLIC_MERKLE!,
        MERKLE_ABI,
        signer
      );
      const ids: bigint[] = await merkle.batchesOf(BigInt(tokenId));
      const details = await Promise.all(ids.map((id: bigint) => merkle.batches(id)));
      const list: BatchInfo[] = ids.map((id, i) => ({
        batchId:      id.toString(),
        tokenId:      details[i].tokenId.toString(),
        merkleRoot:   details[i].merkleRoot,
        readingCount: Number(details[i].readingCount),
        firstTs:      Number(details[i].firstTs),
        lastTs:       Number(details[i].lastTs),
      }));
      setBatches(list);
      setLastPolled(new Date().toLocaleTimeString());
    } catch (err) {
      setStatus(`error: ${friendlyError(err)}`);
    }
  }, [tokenId]);

  useEffect(() => {
    if (!watching) return;
    pollBatches();
    intervalRef.current = setInterval(pollBatches, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [watching, pollBatches]);

  async function loadReadings(batchId: string) {
    try {
      const res = await fetch(`/oracle-batches/batch-${batchId}.json`);
      if (!res.ok) {
        setStatus(`Batch ${batchId} JSON not found in /public/oracle-batches/. Run the oracle simulator first.`);
        return;
      }
      const data = await res.json();
      setReadings((prev) => ({ ...prev, [batchId]: data.readings }));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  async function verifyReading(batchId: string, reading: Reading) {
    const key = `${batchId}-${reading.index}`;
    setVerifyResults((p) => ({ ...p, [key]: "loading" }));
    try {
      const { signer } = await getSigner();
      const merkle = new ethers.Contract(
        process.env.NEXT_PUBLIC_MERKLE!,
        MERKLE_ABI,
        signer
      );
      const valid: boolean = await merkle.verifyReading(BigInt(batchId), reading.leafHex, reading.proof);
      setVerifyResults((p) => ({ ...p, [key]: valid ? "valid" : "invalid" }));
    } catch (err) {
      setStatus(`verify error: ${friendlyError(err)}`);
      setVerifyResults((p) => ({ ...p, [key]: "invalid" }));
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <a href="/" className="text-teal-700 text-sm hover:underline">&larr; Home</a>
        <h1 className="text-3xl font-bold text-teal-700 mt-2 mb-4">IoT Live Simulation</h1>
        <p className="text-slate-600 mb-2">
          The oracle simulator pushes signed temperature/GPS readings, batches them
          into a Merkle tree every 8 readings, and anchors the root on-chain.
        </p>
        <p className="text-slate-500 text-sm mb-6">
          Click <em>Verify</em> on any reading — the contract recomputes the
          Merkle path and answers ✅ if the reading was part of the anchored
          batch, ❌ if it has been tampered with.
        </p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-end gap-3">
            <label className="block flex-1">
              <span className="text-sm text-slate-700">Consignment ID</span>
              <input value={tokenId} onChange={(e) => setTokenId(e.target.value)}
                className="mt-1 w-full border rounded-lg p-2" />
            </label>
            <button
              onClick={() => setWatching((w) => !w)}
              className={`px-4 py-2 rounded-lg text-white ${watching ? "bg-rose-500 hover:bg-rose-600" : "bg-teal-600 hover:bg-teal-700"}`}
            >
              {watching ? "Stop watching" : "Start watching"}
            </button>
          </div>
          <div className="text-xs text-slate-500">
            {watching
              ? `Watching consignment ${tokenId} · last polled ${lastPolled}`
              : "Click Start watching to subscribe to BatchAnchored events (4 s polling)."}
          </div>
          {status !== "idle" && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded">{status}</div>
          )}
        </div>

        <h2 className="text-xl font-semibold text-teal-700 mt-8 mb-3">
          Anchored batches ({batches.length})
        </h2>
        {batches.length === 0 && (
          <div className="text-sm text-slate-500 italic">
            No batches anchored yet for consignment {tokenId}. Start the oracle simulator:
            <pre className="text-xs bg-slate-100 p-2 rounded mt-1 font-mono">
              MERKLE_ADDR=&lt;address&gt; TOKEN_ID={tokenId} npm run oracle:sim
            </pre>
          </div>
        )}
        <div className="space-y-3">
          {batches.map((b) => {
            const rs = readings[b.batchId];
            return (
              <div key={b.batchId} className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-semibold text-slate-800">Batch #{b.batchId}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {b.readingCount} readings · {new Date(b.firstTs * 1000).toLocaleTimeString()} – {new Date(b.lastTs * 1000).toLocaleTimeString()}
                    </div>
                    <div className="text-xs font-mono text-slate-600 mt-1 break-all">
                      root: {b.merkleRoot}
                    </div>
                  </div>
                  {!rs && (
                    <button
                      onClick={() => loadReadings(b.batchId)}
                      className="text-xs bg-slate-700 text-white px-3 py-1 rounded hover:bg-slate-800"
                    >
                      Load Readings
                    </button>
                  )}
                </div>
                {rs && (
                  <table className="w-full mt-3 text-xs">
                    <thead className="text-slate-500 border-b">
                      <tr>
                        <th className="text-left p-1">#</th>
                        <th className="text-left p-1">Timestamp</th>
                        <th className="text-left p-1">Temp</th>
                        <th className="text-left p-1">Verify</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rs.map((r) => {
                        const k = `${b.batchId}-${r.index}`;
                        const v = verifyResults[k];
                        return (
                          <tr key={r.index} className="border-b border-slate-100">
                            <td className="p-1 font-mono">{r.index}</td>
                            <td className="p-1 font-mono text-slate-600">{new Date(r.ts * 1000).toLocaleTimeString()}</td>
                            <td className="p-1 font-mono">{r.tempC}°C</td>
                            <td className="p-1">
                              <button
                                onClick={() => verifyReading(b.batchId, r)}
                                disabled={v === "loading"}
                                className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded hover:bg-teal-700 disabled:bg-slate-300"
                              >
                                Verify
                              </button>
                              {v === "loading" && <span className="ml-2 text-slate-500">…</span>}
                              {v === "valid"   && <span className="ml-2 text-emerald-600 font-semibold">✅ valid</span>}
                              {v === "invalid" && <span className="ml-2 text-rose-600 font-semibold">❌ invalid</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
