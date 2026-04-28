import { ethers } from "ethers";

/**
 * Decodes contract custom errors into human-readable messages.
 *
 * When a Solidity custom error reverts a transaction, ethers v6 surfaces the
 * 4-byte selector as `err.data` (or `err.info.error.data`, depending on
 * provider). Raw this looks like `0x3cf806b4`, which is useless to a user.
 *
 * We build an ethers `Interface` with every custom error declared by our
 * contracts and let it do the parsing + arg decoding, then map the error name
 * to a sentence in plain English. Anything we can't decode falls back to
 * ethers' own `shortMessage`.
 */
const errorIface = new ethers.Interface([
  // DIDRegistry
  "error NotRegistered()",
  "error AlreadyRegistered()",
  "error Revoked()",
  // CarrierCredential
  "error IssuerNotActive()",
  "error SubjectNotActive()",
  "error AlreadyIssued()",
  "error NotIssuer()",
  "error VCNotFound()",
  // ConsignmentRegistry
  "error UnknownConsignment()",
  "error ShipperNotActive()",
  "error NotCurrentCustodian()",
  "error RecipientNotLicensed()",
  "error RecipientNotActive()",
  "error AlreadyDelivered()",
  // Access control (H-1, H-2)
  "error IssuerNotApproved()",
  "error NotOracle()",
  "error NotOwner()",
]);

const FRIENDLY: Record<string, string> = {
  // DIDRegistry
  NotRegistered:
    "The address has no DID registered on-chain. Register it first.",
  AlreadyRegistered:
    "This address already has a DID registered.",
  Revoked:
    "This DID has been revoked and can no longer be used.",
  // CarrierCredential
  IssuerNotActive:
    "The issuer DID is not active (unregistered or revoked).",
  SubjectNotActive:
    "The subject DID is not active (unregistered or revoked).",
  AlreadyIssued:
    "A Verifiable Credential with this hash already exists.",
  NotIssuer:
    "Only the original issuer can revoke this credential.",
  VCNotFound:
    "The requested Verifiable Credential is not on-chain.",
  // ConsignmentRegistry
  UnknownConsignment:
    "No consignment exists with that ID.",
  ShipperNotActive:
    "Only an address with an active DID can create a consignment.",
  NotCurrentCustodian:
    "You are not the current custodian — only the holder can transfer or mark delivered.",
  RecipientNotLicensed:
    "The recipient is registered but does not hold an active LicensedCarrier Verifiable Credential.",
  RecipientNotActive:
    "The recipient address is not registered as an active DID.",
  AlreadyDelivered:
    "This consignment has already been marked Delivered — no further transfers allowed.",
  // Access control
  IssuerNotApproved:
    "This issuer is not on the approved-issuer allowlist for that credential schema.",
  NotOracle:
    "Only approved IoT oracles can anchor sensor batches.",
  NotOwner:
    "Only the contract owner can perform this action.",
};

function findRevertData(err: unknown): string | null {
  const candidates = [
    (err as { data?: unknown })?.data,
    (err as { info?: { error?: { data?: unknown } } })?.info?.error?.data,
    (err as { error?: { data?: unknown } })?.error?.data,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("0x") && c.length >= 10) return c;
  }
  return null;
}

export function friendlyError(err: unknown): string {
  // 1) Try to decode a custom error selector
  const data = findRevertData(err);
  if (data) {
    try {
      const parsed = errorIface.parseError(data);
      if (parsed) {
        const msg = FRIENDLY[parsed.name] ?? parsed.name;
        return `${msg} (${parsed.name})`;
      }
    } catch {
      // not one of ours — fall through
    }
  }

  // 2) User rejection, insufficient funds, nonce errors — ethers sets .shortMessage
  const sm = (err as { shortMessage?: string })?.shortMessage;
  if (sm) return sm;

  // 3) Last resort
  const m = err instanceof Error ? err.message : String(err);
  return m.split(" (action=")[0];
}
