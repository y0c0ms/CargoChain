import type { VerifiableCredential } from "./vc-issuer";

/**
 * Thin IndexedDB-backed VC wallet — the *holder* of VCs in the SSI flow.
 *
 * Concept-map nodes: Wallet · Holder (VC lifecycle) · Off-ledger storage ·
 *                    Selective disclosure (expose only what the Verifier asks).
 */

const DB = "cargochain-wallet";
const STORE = "vcs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "hash" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVC(hash: string, vc: VerifiableCredential): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ hash, vc, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listVCs(): Promise<Array<{ hash: string; vc: VerifiableCredential }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as any[]);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Produce a Verifiable Presentation — selective-disclosure subset of claims
 * that the holder shares with a verifier. Returns only the requested attributes
 * plus the proof so the verifier can check the issuer's signature on the full VC.
 */
export function buildPresentation(
  vc: VerifiableCredential,
  discloseAttrs: string[]
): Partial<VerifiableCredential> {
  const subset: Record<string, unknown> = { id: vc.credentialSubject.id };
  for (const attr of discloseAttrs) {
    if (attr in vc.credentialSubject) subset[attr] = vc.credentialSubject[attr];
  }
  return {
    "@context": vc["@context"],
    type: ["VerifiablePresentation", ...vc.type],
    issuer: vc.issuer,
    credentialSubject: subset as VerifiableCredential["credentialSubject"],
    issuanceDate: vc.issuanceDate,
    proof: vc.proof,
  };
}
