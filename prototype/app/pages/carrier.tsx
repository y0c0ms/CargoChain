import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const NFT_ABI = [
  "function setApprovalForAll(address operator,bool approved) external",
  "function ownerOf(uint256 tokenId) view returns (address)",
];
const CUSTODY_ABI = [
  "function transferCustody(uint256 tokenId,address to,string locationUnLocode,bytes32 proofOfHandshake) external",
  "function hopCount(uint256 tokenId) view returns (uint256)",
];

export default function Carrier() {
  const [tokenId, setTokenId] = useState("1");
  const [toAddr, setToAddr] = useState("");
  const [loc, setLoc] = useState("PTOPO");
  const [status, setStatus] = useState("idle");

  async function takeAndForward() {
    try {
      setStatus("connecting...");
      const nftAddr = process.env.NEXT_PUBLIC_CONSIGNMENT!;
      const custodyAddr = process.env.NEXT_PUBLIC_CUSTODY!;
      const { signer } = await getSigner();
      const nft = new ethers.Contract(nftAddr, NFT_ABI, signer);

      setStatus("approving CustodyLedger...");
      const a = await nft.setApprovalForAll(custodyAddr, true);
      await a.wait();

      const custody = new ethers.Contract(custodyAddr, CUSTODY_ABI, signer);
      const handshake = ethers.keccak256(ethers.toUtf8Bytes(`${Date.now()}`));
      setStatus("transferring custody...");
      const tx = await custody.transferCustody(tokenId, toAddr, loc, handshake);
      await tx.wait();
      const hops = await custody.hopCount(tokenId);
      setStatus(`handover complete \u2713 (hop #${hops})`);
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
          Accept custody and hand off to the next carrier. Recipient must hold a
          valid <code>LicensedCarrier</code> Verifiable Credential.
        </p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">Token ID</span>
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
            onClick={takeAndForward}
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
