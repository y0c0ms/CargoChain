# Case Studies — Blockchain in Logistics, Trade & Supply Chain

> Where the field has been, where it's gone wrong, and where it's still working.
> Compiled to ground CargoChain's architectural choices in real-world evidence.

---

## Why this document exists

A course project on blockchain logistics has to engage with the historical record. Between 2022 and 2023 a wave of high-profile permissioned-chain consortiums collapsed — five within twelve months — while a parallel set of public-chain and mandate-anchored platforms continued to grow. The contrast is the most useful framing device available for justifying any architectural choice in this space.

This document covers:

- **§1 — Failures.** Six platforms that shut down or were abandoned. All but one ran on permissioned DLT (Hyperledger Fabric, R3 Corda, or a custom Quorum/DAML stack). All shared the same failure mode: insufficient adoption to justify operating cost.
- **§2 — Survivors.** Eight platforms still operating in 2025–2026, with the architectures and adoption strategies that distinguish them.
- **§3 — The pattern.** What separates the two groups in one table.
- **§4 — How CargoChain responds.** A direct mapping from each failure mode to a design choice in this prototype.
- **§5 — Sources.** Every claim above is cited.

---

## 1. Failures (the cautionary tales)

### Quick reference

| Platform        | Years     | Sector                  | Technology            | Backers                                   | What killed it                                                  |
|-----------------|-----------|-------------------------|-----------------------|-------------------------------------------|-----------------------------------------------------------------|
| **TradeLens**   | 2018–2023 | Container shipping      | Hyperledger Fabric    | Maersk + IBM                              | Competitors refused to share data on Maersk-controlled chain    |
| **we.trade**    | 2017–2022 | Bank trade finance      | Hyperledger Fabric    | 12 European banks + IBM                   | Slow uptake — only 2 of 12 founders fully deployed; out of cash |
| **Marco Polo**  | 2017–2023 | Open-account trade fin. | R3 Corda              | 30+ banks (BoA, ING, Commerzbank, BNP)    | Insolvent — €5.2 m debt; banks pulled out post-FTX              |
| **Contour**     | 2019–2023 | Letters of credit       | R3 Corda              | 9 banks (HSBC, BNP Paribas, ING, StanChart) | 60–70 tx/month — uneconomic; bank shareholders pulled funding   |
| **B3i**         | 2016–2022 | Reinsurance             | Fabric / Corda PoCs   | Allianz, Swiss Re, Zurich, Generali, etc. | "Did not see the volumes in the demand"                         |
| **ASX CHESS**   | 2016–2022 | Securities settlement   | Digital Asset / DAML  | Australian Securities Exchange            | $170 m+ spent; design "could not meet requirements"; abandoned  |

### 1.1 TradeLens (Maersk + IBM) — the most famous failure

**What it was.** A blockchain-enabled global trade platform built jointly by IBM and GTD Solution (a Maersk subsidiary) on Hyperledger Fabric. Aimed to digitise shipping documents end-to-end and provide real-time container visibility across ports, customs, and carriers.

**The technical achievement is not the story.** Over its lifetime TradeLens tracked **4 billion events**, processed **70 million containers**, and published **over 36 million documents**. As an IT system, it worked.

**Why it died.**
- Maersk co-owned and operated the platform.
- Competitor shipping lines (CMA CGM, Hapag-Lloyd, MSC, ONE) refused to put commercial data on infrastructure controlled by their largest competitor.
- Without industry-wide participation, network effects never materialised.
- Maersk + IBM announced discontinuation on 29 November 2022. Platform went offline by end of Q1 2023.

**Maersk's own statement:**
> "The need for full global industry collaboration was not achieved, and as a result, TradeLens did not reach the level of commercial viability necessary to continue work and meet financial expectations as an independent business."

**Lesson for CargoChain.** A permissioned chain inherits the trust problems of whoever runs it. If the operator is a market participant, competitors won't join; if the operator is a neutral consortium, governance becomes the bottleneck.

### 1.2 we.trade (12 European banks + IBM)

**What it was.** Built by IBM on Hyperledger Fabric for European trade finance. Founded in 2017 by 12 banks (Deutsche Bank, HSBC, Santander, UniCredit, Société Générale, Rabobank, Nordea, KBC, Natixis, CaixaBank, ERSTE, UBS). Live in 2019, eventually licensed to 16 banks in 15 countries.

**Why it died.**
- Despite the broad backing, only **2 of the 12 founders** (CaixaBank and Nordea) ever fully deployed the system.
- Half the workforce laid off in 2020.
- A €5 m IBM-led funding round in 2020 bought time but not adoption.
- Filed for insolvency in June 2022; PwC appointed as liquidator.

