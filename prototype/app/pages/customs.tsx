import { useState } from "react";
import { ethers } from "ethers";
import { getSigner } from "../lib/signer";
import { friendlyError } from "../lib/errors";

const CRED_ABI = [
  "function subjectHasActiveVC(address subject,uint8 schema) view returns (bool)",
];

const SCHEMAS = [
  { value: 0, label: "LicensedCarrier" },
  { value: 1, label: "CustomsOfficer" },
  { value: 2, label: "PharmaGrade" },
  { value: 3, label: "PortOperator" },
  { value: 4, label: "InspectorAuthority" },
];

export default function Customs() {
  const [subject, setSubject] = useState("");
  const [schema, setSchema] = useState(0);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState<string>("");

  async function check() {
    try {
      setStatus("checking...");
      setResult("");
      const credAddr = process.env.NEXT_PUBLIC_CARRIER_CRED!;
      const { signer } = await getSigner();
      const cred = new ethers.Contract(credAddr, CRED_ABI, signer);
      const ok = await cred.subjectHasActiveVC(subject, schema);
      setResult(ok ? "VALID \u2713" : "NOT VALID \u2717");
      setStatus("done");
    } catch (err) {
      setStatus(`error: ${friendlyError(err)}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/" className="text-teal-700 text-sm hover:underline">&larr; Home</a>
        <h1 className="text-3xl font-bold text-teal-700 mt-2 mb-4">Customs Dashboard</h1>
        <p className="text-slate-600 mb-6">
          Verify that a party holds an active Verifiable Credential of a given
          schema before allowing a consignment to cross the border.
        </p>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-700">Subject address</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="0x..."
              className="mt-1 w-full border rounded-lg p-2 font-mono text-xs" />
          </label>
          <label className="block">
            <span className="text-sm text-slate-700">Credential schema</span>
            <select value={schema} onChange={(e) => setSchema(Number(e.target.value))}
              className="mt-1 w-full border rounded-lg p-2">
              {SCHEMAS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <button
            onClick={check}
            data-testid="check-btn"
            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
          >
            Check VC
          </button>
          <div className="text-sm text-slate-500">Status: <span data-testid="status">{status}</span></div>
          {result && (
            <div className="text-lg font-semibold text-teal-700" data-testid="result">{result}</div>
          )}
        </div>
      </div>
    </main>
  );
}
