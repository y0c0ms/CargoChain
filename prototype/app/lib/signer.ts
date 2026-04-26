import { ethers } from "ethers";

/**
 * Resolve a `Signer` to use for on-chain actions.
 *
 * Preference order:
 *   1. Injected wallet (window.ethereum — e.g. MetaMask) — production-realistic path
 *   2. Dev signer via NEXT_PUBLIC_RPC + NEXT_PUBLIC_DEV_KEY — keeps the preview
 *      browser (which has no extensions) fully functional
 *
 * Returns the signer plus a label indicating which path was used so the UI can
 * show it (helpful during demos and while debugging).
 */
export type SignerMode = "injected" | "dev";

export interface ResolvedSigner {
  signer: ethers.Signer;
  address: string;
  mode: SignerMode;
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
      // fall through to dev signer
    }
  }

  const rpc = process.env.NEXT_PUBLIC_RPC;
  const key = process.env.NEXT_PUBLIC_DEV_KEY;
  if (!rpc || !key) {
    throw new Error(
      "No wallet injected and NEXT_PUBLIC_RPC / NEXT_PUBLIC_DEV_KEY are not set. " +
      "Either install MetaMask or deploy contracts and fill prototype/app/.env.local."
    );
  }
  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(key, provider);
  return { signer, address: signer.address, mode: "dev" };
}
