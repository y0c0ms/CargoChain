import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const ESCROW_ABI = [
  "function escrows(uint256) view returns (address shipper,address carrier,address receiver,uint256 amount,uint256 tokenId,bool released,bool refunded)",
  "function releaseWithProof(uint256 tokenId,uint256 batchId,uint256[2] a,uint256[2][2] b,uint256[2] c,uint256[] publicIn) external",
];
const MERKLE_ABI = [
  "function rootOf(uint256 batchId) view returns (bytes32, uint256)",
];

export default function Receiver() {
  const [tokenId, setTokenId] = useState("1");
  const [batchId, setBatchId] = useState("1");
  const [status, setStatus] = useState("idle");
  const [escrow, setEscrow] = useState<string>("");

  async function inspect() {
    try {
      setStatus("loading escrow...");
      const addr = process.env.NEXT_PUBLIC_ESCROW!;
      const { signer } = await getSigner();
      const esc = new ethers.Contract(addr, ESCROW_ABI, signer);
      const e = await esc.escrows(tokenId);
      if (e.amount === 0n) {
        setEscrow(`No escrow funded for token ${tokenId}.`);
      } else {
        setEscrow(
          `Shipper: ${e.shipper.slice(0,10)}… Carrier: ${e.carrier.slice(0,10)}… ` +
          `Receiver: ${e.receiver.slice(0,10)}… Amount: ${ethers.formatEther(e.amount)} FRT ` +
          `Released: ${e.released} Refunded: ${e.refunded}`
        );
      }
      setStatus("idle");
    } catch (err) {
      setStatus(`error: ${friendlyError(err)}`);
    }
  }

  async function prove() {
    try {
      setStatus("looking up batch root...");
      const escAddr = process.env.NEXT_PUBLIC_ESCROW!;
      const merkleAddr = process.env.NEXT_PUBLIC_MERKLE!;
      const { signer } = await getSigner();
      const merkle = new ethers.Contract(merkleAddr, MERKLE_ABI, signer);
      const [root, batchToken] = await merkle.rootOf(batchId);
      if (BigInt(batchToken) !== BigInt(tokenId)) {
        setStatus(`error: batch ${batchId} belongs to token ${batchToken}, not ${tokenId}`);
        return;
      }

      setStatus("submitting ZK proof (mock)...");
      const esc = new ethers.Contract(escAddr, ESCROW_ABI, signer);
      const a: [bigint, bigint] = [0n, 0n];
      const b: [[bigint, bigint], [bigint, bigint]] = [[0n, 0n], [0n, 0n]];
      const c: [bigint, bigint] = [0n, 0n];
      // publicIn[2] MUST equal the on-chain Merkle root for this batch (H-3 binding).
      const publicIn = [20n, 80n, BigInt(root)];
      const tx = await esc.releaseWithProof(tokenId, batchId, a, b, c, publicIn);
      await tx.wait();
      setStatus("proof accepted & escrow released ✓");
    } catch (err) {
      setStatus(`error: ${friendlyError(err)}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-teal-700 text-sm hover:underline">&larr; Home</a>
        <h1 className="text-3xl font-bold text-teal-700 mt-2 mb-4">Receiver Dashboard</h1>
        <p className="text-slate-600 mb-6">
          Inspect an escrow and submit a zero-knowledge cold-chain compliance
          proof to release the carrier's payment.
        </p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">Token ID</span>
            <input value={tokenId} onChange={(e) => setTokenId(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">IoT Batch ID</span>
            <input value={batchId} onChange={(e) => setBatchId(e.target.value)}
              className="mt-1 w-full border rounded-lg p-2" />
          </label>
          <div className="flex gap-3">
            <button onClick={inspect} data-testid="inspect-btn"
              className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800">
              Inspect Escrow
            </button>
            <button onClick={prove} data-testid="prove-btn"
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
              Submit ZK Proof
            </button>
          </div>
          <div className="text-sm text-slate-500">Status: <span data-testid="status">{status}</span></div>
          {escrow && (
            <div className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded" data-testid="escrow">
              {escrow}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
