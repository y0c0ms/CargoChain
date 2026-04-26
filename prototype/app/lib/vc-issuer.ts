import { ethers } from "ethers";
import { addressToDID } from "./did-resolver";

/**
 * Verifiable Credential (W3C VC Data Model v2) issuer + verifier helpers.
 *
 * Concept-map nodes: Verifiable Credentials · VC Lifecycle · Issuer/Holder/Verifier ·
 *                    Selective Disclosure · On-ledger hash anchoring.
 *
 * The *full* VC lives off-chain (in the holder's IndexedDB wallet). Only a
 * canonical-JSON keccak256 hash is anchored on-chain via CarrierCredential.issueVC.
 */

export type VCSchema =
  | "LicensedCarrier"
  | "CustomsOfficer"
  | "PharmaGrade"
  | "PortOperator"
  | "InspectorAuthority";

export interface VerifiableCredential {
  "@context": string[];
  type: string[];
  issuer: string;            // DID
  credentialSubject: {
    id: string;              // DID of holder
    [attr: string]: unknown;
  };
  issuanceDate: string;
  expirationDate?: string;
  proof?: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    jws: string;             // detached JWS signature
  };
}

function canonicalise(obj: unknown): string {
  if (Array.isArray(obj)) return "[" + obj.map(canonicalise).join(",") + "]";
  if (obj && typeof obj === "object") {
    const keys = Object.keys(obj as object).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalise((obj as any)[k])).join(",") + "}";
  }
  return JSON.stringify(obj);
}

export function vcHash(vc: VerifiableCredential): string {
  const { proof: _proof, ...rest } = vc;  // hash the unsigned form
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalise(rest)));
}

export async function issueVC(params: {
  issuerWallet: ethers.Wallet;
  chainId: number;
  holderAddress: string;
  schema: VCSchema;
  claims: Record<string, unknown>;
  expirationDate?: string;
}): Promise<VerifiableCredential> {
  const issuerDID = addressToDID(params.chainId, params.issuerWallet.address);
  const holderDID = addressToDID(params.chainId, params.holderAddress);
  const vc: VerifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/cargochain/schemas/v1",
    ],
    type: ["VerifiableCredential", `${params.schema}Credential`],
    issuer: issuerDID,
    credentialSubject: { id: holderDID, ...params.claims },
    issuanceDate: new Date().toISOString(),
    ...(params.expirationDate ? { expirationDate: params.expirationDate } : {}),
  };

  const unsigned = canonicalise(vc);
  const sig = await params.issuerWallet.signMessage(unsigned);
  vc.proof = {
    type: "EcdsaSecp256k1Signature2019",
    created: new Date().toISOString(),
    proofPurpose: "assertionMethod",
    verificationMethod: `${issuerDID}#keys-1`,
    jws: sig,
  };
  return vc;
}

export function verifyVCSignature(vc: VerifiableCredential): boolean {
  if (!vc.proof) return false;
  const { proof, ...rest } = vc;
  const unsigned = canonicalise(rest);
  const recovered = ethers.verifyMessage(unsigned, proof.jws);
  const expected = vc.issuer.split(":").pop();          // did:cargochain:1:0x..
  return !!expected && recovered.toLowerCase() === expected.toLowerCase();
}

export const SCHEMA_ENUM: Record<VCSchema, number> = {
  LicensedCarrier: 0,
  CustomsOfficer: 1,
  PharmaGrade: 2,
  PortOperator: 3,
  InspectorAuthority: 4,
};