**Lesson for CargoChain.** Consortium membership is not the same as production deployment. Bank-led alliances move at the speed of the slowest legal team.

### 1.3 Marco Polo Network (R3 + 30+ banks)

**What it was.** Built on R3 Corda starting September 2017. Aimed to simplify open-account trade finance with two modules — receivables discounting and payment commitments. Signed up 30+ banks including Bank of America, ING, Commerzbank, BNP Paribas, Standard Chartered.

**Why it died.**
- Missed go-live target of early 2019.
- Missed revised target of Q2 2020.
- Reached production in Q4 2020 but with only "a handful of transactions" through 2021.
- Bank of America pulled out of additional funding talks in January 2023, citing post-FTX caution.
- Filed for insolvency March 2023 with **€5.2 m debts** (€2.5 m liabilities over assets); Irish High Court appointed Interpath Advisory as provisional liquidators.

**Lesson for CargoChain.** A four-year delivery lag in a fast-moving market is fatal. Consortium projects often optimise for buy-in over speed and run out of runway.

### 1.4 Contour (R3 + 9 banks)

**What it was.** Built on R3 Corda by 9 systemically important banks (HSBC, BNP Paribas, ING, Standard Chartered, Bangkok Bank, CTBC, SEB, Citi, others) to digitise letters of credit issuance. Launched 2019, full production 2020.

**Why it died.**
- Processing only **60–70 transactions per month** at end of life — operationally uneconomic for a network of that ambition.
- Bank shareholders refused additional funding amid the post-2022 crypto market downturn.
- Shutdown announced for 30 November 2023; users given until then to migrate or download data.

**Postscript.** XDC Network acquired the brand in 2024 with the goal of relaunching as a stablecoin-integrated platform — but the original Contour as a banking consortium ended in 2023.

**Lesson for CargoChain.** If after four years a platform is still measuring monthly volume in two-digit numbers, the cost-per-transaction makes it unviable regardless of technology choices.

### 1.5 B3i (insurance industry initiative)

**What it was.** Founded 2016 by 5 insurers (Allianz, Aegon, Munich Re, Swiss Re, Zurich) and grown to include Generali, MAPFRE, SCOR, Achmea, XL Innovate. Incorporated in Switzerland in 2018. Funded entirely by member insurers.

**Why it died.**
- Filed for insolvency in **July 2022** after failing to close a final funding round.
- Swiss Re's group CFO publicly stated: *"We did not see the volumes in the demand that would have justified continued investment in this platform."*

**Did achieve some technical milestones** — even as recently as April 2022, B3i's tech placed the first XoL reinsurance contract on DLT. But milestones without volume aren't a business.

**Lesson for CargoChain.** Even with deep-pocketed industry backers, absence of organic transaction volume kills the business case before the technology ever has a chance to fail or succeed on its own merits.

### 1.6 ASX CHESS Replacement (Australian Securities Exchange)

**What it was.** The Australian Securities Exchange's plan to replace its 25-year-old Clearing House Electronic Subregister System (CHESS) with a blockchain-based equivalent built by Digital Asset on DAML. Announced 2016; expected go-live April 2023.

**Why it died.**
- Multiple delays, escalating costs.
- November 2022: Accenture's review found "significant challenges with the solution design and its ability to meet ASX's requirements."
- ASX paused the project; later abandoned it entirely in favour of a conventional system from TCS.
- Total cost: **$170 m+** spent; **$250 m write-down** taken.
- Australian Securities & Investments Commission (ASIC) subsequently sued ASX in 2024 alleging the company misled investors about progress in February 2022 statements that the project was "on-track for go-live."

**Lesson for CargoChain.** Blockchain in critical infrastructure demands ruthless governance. Schedule slip in a capital-markets context isn't just embarrassing — it's a securities-disclosure issue. For an academic prototype, the equivalent lesson is: be honest in writing about what works and what doesn't.

---

## 2. Survivors (proof it can work)

### Quick reference

