# PAPERS — Key Literature Reference

Top 15 papers from the PRISMA systematic review underpinning CargoChain's
design decisions. Compiled via Google Scholar · May 2026.

> Full SOTA analysis (33 papers, five waves 2017–2026) is in
> [analise_detalhada_15_papers.md](analise_detalhada_15_papers.md).

---

## Selection Criteria

- Direct relevance to blockchain in supply chain / pharmaceutical transport
- Citation count (academic impact signal)
- Technical depth: smart contracts, IoT, cold chain, traceability
- Recency preference: 2020–2026
- Presence of prototype / concrete implementation

---

## Summary Table

| # | Title (abridged) | Authors | Year | Citations | Focus |
|---|-----------------|---------|------|-----------|-------|
| 1 | Drug traceability in healthcare supply chain | Musamih et al. | 2021 | ~324 | End-to-end pharma SC; counterfeit prevention |
| 2 | MedLedger: Hyperledger Fabric drug traceability | Uddin | 2021 | 301 | Hyperledger Fabric + smart contracts |
| 3 | 5-layer IoT+Blockchain tracking platform | Liu et al. | 2021 | 269 | BIoT3 5-layer architecture |
| 4 | IoT+Blockchain temperature monitoring | Singh et al. | 2020 | 259 | Cold chain + IoT sensors |
| 5 | Blockchain in pharma SC: review & framework | Ghadge et al. | 2023 | 222 | PRISMA review; conceptual framework |
| 6 | Blockchain+IoT medical product logistics | Nanda et al. | 2023 | 222 | Medical logistics with IoT |
| 7 | Smart contracts drug SC implementation | Bandhu et al. | 2023 | 104 | Ethereum + Solidity implementation |
| 8 | Blockchain solution pharma SC industry | Abdallah & Nizamuddin | 2023 | 143 | Smart contracts for drug delivery |
| 9 | Blockchain for pharma SC management (review) | Akram et al. | 2024 | 95 | Recent adoption review |
| 10 | PharmaChain: provenance verification | Gomasta et al. | 2023 | 73 | Provenance verification system |
| 11 | Blockchain adoption in pharma SC | Badhotiya et al. | 2021 | 85 | Adoption barriers |
| 12 | Transaction cost perspective pharma SC | Gruchmann et al. | 2023 | 53 | Cost-benefit; Egyptian pharma case study |
| 13 | Blockchain vs counterfeiting + cold chain | Sarkar | 2023 | 32 | Cold chain + anti-counterfeiting |
| 14 | Cold-chain medicine logistics blockchain | Zeng et al. | 2024 | 27 | Emergency cold-chain logistics |
| 15 | Vaccine transport monitoring + temperature | Esperança et al. | 2025 | Recent | Vaccine transport, EU context |

---

## Paper Details

### Paper 1 ⭐⭐⭐ — Most cited in the domain
**Title:** A blockchain-based approach for drug traceability in healthcare supply chain
**Authors:** A. Musamih, K. Salah, R. Jayaraman, J. Arshad, et al.
**Publication:** IEEE Access, vol. 9, 2021 · DOI: 10.1109/ACCESS.2021.3049920
**Citations:** ~324 (Semantic Scholar, May 2026)
**CargoChain relevance:** Bilateral custody transfer pattern adopted in `Package.sol`; dual-layer Ethereum + Fabric architecture used as production roadmap reference.

---

### Paper 2 ⭐⭐⭐
**Title:** Blockchain Medledger: Hyperledger Fabric enabled drug traceability system
**Authors:** M. Uddin
**Publication:** International Journal of Pharmaceutics, vol. 597, 2021 · DOI: 10.1016/j.ijpharm.2021.120235
**Citations:** 301
**CargoChain relevance:** MedLedger production system in operation since 2021 (FDA DSCSA mandate); referenced in CASE_STUDIES.md as survivor.

---

### Paper 3 ⭐⭐⭐
**Title:** Blockchain-based smart tracking and tracing platform for drug supply chain (BIoT3)
**Authors:** X. Liu, A.V. Barenji, Z. Li, B. Montreuil, et al.
**Publication:** Computers & Industrial Engineering, vol. 161, 2021 · DOI: 10.1016/j.cie.2021.107581
**Citations:** 269
**CargoChain relevance:** 5-layer IoT+blockchain architecture maps to the oracle simulator + MerkleIoT contract separation.

---

### Paper 4 ⭐⭐⭐
**Title:** Internet of Things based blockchain for temperature monitoring and counterfeit pharmaceutical prevention
**Authors:** R. Singh, A.D. Dwivedi, G. Srivastava
**Publication:** Sensors (MDPI), vol. 20, no. 14, 2020 · DOI: 10.3390/s20143951
**Citations:** 259
**CargoChain relevance:** Cold chain IoT monitoring — the primary application of `MerkleIoT.sol` in the pharmaceutical transport context.

---

### Paper 5 ⭐⭐⭐
**Title:** Blockchain implementation in pharmaceutical supply chains: A review and conceptual framework
**Authors:** A. Ghadge, M. Bourlakis, S. Kamble, S. Seuring
**Publication:** International Journal of Production Research, vol. 61, no. 19, 2023 · DOI: 10.1080/00207543.2022.2125595
**Citations:** 222
**CargoChain relevance:** Systematic review; ideal for PRISMA methodology justification and SOTA framing.

---

### Paper 6 ⭐⭐⭐
**Title:** Medical supply chain integrated with blockchain and IoT to track the logistics of medical products
**Authors:** S.K. Nanda, S.K. Panda, M. Dash
**Publication:** Multimedia Tools and Applications (Springer), vol. 82, 2023 · DOI: 10.1007/s11042-023-14846-8
**Citations:** 222
**CargoChain relevance:** IoT-blockchain integration for medical product logistics; aligns with oracle + MerkleIoT component.

