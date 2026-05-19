import { ethers } from "ethers";

/**
 * Decodes contract custom errors into human-readable messages.
 *
 * When a Solidity custom error reverts a transaction, ethers v6 surfaces the
 * 4-byte selector as `err.data` (or `err.info.error.data`, depending on
 * provider). Raw this looks like `0x608cc9d2`, which is useless to a user.
 *
 * We build an ethers `Interface` with every custom error declared by our
 * contracts and let it do the parsing + arg decoding, then map the error name
 * to a sentence in plain English. Anything we can't decode falls back to
 * ethers' own `shortMessage`.
 */
const errorIface = new ethers.Interface([
  // PackageFactory
  "error NotAFactoryPackage()",
  // Package (per-shipment clone)
  "error NotCurrentHolder()",
  "error AlreadyDelivered()",
  "error InvalidRecipient()",
  "error InvalidInitialization()",
  // MerkleIoT
  "error NotOracle()",
  // Ownable2Step (MerkleIoT inherits)
  "error OwnableUnauthorizedAccount(address account)",
]);

const FRIENDLY: Record<string, string> = {
  // PackageFactory
  NotAFactoryPackage:
    "That ID does not match any package issued by this factory.",
  // Package
  NotCurrentHolder:
    "You are not the current holder — only the holder can transfer or mark delivered.",
  AlreadyDelivered:
    "This package has already been marked Delivered — no further transfers allowed.",
  InvalidRecipient:
    "Recipient address is invalid (zero address would lock the package forever).",
  InvalidInitialization:
    "This package clone has already been initialized.",
  // MerkleIoT
  NotOracle:
    "Only approved IoT oracles can anchor sensor batches.",
  OwnableUnauthorizedAccount:
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