| Platform           | Sector                          | Technology                        | Why it works                                                     |
|--------------------|---------------------------------|-----------------------------------|------------------------------------------------------------------|
| **IBM Food Trust** | Food traceability               | Hyperledger Fabric                | Walmart mandate forces supplier adoption                         |
| **VeChain**        | Auto, retail, sustainability    | Public PoA (VeChainThor)          | Public chain + concrete enterprise pilots (BMW, Walmart China)   |
| **GSBN**           | Container shipping              | Hyperledger Fabric                | Neutral non-profit governance + DCSA eBL deadline                |
| **MediLedger**     | Pharma track-and-trace          | Quorum (Ethereum fork)            | Anchored to legal mandate (US DSCSA, fully enforced Nov 2024)    |
| **WaveBL**         | Electronic bills of lading      | Permissioned chain                | Carrier adoption (MSC, ZIM, ONE, Hapag-Lloyd); 100 k+ eBLs       |
| **CargoX**         | Electronic transferable docs    | **Public Ethereum**               | 3 m+ documents, 100+ countries — public-chain proof-of-scale     |
| **OriginTrail**    | Decentralised knowledge graph   | **Public** (multi-chain DKG)      | Production deployments at Swiss Federal Railways, BSI, SCAN      |
| **Komgo**          | Commodity trade finance         | Quorum                            | Last consortium standing post-2023 collapses                     |

### 2.1 IBM Food Trust — the network-effects winner

**Status.** Active and growing. Members include **Walmart, Carrefour, Nestlé, Dole Food, Tyson Foods, Kroger, Unilever**.

**Why it survived.**
- **Mandate, not invitation.** In 2018 Walmart announced that all leafy-greens suppliers MUST use IBM Food Trust to trace their products. Suppliers had to comply or lose Walmart shelf space — a coercive adoption mechanism that consortiums lack.
- **Concrete metric.** Time to trace a mango's provenance fell from **7 days to 2.2 seconds** — a number a CFO can defend.
- **No commercial-secret conflict.** Tracing a head of lettuce doesn't expose pricing data the way tracing a container does. Less to hide → less resistance.

**Lesson for CargoChain.** Adoption needs a forcing function — either regulatory (DSCSA, MLETR) or commercial (lose-the-account). Voluntary consortium membership doesn't scale.

### 2.2 VeChain — the public-chain enterprise play

**Status.** Active. **BMW** partnership for EV battery part provenance (Feb 2025) and supply-chain carbon emissions tracking (April 2024). **Walmart China** for food provenance. PwC partnership for consulting and assurance.

**Why it survived.**
- Public Proof-of-Authority chain (VeChainThor) — anyone can read; no consortium gatekeeping.
- Token-based economics decouple platform funding from member dues.
- Survives individual partner churn because no single partner controls the chain.

**Lesson for CargoChain.** Public-chain logistics platforms don't have the same "competitor won't join" failure mode that killed TradeLens. They can also weather the loss of any single anchor partner.

### 2.3 GSBN — the post-TradeLens shipping consortium

**Status.** Active. Completed first cross-platform interoperable eBL transaction in **March 2025**. Now operating as Control Tracking Registry between Secro and IQAX eBL platforms (July 2025).

**What's different from TradeLens.**
- **Neutral non-profit governance** — not owned by any single carrier.
- Founders are 9 carriers + terminal operators (COSCO Shipping Lines, Hapag-Lloyd, ONE, OOCL, plus PSA, Hutchison Ports).
- Cloud and tech backers include Microsoft, Oracle, AntChain, Alibaba Cloud — **multiple cloud providers, not one**.
- Operates inside an industry-wide eBL adoption commitment: **DCSA members signed up to 100 % eBL adoption by 2030**.

**Lesson for CargoChain.** Governance neutrality is necessary but not sufficient — GSBN survives because it's neutral *and* because container carriers globally have committed to a paperless deadline. Without that deadline, neutrality alone wouldn't be enough.

### 2.4 MediLedger — anchored to a legal mandate

**Status.** Active. The US Drug Supply Chain Security Act (DSCSA) came into full enforcement on **27 November 2024** — making interoperable serialised drug tracking non-optional for the entire US pharma supply chain.

**Architecture.** Built by Pfizer, Genentech, McKesson, AmerisourceBergen on a customised Quorum (Ethereum fork). The MediLedger Network is one of the few production-ready DSCSA-compliant implementations.

**Adoption strategy.** "Start with compliance, scale to value" — first prove utility for DSCSA returns verification, then expand to higher-value commercial workflows.

**Lesson for CargoChain.** When law requires the platform, adoption is solved by definition. Without a regulatory anchor, adoption is the hard problem.

### 2.5 WaveBL & CargoX — the eBL duopoly

**WaveBL.** Permissioned blockchain network. Used by major carriers including **MSC, ZIM, ONE, Hapag-Lloyd**. Has processed **100 000+ eBLs**.

**CargoX.** Public Ethereum-based. Has processed **3 million+ documents across 100+ countries** as of early 2026.