---

### Paper 7 ⭐⭐
**Title:** Making drug supply chain secure, traceable and efficient: a Blockchain and smart contract based implementation
**Authors:** K.C. Bandhu, R. Litoriya, P. Lowanshi, M. Jindal, et al.
**Publication:** Multimedia Tools and Applications (Springer), vol. 82, 2023 · DOI: 10.1007/s11042-022-14238-4
**Citations:** 104
**CargoChain relevance:** Same stack (Ethereum + Solidity); good for direct architectural comparison.

---

### Paper 8 ⭐⭐
**Title:** Blockchain-based solution for pharma supply chain industry
**Authors:** S. Abdallah, N. Nizamuddin
**Publication:** Computers & Industrial Engineering (Elsevier), vol. 177, 2023 · DOI: 10.1016/j.cie.2023.108997
**Citations:** 143
**CargoChain relevance:** Smart contracts for pharmaceutical delivery; economic analysis perspective.

---

### Paper 9 ⭐⭐
**Title:** Blockchain technology: A potential tool for the management of pharma supply chain
**Authors:** W. Akram, R. Joshi, T. Haider, P. Sharma, V. Jain, et al.
**Publication:** Administrative Pharmacy (Elsevier), 2024
**Citations:** 95
**CargoChain relevance:** Recent review contextualising current state of blockchain adoption in pharmaceuticals.

---

### Paper 10 ⭐⭐
**Title:** PharmaChain: Blockchain-based drug supply chain provenance verification system
**Authors:** S.S. Gomasta, A. Dhali, T. Tahlil, M.M. Anwar, A.B.M.S. Ali
**Publication:** Heliyon (Cell Press), vol. 9, no. 7, 2023 · DOI: 10.1016/j.heliyon.2023.e17957
**Citations:** 73
**CargoChain relevance:** Architecturally comparable system; useful for design comparison.

---

### Paper 11 ⭐⭐
**Title:** Investigation and assessment of blockchain technology adoption in the pharmaceutical supply chain
**Authors:** G.K. Badhotiya, V.P. Sharma, S. Prakash, V. Kalluri, et al.
**Publication:** Materials Today: Proceedings (Elsevier), vol. 46, 2021 · DOI: 10.1016/j.matpr.2021.01.673
**Citations:** 85
**CargoChain relevance:** Adoption barriers analysis — relevant for limitations and challenges discussion.

---

### Paper 12 ⭐⭐
**Title:** Blockchain technology in pharmaceutical supply chains: a transaction cost perspective
**Authors:** T. Gruchmann, S. Elgazzar, A.H. Ali
**Publication:** Modern Supply Chain Research and Applications (Emerald), vol. 5, no. 2, 2023 · DOI: 10.1108/MSCRA-07-2022-0018
**Citations:** 53
**CargoChain relevance:** Real case study (Egyptian pharma company) with economic analysis.

---

### Paper 13 ⭐⭐
**Title:** Blockchain for combating pharmaceutical drug counterfeiting and cold chain distribution
**Authors:** S. Sarkar
**Publication:** Asian Journal of Research in Computer Science, vol. 16, no. 3, 2023 · DOI: 10.9734/ajrcos/2023/v16i3353
**Citations:** 32
**CargoChain relevance:** Identifies unauthenticated sensors as primary attack vector — justifies the `approvedOracle` allowlist in `MerkleIoT.sol`.

---

### Paper 14 ⭐⭐
**Title:** Advancing emergency supplies management: a blockchain-based traceability system for cold-chain medicine logistics
**Authors:** W. Zeng, Y. Wang, X. Niu, K. Liang, J. Li
**Publication:** Advanced Theory and Simulations (Wiley), vol. 7, no. 4, 2024 · DOI: 10.1002/adts.202300704
**Citations:** 27
**CargoChain relevance:** Emergency cold-chain logistics; contextualises criticality of pharmaceutical transport.

---

### Paper 15 ⭐⭐
**Title:** Blockchain-Based System for Monitoring Vaccine Transportation with Temperature Sensing
**Authors:** M. Esperança, R. Correia, J.C. Ferreira
**Publication:** 2025 IEEE International Conference on Distributed Ledger Technologies (ICDLT) · DOI: 10.1109/ICDLT66400.2025.11466720
**Citations:** Recent (2025)
**CargoChain relevance:** Most recent comparable work; Portuguese/EU context; directly comparable Ethereum Sepolia benchmarks (Coldnet).

---

## Key Insights for CargoChain

**For SOTA (PRISMA methodology):** Papers 5, 9, and 11 are systematic reviews
— ideal as starting points and for justifying the methodology.

**For technical comparison:** Papers 1, 2, 3, 7, and 10 have concrete
implementations with architectures comparable to CargoChain.

**For cold chain argument:** Papers 4, 13, 14, and 15 focus specifically on
temperature monitoring and IoT in pharmaceutical transport.

**For EU/regulatory context:** Paper 15 (2025, EU context) + Falsified Medicines
Directive (FMD 2011/62/EU) + EMA GDP Guidelines (2013) + eIDAS 2.0 (2024/1183).

---

## Search Queries Used

```
1. blockchain pharmaceutical drug transportation supply chain (from 2019)
2. blockchain IoT cold chain medicine traceability temperature (from 2019)
3. blockchain smart contracts drug traceability counterfeit DID verifiable credentials pharma (from 2020)
```

Databases: IEEE Xplore, ACM Digital Library, Scopus, Google Scholar, PubMed.
