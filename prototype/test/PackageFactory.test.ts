import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Mirror of the original CargoChain happy-path test, rewritten for the
 * factory-of-clones design. Each package is now its own contract address
 * spawned by PackageFactory.create(); the custody check is local to the
 * clone, not gated by an id parameter.
 *
 * Concept-map coverage: Smart Contracts · Factory Pattern · EIP-1167 ·
 * Custody · State Machine · Immutability · Events (audit trail).
 */
describe("PackageFactory happy path", () => {
  async function deployAll() {
    const [owner, shipper, carrierA, carrierB, stranger] = await ethers.getSigners();
    const factory = await ethers.deployContract("PackageFactory");
    return { factory, owner, shipper, carrierA, carrierB, stranger };
  }

  it("spawns a Package clone, transfers custody through 2 carriers, marks delivered", async () => {
    const { factory, shipper, carrierA, carrierB } = await deployAll();

    const docsHash = keccak256(toUtf8Bytes("docs-HBL-2026-042"));
    const tx = await factory.connect(shipper).create(docsHash, "ipfs://docs/1");
    await tx.wait();

    const id = 1n;
    const pkgAddr = await factory.packageOf(id);
    expect(pkgAddr).to.not.equal(ethers.ZeroAddress);
    expect(await factory.idOf(pkgAddr)).to.equal(id);

    const pkg = await ethers.getContractAt("Package", pkgAddr);
    expect(await pkg.currentHolder()).to.equal(await shipper.getAddress());
    expect(await pkg.status()).to.equal(0); // Created

    // Shipper → Carrier A (advances to InTransit)
    await pkg.connect(shipper).transferCustody(
      await carrierA.getAddress(),
      "PTLIS",
      keccak256(toUtf8Bytes("handshake-1"))
    );
    expect(await pkg.currentHolder()).to.equal(await carrierA.getAddress());
    expect(await pkg.status()).to.equal(1); // InTransit

    // Carrier A → Carrier B
    await pkg.connect(carrierA).transferCustody(
      await carrierB.getAddress(),
      "PTOPO",
      keccak256(toUtf8Bytes("handshake-2"))
    );
    expect(await pkg.currentHolder()).to.equal(await carrierB.getAddress());
    expect(await pkg.hopCount()).to.equal(2n);

    // Receiver marks delivered
    await pkg.connect(carrierB).markDelivered();
    expect(await pkg.status()).to.equal(2); // Delivered

    // No transfers after delivery
    await expect(
      pkg.connect(carrierB).transferCustody(
        await shipper.getAddress(),
        "PT",
        keccak256(toUtf8Bytes("late"))
      )
    ).to.be.revertedWithCustomError(pkg, "AlreadyDelivered");
  });

  it("blocks transferCustody when caller is not the current holder", async () => {
    const { factory, shipper, stranger } = await deployAll();
    const docsHash = keccak256(toUtf8Bytes("docs-X"));
    await factory.connect(shipper).create(docsHash, "ipfs://x");

    const pkg = await ethers.getContractAt("Package", await factory.packageOf(1n));
    await expect(
      pkg.connect(stranger).transferCustody(
        await stranger.getAddress(),
        "PTLIS",
        keccak256(toUtf8Bytes("no-handshake"))
      )
    ).to.be.revertedWithCustomError(pkg, "NotCurrentHolder");
  });

  it("isolates state between two concurrent packages", async () => {
    // Core point of the factory design: two packages live at two addresses,
    // so a holder of pkg #1 cannot affect pkg #2's state.
    const { factory, shipper, carrierA, carrierB } = await deployAll();

    await factory.connect(shipper).create(keccak256(toUtf8Bytes("p1")), "ipfs://1");
    await factory.connect(shipper).create(keccak256(toUtf8Bytes("p2")), "ipfs://2");

    const p1 = await ethers.getContractAt("Package", await factory.packageOf(1n));
    const p2 = await ethers.getContractAt("Package", await factory.packageOf(2n));
    expect(await p1.getAddress()).to.not.equal(await p2.getAddress());

    // Hand p1 to carrierA; p2 stays with shipper.
    await p1.connect(shipper).transferCustody(
      await carrierA.getAddress(), "PTLIS", keccak256(toUtf8Bytes("h1"))
    );

    expect(await p1.currentHolder()).to.equal(await carrierA.getAddress());
    expect(await p2.currentHolder()).to.equal(await shipper.getAddress());

    // carrierA holds p1 but cannot touch p2.
    await expect(
      p2.connect(carrierA).transferCustody(
        await carrierB.getAddress(), "PT", keccak256(toUtf8Bytes("nope"))
      )
    ).to.be.revertedWithCustomError(p2, "NotCurrentHolder");
  });

  it("rejects re-initialization of an already-initialized clone", async () => {
    const { factory, shipper } = await deployAll();
    await factory.connect(shipper).create(keccak256(toUtf8Bytes("p")), "ipfs://p");
    const pkg = await ethers.getContractAt("Package", await factory.packageOf(1n));

    await expect(
      pkg.connect(shipper).initialize(
        await factory.getAddress(),
        await shipper.getAddress(),
        keccak256(toUtf8Bytes("hijack")),
        "ipfs://hijack"
      )
    ).to.be.revertedWithCustomError(pkg, "InvalidInitialization");  // from OZ Initializable
  });

  it("locks the implementation contract from being initialized directly", async () => {
    // OZ's _disableInitializers() in the Package constructor ensures the
    // implementation cannot be hijacked.
    const { factory, stranger } = await deployAll();
    const implAddr = await factory.implementation();
    const impl = await ethers.getContractAt("Package", implAddr);

    await expect(
      impl.connect(stranger).initialize(
        await factory.getAddress(),
        await stranger.getAddress(),
        keccak256(toUtf8Bytes("takeover")),
        "ipfs://takeover"
      )
    ).to.be.revertedWithCustomError(impl, "InvalidInitialization");
  });

  it("rejects transferCustody to the zero address", async () => {
    const { factory, shipper } = await deployAll();
    await factory.connect(shipper).create(keccak256(toUtf8Bytes("p")), "ipfs://p");
    const pkg = await ethers.getContractAt("Package", await factory.packageOf(1n));

    await expect(
      pkg.connect(shipper).transferCustody(
        ethers.ZeroAddress,
        "PTLIS",
        keccak256(toUtf8Bytes("bad"))
      )
    ).to.be.revertedWithCustomError(pkg, "InvalidRecipient");
  });
});