**Why both survive.**
- Bills of lading have the strongest legal-tech tailwind in shipping (UK Electronic Trade Documents Act 2023; UNCITRAL MLETR adoption rising).
- Both compete head-on but neither requires the other to fail — the global eBL market is large enough for both architectures.
- **CargoX in particular is the strongest single counter-example** to "you need a permissioned chain for enterprise logistics" — it doesn't operate one, yet processes 3 m+ documents at international scale.

**Lesson for CargoChain.** Public-chain document tracking already works at production scale today.

### 2.6 OriginTrail — the academic darling

**Status.** Active. Production deployments include:
- **Swiss Federal Railways (SBB)** — real-time supply-chain traceability.
- **British Standards Institution (BSI)** — blockchain-enabled standards solutions.
- **Supplier Compliance Audit Network (SCAN)** — auditing approximately **40 % of all imports entering the United States** through their trusted-factory system built on OriginTrail.

**Architecture.** Public multi-chain Decentralised Knowledge Graph (DKG) — anchors data on Ethereum, xDai, and Polkadot. ZK-proof privacy layer added June 2025. Compliant with UK Electronic Trade Documents Act since 2025.

**Lesson for CargoChain.** Public-chain anchoring with off-chain data graphs (the CargoChain pattern: *hash on-chain, data off-chain*) is being deployed in production for safety-critical infrastructure (railways!).

### 2.7 Komgo — the survivor of the trade-finance bloodbath

**Status.** Still operating in 2025. The only major trade-finance blockchain consortium to survive the 2022–2023 wave that took down we.trade, Marco Polo, and Contour.

**Sector.** Commodity trade finance specifically (not general open-account trade). Founded September 2018 by 15 banks and traders (ING, Société Générale, Citi, MUFG, BNP Paribas, ABN Amro, ABS, SGS, Mercuria, Gunvor, Koch Supply & Trading, others) on Quorum.

**Why it survived where the others didn't.**
- **Narrower scope** — commodities only, not all trade finance.
- **Modular architecture** — banks can adopt one feature at a time.
- **Lower per-bank capital commitment** than the alternatives.
- The 2023 *Trade Finance Global* analysis put it bluntly: *"In 2019 there were four major blockchain trade finance networks. Komgo is the only one left standing."*

**Lesson for CargoChain.** Even within the same year, narrow scope + low integration friction outlasts ambitious-but-rigid platforms.

---

## 3. The pattern — what kills permissioned consortiums

The six failures share four mechanics:

| Mechanic                                  | TradeLens | we.trade | Marco Polo | Contour | B3i  | ASX  |
|-------------------------------------------|-----------|----------|------------|---------|------|------|
| Built on permissioned DLT                 | ✓ Fabric  | ✓ Fabric | ✓ Corda    | ✓ Corda | ✓ Fabric/Corda | ✓ DAML |
| Funded by member dues / single sponsor    | ✓         | ✓        | ✓          | ✓       | ✓    | ✓    |
| Operator is a market participant          | ✓ Maersk  | ✓ banks  | (R3 neutral)| (R3 neutral)| ✓ insurers | ✓ ASX itself |
| Live transaction count below break-even   | ✓         | ✓        | ✓          | ✓ (60–70/mo) | ✓ | n/a |

**The common thread:**
1. Build a permissioned chain to "address competitor concerns".
2. Discover that participation requires consensus from competitors.
3. Burn member dues for 3–5 years building software while waiting for adoption.
4. Run out of money before reaching transaction volumes that would justify continued investment.

