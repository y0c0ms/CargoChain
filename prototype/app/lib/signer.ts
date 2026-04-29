import { ethers } from "ethers";
import { getSelectedAccount } from "./accounts";

/**
 * Resolve a `Signer` to use for on-chain actions.
 *
 * Preference order:
 *   1. Injected wallet (window.ethereum — e.g. MetaMask) — production-realistic path
 *   2. AccountPicker selection (demo affordance — no wallet extension required)
 *
 * Returns the signer plus a label indicating which path was used so the UI can
 * show it (helpful during demos and while debugging).
 */
export type SignerMode = "injected" | "picker";

export interface ResolvedSigner {
  signer:  ethers.Signer;
  address: string;
  mode:    SignerMode;
  label?:  string;
}

export async function getSigner(): Promise<ResolvedSigner> {
  const injected = (typeof window !== "undefined"
    ? (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum
    : undefined);

  if (injected) {
    try {
      const provider = new ethers.BrowserProvider(injected);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      return { signer, address: await signer.getAddress(), mode: "injected" };
    } catch {
      // fall through to picker
    }
  }

  const rpc = process.env.NEXT_PUBLIC_RPC;
  if (!rpc) {
    throw new Error(
      "NEXT_PUBLIC_RPC is not set in prototype/app/.env.local. " +
      "The fallback signer needs an RPC to talk to."
    );
  }
  const account = getSelectedAccount();
  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(account.key, provider);
  return { signer, address: signer.address, mode: "picker", label: account.name };
}
