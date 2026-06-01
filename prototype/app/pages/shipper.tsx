import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const FACTORY_ABI = [
  "function create(bytes32 docsHash,string docsURI) returns (uint256 id, address pkg)",
  "event PackageCreated(uint256 indexed id,address indexed package,address indexed shipper,bytes32 docsHash,string docsURI)",
];

export default function Shipper() {
  const [hbl, setHbl] = useState("HBL-2026-042");
  const [originCode, setOriginCode] = useState("PTLIS");
  const [destCode, setDestCode] = useState("AOLAD");
  const [tokenId, setTokenId] = useState<string>("");
  const [pkgAddr, setPkgAddr] = useState<string>("");
  const [docHash, setDocHash] = useState<string>("");
  const [status, setStatus] = useState<string>("idle");
  const [mode, setMode] = useState<string>("");

  async function create() {
    try {
      setStatus("connecting...");
      const addr = process.env.NEXT_PUBLIC_FACTORY;
      if (!addr) {
        setStatus("error: NEXT_PUBLIC_FACTORY not set in app/.env.local");
        return;
      }

      const { signer, address, mode: m } = await getSigner();
      setMode(`${m} · ${address.slice(0, 6)}…${address.slice(-4)}`);

      // Build the transport document off-chain as JSON, then hash it.
      // Only the hash + URI go on-chain — the document itself stays off-chain.
      const doc = {
        hbl,
        originCode,
        destCode,
        weightKg: 1200,
        commodity: "PHARMACEUTICAL_VACCINE_CLASS_2",
        tempMinTenthsC: 20,
        tempMaxTenthsC: 80,
      };
      const json = JSON.stringify(doc);
      const hash = ethers.keccak256(ethers.toUtf8Bytes(json));
      setDocHash(hash);

      const factory = new ethers.Contract(addr, FACTORY_ABI, signer);
      setStatus("signing...");
      const tx = await factory.create(hash, `ipfs://docs/${hbl}`);
      setStatus("waiting for confirmation...");
      const rcpt = await tx.wait();
      const evt = (rcpt.logs as ethers.Log[])
        .map((l): ethers.LogDescription | null => {
          try { return factory.interface.parseLog(l); } catch { return null; }
        })
        .find((e): e is ethers.LogDescription => e?.name === "PackageCreated");
      if (evt) {
        setTokenId(evt.args[0].toString());
        setPkgAddr(evt.args[1] as string);
      } else {
        setTokenId("?");
      }
      setStatus("created ✓");
    } catch (err) {
      setStatus(`error: ${friendlyError(err)}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-teal-700 text-sm hover:underline">&larr; Home</a>
        <h1 className="text-3xl font-bold text-teal-700 mt-2 mb-4">Shipper Dashboard</h1>
        <p className="text-slate-600 mb-2">
          Register a new package on-chain. The factory spawns a dedicated
          Package contract for this shipment. Only the hash of the transport
          document is committed, the full JSON document lives off-chain at the URI.
        </p>
        <p className="text-slate-500 text-xs mb-6">
          You sign the transaction yourself — there's no operator approval step.
          Anyone can ship.
        </p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">House Bill of Lading</span>
            <input
              value={hbl}
              onChange={(e) => setHbl(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-slate-700">Origin (UN/LOCODE)</span>
              <input
                value={originCode}
                onChange={(e) => setOriginCode(e.target.value)}
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-700">Destination (UN/LOCODE)</span>
              <input
                value={destCode}
                onChange={(e) => setDestCode(e.target.value)}
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
          </div>
          <button
            onClick={create}
            data-testid="create-btn"
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
          >
            Create Package
          </button>
          <div className="text-sm text-slate-500">Status: <span data-testid="status">{status}</span></div>
          {mode && <div className="text-xs text-slate-400">Wallet: {mode}</div>}
          {docHash && (
            <div className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded">
              <div className="text-slate-500 mb-1">Document hash anchored:</div>
              <div className="break-all">{docHash}</div>
            </div>
          )}
          {tokenId && (
            <div className="text-sm text-teal-700" data-testid="created-id">
              Package ID: <code>{tokenId}</code>
              {pkgAddr && (
                <div className="text-xs font-mono text-slate-500 mt-1 break-all">
                  Clone address: {pkgAddr}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