The platforms that survive (§2) sidestep this by:
- Operating on **public chains** (VeChain, CargoX, OriginTrail) — no member-dues model, no competitor gatekeeping.
- Having a **regulatory or commercial forcing function** (IBM Food Trust via Walmart mandate; MediLedger via DSCSA).
- Maintaining **neutral non-profit governance** *and* a clear deadline pressure (GSBN with DCSA's 100-by-2030 commitment).

---

## 4. How CargoChain's architecture responds

| Failure pattern from §3                        | CargoChain's design choice                                         |
|------------------------------------------------|--------------------------------------------------------------------|
| Operator-is-competitor (TradeLens, we.trade, B3i) | Public EVM chain — **no operator at all**                       |
| Member-dues funding model (every failed case)  | Zero platform fees; users pay only network gas                     |
| Permissioned DLT lock-in                       | Polygon Amoy / Sepolia — anyone can read, write, and audit         |
| "Soft" agreement on data formats               | Hard cryptographic commitments (Merkle roots, manifest hashes, DID document hashes) |
| 4-year delivery lag (Marco Polo, ASX)          | Single-team prototype with no governance committee; ships in weeks |
| 60-tx/month uneconomics (Contour)              | No central operator to need economic break-even                    |
| Misleading-progress disclosure (ASX)           | Project plan, audit findings, and security regression tests are all public in the repo |

We can't claim CargoChain *solves* industry adoption — that's a market problem, not a technology problem. But we can claim that the architecture eliminates the **governance, operator-trust, and funding-model failure modes** that killed every major trade-finance and shipping blockchain consortium between 2022 and 2023.

The thesis becomes:

> *"TradeLens proved that a technically excellent permissioned blockchain still fails if it's run by a market participant. CargoChain takes the opposite stance — it puts the same logistics primitives (NFT-style consignment IDs, DIDs, VCs, IoT Merkle anchors) on a public EVM chain, eliminating the operator role entirely. The trade-off is consensus latency (12 s on Sepolia, 2 s on Polygon Amoy vs. instant on Besu), which we accept in exchange for permissionless participation."*

That's a defensible thesis statement for the report's introduction.

---

## 5. Sources

### TradeLens (§1.1)
- [A.P. Moller-Maersk and IBM to discontinue TradeLens (Maersk official)](https://www.maersk.com/news/articles/2022/11/29/maersk-and-ibm-to-discontinue-tradelens)
- [Information on the closure of TradeLens (Maersk)](https://www.maersk.com/news/articles/2022/12/01/information-on-the-closure-of-tradelens)
- [Maersk, IBM to shut down blockchain joint venture TradeLens (Supply Chain Dive)](https://www.supplychaindive.com/news/Maersk-IBM-shut-down-TradeLens/637580/)
- [IBM and Maersk Abandon Ship on TradeLens Logistics Blockchain (CoinDesk)](https://www.coindesk.com/business/2022/11/30/ibm-and-maersk-abandon-ship-on-tradelens-logistics-blockchain)
- [IBM, Maersk will shut down TradeLens supply chain platform (The Register)](https://www.theregister.com/2022/11/30/ibm_and_maersk_tradelens_shutdown/)
- [Maersk and IBM Abandon Blockchain TradeLens Platform (Maritime Executive)](https://maritime-executive.com/article/maersk-and-ibm-abandon-blockchain-tradelens-platform)
- [Maersk's Failed Transformation of Global Shipping Logistics with Blockchain (Jones Elite Logistics)](https://www.joneselitelogistics.com/blog/maersks-failed-transformation-of-global-shipping-logistics-with-blockchain/)
- [TradeLens' demise is not a Blockchain failure (Transport Intelligence)](https://ti-insight.com/briefs/tradelens-demise-is-not-a-blockchain-failure/)
- [IBM, Maersk pull the plug on blockchain-based TradeLens (SiliconANGLE)](https://siliconangle.com/2022/11/30/ibm-maersk-pull-plug-blockchain-based-tradelens-shipping-platform/)

### we.trade (§1.2)
- [IBM-backed blockchain platform we.trade 'shutting down' (Tech Monitor)](https://www.techmonitor.ai/technology/emerging-technology/ibm-backed-blockchain-platform-we-trade-shutting-down)
- [HSBC, IBM, and SocGen Backed Blockchain Company we.trade is Now we.broke (Futurum)](https://futurumgroup.com/insights/hsbc-ibm-and-socgen-backed-blockchain-company-we-trade-is-now-we-broke/)
- [Bank-backed Blockchain Outfit We.Trade Is Shutting Down (FintechMode)](https://fintechmode.com/news/blockchain/bank-backed-blockchain-outfit-we-trade-is-shutting-down/)
- [Blockchain-based trade finance platform we.trade shuts shop (FintechFutures)](https://www.fintechfutures.com/blockchain-crypto-digital-assets/blockchain-based-trade-finance-platform-we-trade-shuts-shop)
- [HSBC, SocGen, IBM backed blockchain company We.Trade starts insolvency procedure (Ledger Insights)](https://www.ledgerinsights.com/hsbc-socgen-ibm-backed-blockchain-company-we-trade-starts-insolvency-procedure/)
- [we.trade calls it quits after running out of cash (Global Trade Review)](https://www.gtreview.com/news/top-stories/we-trade-calls-it-quits-after-running-out-of-cash/)
- [Bank-backed blockchain consortium we.trade files for insolvency (Finextra)](https://www.finextra.com/newsarticle/40408/bank-backed-blockchain-consortium-wetrade-files-for-insolvency)

### Marco Polo Network (§1.3)
- [Marco Polo brings in liquidators as funds run dry (Global Trade Review)](https://www.gtreview.com/news/fintech/marco-polo-brings-in-liquidators-as-funds-run-dry/)
- [Marco Polo Network runs insolvent with €5.2m debts (Trade Finance Global)](https://www.tradefinanceglobal.com/posts/marco-polo-network-runs-insolvent/)
- [Blockchain trade finance network Marco Polo is insolvent (Ledger Insights)](https://www.ledgerinsights.com/marco-polo-blockchain-trade-finance-insolvency/)
- [Insolvency Hits Marco Polo Blockchain Network — An Overview (Global Trade Leaders)](https://www.globaltradeleaders.com/marco-polo-insolvency-lessons/)
- [Blockchain trade finance firm Marco Polo reportedly enters insolvency (FintechFutures)](https://www.fintechfutures.com/2023/03/blockchain-trade-finance-firm-marco-polo-reportedly-enters-insolvency/)

### Contour (§1.4)
- [Blockchain trade finance network Contour to shutter (Ledger Insights)](https://www.ledgerinsights.com/contour-blockchain-trade-finance-network-shutter/)
- [Exclusive: Contour to shut down as bank shareholders pull funding (Global Trade Review)](https://www.gtreview.com/news/top-stories/exclusive-contour-to-shut-down-as-bank-shareholders-pull-funding/)
- [Contour collapses: What does this mean for digital trade finance? (Trade Finance Global)](https://www.tradefinanceglobal.com/posts/contour-collapses-what-does-this-mean-for-digital-trade-finance/)
- [XDC Ventures to "re-energise" Contour after Xalts sale (Global Trade Review)](https://www.gtreview.com/news/digital-trade/xdc-ventures-to-re-energise-contour-after-xalts-sale/)
- [Digitizing trade finance in the post-Contour world (Digital Finance)](https://www.digfingroup.com/contour-trade-finance/)

### B3i (§1.5)
- [Major insurers pull the plug on B3i insurance blockchain consortium (Ledger Insights)](https://www.ledgerinsights.com/major-insurers-pull-the-plug-on-b3i-insurance-blockchain-consortium/)
- [Industry's Blockchain Project, B3i, Ceases to Trade After Filing for Insolvency (Insurance Journal)](https://www.insurancejournal.com/news/international/2022/07/29/677926.htm)
- [Blockchain consortium B3i forced to shut down after major re/insurers pull plug (Intelligent Insurer)](https://www.intelligentinsurer.com/insurance/b3i-forced-to-shut-down-after-major-re-insurers-pull-the-plug-29965)
- [B3i fails to raise new capital, enters insolvency (Reinsurance News)](https://www.reinsurancene.ws/b3i-fails-to-raise-new-capital-enters-insolvency/)
- [Blockchain In Insurance: What To Learn From B3i Failure (LinkedIn — Florian Graillot)](https://www.linkedin.com/pulse/what-learn-from-b3i-failure-blockchain-industry-florian-graillot)
- [What Next for Blockchain in the Insurance Industry? (IA Magazine)](https://www.iamagazine.com/2023/02/01/what-next-for-blockchain-in-the-insurance-industry/)

### ASX CHESS Replacement (§1.6)
- [ASX Abandons Blockchain-Based System to Replace CHESS (Finance Magnates)](https://www.financemagnates.com/cryptocurrency/asx-abandons-blockchain-based-system-to-replace-chess/)
- [Blockchain Project Gone Wrong: ASIC Takes ASX to Court Over CHESS Replacement (The Fintech Times)](https://thefintechtimes.com/blockchain-project-gone-wrong-asic-takes-asx-to-court-over-chess-replacement/)
- [Case Study 21: The Australian Securities Exchange (ASX) $250 Million CHESS Blunder (Henrico Dolfing)](https://www.henricodolfing.com/2025/01/case-study-asx-chess-disaster.html)
- [ASX abandons $170 million blockchain Chess replacement project (FinanceAsia)](https://www.financeasia.com/article/asx-abandons-170-million-blockchain-chess-replacement-project/482290)
- [The ASX's CHESS checkmate (Inside Story)](https://insidestory.org.au/the-asxs-chess-checkmate/)
- [ASIC sues ASX over failed blockchain project (Information Age, ACS)](https://ia.acs.org.au/article/2024/asic-sues-asx-over-failed-blockchain-project.html)
- [Has ASX learned the lessons of its DLT failure? (Digital Finance)](https://www.digfingroup.com/asx-chess-governance/)

### IBM Food Trust (§2.1)
- [How Walmart brought unprecedented transparency to the food supply chain with Hyperledger Fabric (LF Decentralized Trust)](https://www.lfdecentralizedtrust.org/case-studies/walmart-case-study)
- [IBM takes its food supply blockchain solution worldwide (Supply Chain Dive)](https://www.supplychaindive.com/news/IBM-Food-Trust-SaaS-available-Carrefour/539065/)
- [Nestlé, Carrefour track infant formula on IBM Food Trust blockchain (Ledger Insights)](https://www.ledgerinsights.com/nestle-carrefour-blockchain-food-infant-formula-ibm-food-trust/)
- [Walmart's food safety solution using IBM Food Trust (IBM Mediacenter)](https://mediacenter.ibm.com/media/Walmart's+food+safety+solution+using+IBM+Food+Trust+built+on+the+IBM+Blockchain+Platform/1_zwsrls30)
- [How Walmart Enhances Food Safety with IBM Blockchain Technology (PixelPlex)](https://pixelplex.io/blog/walmart-strives-for-food-safety-using-blockchain/)
- [Application of blockchain technology in shaping the future of food industry (PMC, peer-reviewed)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10020414/)

### VeChain (§2.2)
- [BMW Group uses Blockchain to drive supply chain transparency (BMW Group press release)](https://www.press.bmwgroup.com/global/article/detail/T0307164EN/bmw-group-uses-blockchain-to-drive-supply-chain-transparency?language=en)
- [VeChain in late 2025: enterprise blockchain reality check (Medium — Ben Fairchild)](https://medium.com/@benjamin.fairchild/vechain-in-late-2025-enterprise-blockchain-reality-check-fdbf24ae3c2d)
- [Walmart and BMW Partnerships Help VeChain Scale in 2025 (Coin Edition)](https://coinedition.com/walmart-and-bmw-partnerships-help-vechain-scale-in-2025/)
- [A complete list of VeChain partnerships (VeChain Insider)](https://vechaininsider.com/partnerships/a-complete-list-of-vechain-partnerships/)
- [VeChain: The Blockchain for Supply Chain Management (IT Supply Chain)](https://itsupplychain.com/vechain-the-blockchain-for-supply-chain-management/)

### GSBN (§2.3)
- [GSBN — Here to simplify trade for all (official site)](https://gsbn.trade/)
- [About GSBN (official)](https://gsbn.trade/about-gsbn/)
- [GSBN simplifies global trade with Hyperledger Fabric (LF Decentralized Trust case study)](https://www.lfdecentralizedtrust.org/case-studies/gsbn-case-study)
- [Global Shipping Business Network (GSBN): eBL Exchange (Digitalize Trade Database)](https://www.digitalizetrade.org/projects/global-shipping-business-network-gsbn-ebl-exchange)
- [What can the AIs in 2025 learn from deploying blockchain in the shipping industry? (GSBN)](https://gsbn.trade/gsbn-insight/article/what-can-the-ais-in-2025-learn-from-deploying-blockchain-in-the-shipping-industry/)
- [Shipping blockchain network GSBN adds Portbase, ICTSI and Westport (Ledger Insights)](https://www.ledgerinsights.com/shipping-blockchain-network-gsbn-portbase-ictsi-westport/)

### MediLedger (§2.4)
- [MediLedger DSCSA Pilot Project (FDA download)](https://www.fda.gov/media/168283/download)
- [MediLedger DSCSA Pilot Project Report (AmerisourceBergen)](https://www.amerisourcebergen.com/-/media/assets/amerisourcebergen/manufacturer/mediledger-dscsa-pilot-report.pdf)
- [Real-World Blockchain Uses in the Pharmaceutical Industry (DrugPatentWatch)](https://www.drugpatentwatch.com/blog/real-world-blockchain-uses-in-the-pharmaceutical-industry/)
- [Blockchain Applications in the Pharmaceutical Industry (PMC, peer-reviewed)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11073477/)
- [Pharmaceutical Serialization and Track-and-Trace: Ensuring Compliance in 2025 (Euro-American Worldwide Logistics)](https://www.eawlogistics.com/pharmaceutical-serialization-and-track-and-trace-ensuring-compliance-in-2025/)
- [Big Pharma builds blockchain prototype to stop counterfeits (Supply Chain Dive)](https://www.supplychaindive.com/news/big-pharma-blockchain-MediLedger-DSCSA-FDA/505563/)
- [Blockchain Enters the Pharma Supply Chain (DCAT Value Chain Insights)](https://dcatvci.org/4628-blockchain-enters-the-pharma-supply-chain)
- [Blockchain track-and-trace in pharma: reality or hype? (Wireless-Life Sciences Alliance)](https://wirelesslifesciences.org/2025/05/blockchain-track-trace/)

### WaveBL & CargoX (§2.5)
- [WaveBL Platform — Electronic Bills of Lading (official)](https://wavebl.com/)
- [WAVE BL is Ruling the Digital Bill of Lading Blue Ocean (WaveBL blog)](https://wavebl.com/blog/wave-bl-is-ruling-the-digital-bl-blue-ocean/)
- [Wave BL Platform — Electronic Bill of Lading (Digitalize Trade)](https://www.digitalizetrade.org/services/wave-bl-platform-electronic-bill-lading-ebl-blockchain-software)
- [Navigating the Digitalization of Trade Finance (WaveBL)](https://wavebl.com/blog/digitalization-trade-finance-ebill-platforms/)
- [CargoX — Electronic Bill of Lading Software (official)](https://cargox.io/electronic-bill-of-lading-software)
- [The Time is Now: Widespread Adoption of the Electronic Bill of Lading (CargoX)](https://cargox.io/content-hub/time-is-now-widespread-adoption-electronic-bill-lading-ebl/)
- [Electronic Bill of Lading Market Research Report 2034 (Dataintelo)](https://dataintelo.com/report/electronic-bill-of-lading-market)
- [e-BL Blockchain Global Market Report 2025 (GII Research)](https://www.giiresearch.com/report/tbrc1872886-e-bl-electronic-bill-lading-blockchain-global.html)

### OriginTrail (§2.6)
- [OriginTrail — Making Supply Chains Work (tech site)](https://tech.origintrail.io/)
- [Transforming supply chains (OriginTrail)](https://origintrail.io/solutions/supply-chains)
- [OriginTrail partners with BSI to develop blockchain-enabled solutions (Medium)](https://medium.com/origintrail/origintrail-partners-with-bsi-to-develop-blockchain-enabled-solutions-d955a54d3371)
- [OriginTrail (TRAC) Protocol Analysis (Biyond)](https://biyond.co/blog/biyond-alpha-brief/origintrail-trac-protocol-analysis-from-supply-chain-transparency-to-ai-ready-data.html)
- [OriginTrail unlocks blockchain for global supply chains (The Paypers)](https://thepaypers.com/fintech/news/origintrail-unlocks-blockchain-for-global-supply-chains)
- [Three Metrics Showing OriginTrail's Network Growth in 2026 (Crypto News Navigator)](https://www.cryptonewsnavigator.com/academy/article/three-metrics-showing-origintrails-network-growth-in-2026)

### Komgo (§2.7)
- [komgo — Trade Finance Platform & Solutions (official)](https://www.komgo.io/)
- [komgo: Blockchain Case Study for Commodity Trade Finance (Consensys)](https://consensys.io/blockchain-use-cases/finance/komgo)
- [Commodities trade finance blockchain komgo goes live (Ledger Insights)](https://www.ledgerinsights.com/komgo-commodities-trade-finance-blockchain/)
- [What is komgo? (Trade Finance Global)](https://www.tradefinanceglobal.com/posts/what-is-komgo-commodity-trade-finance-meets-blockchain/)
- [SGS Co-launches komgo (SGS press release)](https://www.sgs.com/en/news/2018/09/sgs-co-launches-komgo)
- [komgo SA — Industry players and banks join forces (Société Générale)](https://wholesale.banking.societegenerale.com/en/news-insights/all-news-insights/news-details/news/komgo-industry-players-and-banks-join-forces-launch-blockchain-platform-transform-commodities-trade/)

### General sector context
- [IBM and Australian Stock Market's Blockchain Projects Failed (CoinDesk)](https://www.coindesk.com/business/2022/11/30/ibm-and-australian-stock-markets-blockchain-projects-failed-a-blow-to-private-ledgers)
- [Blockchain in trade finance: what changed and what works in 2026 (Espeo Software)](https://espeo.eu/content/blockchain-trade-finance-what-changed-what-works/)
- [Blockchain in supply chain management: a comprehensive review of success measurement methods (Springer / Management Review Quarterly)](https://link.springer.com/article/10.1007/s11301-025-00546-0)
- [In the leafy month of June: A blockchain yikes for bank financing of SME trade? (TXF News)](https://www.txfnews.com/articles/7410/)

---

*Last updated: April 2026.*
