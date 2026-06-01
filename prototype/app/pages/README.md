# pages/

Next.js file-based routing. Each `.tsx` file is one dashboard.

---

## index.tsx — Home / Role Picker

Landing page. Renders a 2×2 grid of cards, one per role dashboard.
No contract interaction — pure navigation.

**URL:** `http://localhost:3000/`

---

## shipper.tsx — Shipper Dashboard

**Actor:** Pfizer (Hardhat account #2)
**Contract called:** `PackageFactory.create(docsHash, docsURI)`

**Flow:**
1. User fills in cargo description + document URI
2. App computes `keccak256(description)` as `docsHash`
3. Calls `factory.create(docsHash, uri)` — factory deploys an EIP-1167 clone
4. Shows the new package ID and clone address
5. Emits `PackageCreated` event (visible in Regulator dashboard)

**Concept-map nodes:** Smart Contracts · Hash · Factory Pattern · Events

---

## carrier.tsx — Carrier Dashboard

**Actors:** TAP Air Cargo (#1), DHL Aviation (#3), MSF Luanda (#4)
**Contracts called:**
- `Package.transferCustody(to, locationUnLocode, proofOfHandshake)`
- `Package.markDelivered()`

**Flow:**
1. User enters package ID — app resolves the clone address via `factory.requirePackage(id)` (reverts `NotAFactoryPackage` for an unknown id, shown as a friendly message)
2. Loads current package state: `currentHolder`, `status`, `hopCount`
3. To transfer: enter recipient address + UN/LOCODE + handshake hash → submit
4. To deliver: click "Mark Delivered" (only available when caller is `currentHolder`)

**Error handling:** `NotCurrentHolder`, `AlreadyDelivered`, `InvalidRecipient`
are decoded from the contract revert and shown as readable messages via `lib/errors.ts`.

**Concept-map nodes:** Smart Contracts · Custody · State Machine · Immutability · Identity

---

## simulation.tsx — IoT Simulation Dashboard

**Actor:** Anyone (read-only + `verifyReading`)
**Contracts called:** `MerkleIoT.verifyReading(batchId, leaf, proof[])`

**Flow:**
1. User enters package ID and clicks "Start watching"
2. App subscribes to `BatchAnchored` events on `MerkleIoT`
3. When a new batch arrives, fetches `/oracle-batches/batch-<id>.json`
4. Displays all 8 readings: timestamp, temperature, GPS hash
5. "Verify" button on each row calls `verifyReading()` on-chain → ✅ or ❌

**Static file dependency:** The oracle simulator must be running to produce
batch JSON files. If no files exist, the dashboard shows "Batch JSON not found".

**Concept-map nodes:** Oracle · Merkle Tree · Hash · Data Integrity · Scaling · Non-repudiation

---

## regulator.tsx — Regulator / Auditor Dashboard

**Actor:** Anyone (all reads)
**Contracts called:** All read-only

**Flow:**
1. User enters package ID
2. App resolves clone address via `factory.requirePackage(id)` (unknown id is caught so IoT batches still render)
3. Loads and displays:
   - `Package.status` — current status
   - `Package.shipper` / `Package.currentHolder`
   - `Package.historyOf()` — full handover chain with locations and timestamps
   - `Package.hopCount()` — number of custody transfers
   - All `BatchAnchored` events for this package from `MerkleIoT`
4. Every piece of data is sourced directly from the chain — no database

**Concept-map nodes:** Transparency · Auditability · Immutability · Events · DLT

---

## _app.tsx — Global Layout

Wraps all pages with the global Tailwind CSS import and any shared providers.
No contract interaction.
