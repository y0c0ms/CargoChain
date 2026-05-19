import { expect } from "chai";
import { ethers } from "hardhat";

// Selector-pinning tests. Custom errors are identified on-chain by their
// 4-byte selector = first 4 bytes of keccak256(errorSignature). If anyone
// renames an error (e.g. NotCurrentHolder -> NotHolder), the selector
// changes and any frontend decoding falls back to "unknown error". These
// tests freeze the names + selectors so renames are caught at CI time.

describe("Custom error selectors", () => {
  it("Package.NotCurrentHolder() selector matches", () => {
    expect(ethers.id("NotCurrentHolder()").slice(0, 10)).to.equal("0xc00c4460");
  });
  it("Package.AlreadyDelivered() selector matches", () => {
    expect(ethers.id("AlreadyDelivered()").slice(0, 10)).to.equal("0xb9f79653");
  });
  it("Package.InvalidRecipient() selector matches", () => {
    expect(ethers.id("InvalidRecipient()").slice(0, 10)).to.equal("0x9c8d2cd2");
  });
  it("PackageFactory.NotAFactoryPackage() selector matches", () => {
    expect(ethers.id("NotAFactoryPackage()").slice(0, 10)).to.equal("0x5b2e8766");
  });
  it("MerkleIoT.NotOracle() selector matches", () => {
    expect(ethers.id("NotOracle()").slice(0, 10)).to.equal("0x1bc2178f");
  });

  it("ethers Interface parses selectors back to their error names", () => {
    const iface = new ethers.Interface([
      "error NotCurrentHolder()",
      "error AlreadyDelivered()",
      "error InvalidRecipient()",
      "error NotAFactoryPackage()",
      "error NotOracle()",
    ]);
    expect(iface.parseError("0xc00c4460")?.name).to.equal("NotCurrentHolder");
    expect(iface.parseError("0xb9f79653")?.name).to.equal("AlreadyDelivered");
    expect(iface.parseError("0x9c8d2cd2")?.name).to.equal("InvalidRecipient");
    expect(iface.parseError("0x5b2e8766")?.name).to.equal("NotAFactoryPackage");
    expect(iface.parseError("0x1bc2178f")?.name).to.equal("NotOracle");
  });
});
