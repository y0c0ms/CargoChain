/**
 * Predefined demo accounts mapped to Hardhat's deterministic signers.
 *
 * Each account has a friendly *role name* (Pfizer, TAP, DHL, …) so the demo
 * tells a coherent story instead of showing raw 0x addresses everywhere.
 * The keys here are Hardhat's well-known test-node private keys — fine for
 * local dev, NEVER use them on a public chain.
 *
 * The AccountPicker UI persists the chosen account in localStorage so every
 * dashboard signs as the selected role without needing a `.env.local` edit.
 */

export type Role = "issuer" | "shipper" | "carrier" | "receiver";

export interface Account {
  name:    string;   // friendly name shown in the UI
  role:    Role;     // semantic role (informational; contracts don't read this)
  key:     string;   // 0x… private key
  address: string;   // checksummed Ethereum address
  hint?:   string;   // one-line description for the dropdown
}

export const ACCOUNTS: Account[] = [
  {
    name:    "IATA (Issuer / Admin)",
    role:    "issuer",
    key:     "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    hint:    "Hardhat #0 · deployer · approved VC issuer",
  },
  {
    name:    "Pfizer",
    role:    "shipper",
    key:     "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    hint:    "Hardhat #2 · creates packages",
  },
  {
    name:    "TAP Air Cargo",
    role:    "carrier",
    key:     "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    hint:    "Hardhat #1 · holds LicensedCarrier VC",
  },
  {
    name:    "DHL Aviation",
    role:    "carrier",
    key:     "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    hint:    "Hardhat #3 · holds LicensedCarrier VC",
  },
  {
    name:    "MSF Luanda",
    role:    "receiver",
    key:     "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    hint:    "Hardhat #4 · final receiver · holds LicensedCarrier VC",
  },
];

const STORAGE_KEY = "cargochain.account";

export function getSelectedAccount(): Account {
  if (typeof window === "undefined") return ACCOUNTS[0];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return ACCOUNTS[0];
  try {
    const parsed = JSON.parse(raw);
    return ACCOUNTS.find((a) => a.address === parsed.address) ?? ACCOUNTS[0];
  } catch {
    return ACCOUNTS[0];
  }
}

export function setSelectedAccount(a: Account): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ address: a.address, name: a.name })
  );
  // Notify other components on the same page (e.g. dashboards reading the address)
  window.dispatchEvent(new CustomEvent("cargochain:account-changed", { detail: a }));
}
