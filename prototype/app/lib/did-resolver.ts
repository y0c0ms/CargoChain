import { ethers } from "ethers";

/**
 * Minimal DID resolver for `did:ethr`-style DIDs anchored in our DIDRegistry.
 *
 * Concept-map nodes: DID · DID Document · DID Architecture · Verification Methods ·
 *                    Verifiable Data Registry · SSI.
 *
 * A DID in this system takes the shape:
 *   did:cargochain:<chainId>:<address>
 * which resolves to a W3C-compatible DID Document JSON-LD stored off-chain
 * (IPFS), whose keccak256 must match the on-chain `documentHash`.
 */

export interface DIDDocument {
  "@context": string | string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyHex?: string;
    blockchainAccountId?: string;
  }>;
  authentication: string[];
  assertionMethod?: string[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

const REGISTRY_ABI = [
  "function resolve(address subject) view returns (tuple(bytes32 documentHash,string documentURI,uint64 createdAt,uint64 updatedAt,bool revoked))",
  "function isActive(address subject) view returns (bool)",
];

export function addressToDID(chainId: number, address: string): string {
  return `did:cargochain:${chainId}:${address.toLowerCase()}`;
}

export function didToAddress(did: string): string {
  const m = did.match(/^did:cargochain:\d+:(0x[0-9a-fA-F]{40})$/);
  if (!m) throw new Error(`Invalid DID: ${did}`);
  return ethers.getAddress(m[1]);
}

export function buildDIDDocument(
  chainId: number,
  address: string,
  pubKeyHex: string,
  serviceEndpoint?: string
): DIDDocument {
  const id = addressToDID(chainId, address);
  const vmId = `${id}#keys-1`;
  return {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id,
    verificationMethod: [
      {
        id: vmId,
        type: "EcdsaSecp256k1RecoveryMethod2020",
        controller: id,
        blockchainAccountId: `eip155:${chainId}:${address}`,
        publicKeyHex: pubKeyHex,
      },
    ],
    authentication: [vmId],
    assertionMethod: [vmId],
    ...(serviceEndpoint
      ? {
          service: [
            {
              id: `${id}#msg`,
              type: "DIDCommMessaging",
              serviceEndpoint,
            },
          ],
        }
      : {}),
  };
}

export async function resolveDID(
  provider: ethers.Provider,
  registryAddress: string,
  did: string
): Promise<{ document: DIDDocument; onChainHash: string; active: boolean }> {
  const address = didToAddress(did);
  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);
  const entry = await registry.resolve(address);
  const active = await registry.isActive(address);

  const resp = await fetch(entry.documentURI);
  if (!resp.ok) throw new Error(`Could not fetch DID Document at ${entry.documentURI}`);
  const text = await resp.text();

  // Audit finding H-4: a malicious gateway (IPFS or HTTPS) could serve a
  // forged DID Document. Verify the hash on-chain matches what we received.
  const fetchedHash = ethers.keccak256(ethers.toUtf8Bytes(text));
  if (fetchedHash.toLowerCase() !== entry.documentHash.toLowerCase()) {
    throw new Error(
      `DID Document hash mismatch — expected ${entry.documentHash}, got ${fetchedHash}. ` +
      `The retrieved document does not match what's anchored on-chain.`
    );
  }

  const document = JSON.parse(text) as DIDDocument;
  return { document, onChainHash: entry.documentHash, active };
}
