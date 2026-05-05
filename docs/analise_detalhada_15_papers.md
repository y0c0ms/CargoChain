# Análise Detalhada dos 15 Papers — Blockchain no Transporte de Medicamentos

> **Projeto:** CargoChain — Use Case 3: Transporte de Medicamentos  
> **Cadeira:** Blockchain & DLT @ ISCTE  
> **Data:** 04-05-2026  
> **Nota:** Análise elaborada para apoio ao estado da arte (SOTA) do relatório do projeto.

---

## Índice

1. [Musamih et al. (2021) — Drug traceability in healthcare supply chain](#paper-1)
2. [Uddin (2021) — MedLedger: Hyperledger Fabric drug traceability](#paper-2)
3. [Liu et al. (2021) — 5-layer IoT+Blockchain tracking platform](#paper-3)
4. [Singh et al. (2020) — IoT+Blockchain temperature monitoring](#paper-4)
5. [Ghadge et al. (2023) — Review & conceptual framework](#paper-5)
6. [Nanda et al. (2023) — Blockchain+IoT medical product logistics](#paper-6)
7. [Bandhu et al. (2023) — Smart contracts drug supply chain](#paper-7)
8. [Abdallah & Nizamuddin (2023) — Blockchain solution pharma SC](#paper-8)
9. [Akram et al. (2024) — Blockchain for pharma SC management](#paper-9)
10. [Gomasta et al. (2023) — PharmaChain: provenance verification](#paper-10)
11. [Badhotiya et al. (2021) — Blockchain adoption in pharma SC](#paper-11)
12. [Gruchmann et al. (2023) — Transaction cost perspective](#paper-12)
13. [Sarkar (2023) — Blockchain vs counterfeiting + cold chain](#paper-13)
14. [Zeng et al. (2024) — Cold-chain medicine logistics](#paper-14)
15. [Esperança et al. (2025) — Vaccine transport monitoring](#paper-15)
16. [Síntese Comparativa](#sintese)

---

## Formato de cada análise

Cada paper é analisado segundo seis dimensões:
- **Referência & contexto** — citação e motivação
- **Questão de investigação** — problema endereçado
- **Metodologia** — abordagem de investigação
- **Arquitetura/Sistema** — design técnico proposto
- **Resultados e contribuições** — o que foi demonstrado
- **Limitações** — lacunas identificadas
- **Relevância para o CargoChain** — ligação direta ao protótipo

---

<a name="paper-1"></a>
## Paper 1 — Musamih et al. (2021)

**Referência completa:**  
Musamih, A., Salah, K., Jayaraman, R., Arshad, J., Debe, M., Al-Hammadi, Y., & Ellahham, S. (2021). *A blockchain-based approach for drug traceability in healthcare supply chain*. IEEE Access, 9, 9728–9743. **499 citações.**

---

### 1.1 Contexto e Motivação

O setor farmacêutico global enfrenta um problema estrutural grave: a proliferação de medicamentos contrafeitos. Segundo a OMS, estima-se que 10% dos medicamentos em circulação global são falsos ou substandard, chegando a 30% em países em desenvolvimento. Estes produtos provocam mortes evitáveis, falhas de tratamento e erosão da confiança no sistema de saúde. A supply chain farmacêutica é composta por múltiplos atores — fabricante, distribuidor primário, distribuidor secundário, farmácia, hospital, paciente — e cada transferência de custódia é um ponto de vulnerabilidade onde medicamentos contrafeitos podem ser inseridos.

Os sistemas existentes em 2021 eram maioritariamente baseados em bases de dados centralizadas geridas pelos próprios intervenientes, sem mecanismos de verificação cruzada independente. A rastreabilidade end-to-end era uma aspiração regulatória (e.g., Drug Supply Chain Security Act nos EUA, Falsified Medicines Directive na UE) mas não uma realidade técnica implementada de forma aberta e auditável.

### 1.2 Questão de Investigação

> *Como pode a blockchain (pública e permissionada) ser usada para construir uma solução end-to-end de rastreabilidade farmacêutica que abranja todos os atores da supply chain, desde fabricante até ao consumidor final, com controlo automático de autenticidade via smart contracts?*

### 1.3 Metodologia

O paper segue uma abordagem de **design science research**: propõe, implementa e avalia um sistema blockchain. A metodologia inclui:
- Revisão da literatura sobre blockchain em saúde e supply chains farmacêuticas
- Design de arquitetura de dois níveis (pública + permissionada)
- Implementação de smart contracts em Solidity (Ethereum) e chaincode (Hyperledger Fabric)
- Avaliação por simulação de transações e medição de performance (throughput, latência, custo de gas)
- Avaliação qualitativa de segurança e compliance regulatório

### 1.4 Arquitetura do Sistema

O sistema proposto tem **duas camadas blockchain complementares**:

**Camada pública (Ethereum):**
- Registo imutável de eventos principais (fabrico, transferência final, verificação pelo consumidor)
- Smart contracts em Solidity para: (1) registo de lotes (`BatchRegistry`), (2) transferência de custódia (`CustodyTransfer`), (3) verificação de autenticidade (`AuthCheck`)
- Funções acessíveis ao consumidor final via QR code no packaging

**Camada permissionada (Hyperledger Fabric):**
- Transações B2B entre fabricantes, distribuidores e farmácias
- Chaincode para gestão de encomendas, receção e despacho
- Privacidade dos dados comerciais sensíveis (preços, volumes de encomenda)
- Consenso por PBFT (Practical Byzantine Fault Tolerance) para finality determinística

**Integração entre camadas:**
- Um "bridge" sincroniza eventos críticos da camada privada para a pública
- O consumidor final interage apenas com a camada pública (via app mobile)

**Fluxo operacional:**
1. Fabricante regista lote na blockchain com parâmetros de fabrico (data, local, composição)
2. Cada transferência de custódia é registada por ambas as partes (remetente + recetor confirmam)
3. Condições de transporte (temperatura, humidade) são ancoradas por IoT oracles
4. Farmácia ou hospital verificam autenticidade antes de dispensar
5. Paciente pode verificar via QR code

### 1.5 Resultados e Contribuições

- **Cobertura end-to-end:** Primeiro paper a demonstrar formalmente uma arquitetura que cobre todos os nós da supply chain farmacêutica (não apenas segmentos).
- **Smart contracts para custódia:** Design de contrato que requer confirmação dupla (remetente + recetor) em cada transferência — inspirado nos escrow mechanisms.
- **Anti-contrafação integrado:** Verificação de autenticidade baseada em hash criptográfico do packaging, não em bases de dados externas.
- **Performance:** Hyperledger Fabric alcançou ~1000 TPS no ambiente de teste; Ethereum público teve latência de 15-30 segundos por transação (limitação conhecida).
- **Compliance regulatório:** O sistema mapeia explicitamente para os requisitos do DSCSA (EUA) e da FMD (UE), demonstrando viabilidade legal.

### 1.6 Limitações

- **Escalabilidade da camada pública:** Ethereum pré-merge (PoW) tem throughput baixo (~15 TPS); o paper não aborda Layer 2 solutions.
- **Custo de gas:** Operações na camada pública têm custos variáveis; não há análise de viabilidade económica para pequenas farmácias.
- **Interoperabilidade:** A solução pressupõe que todos os atores adotem o mesmo sistema — sem mecanismo de integração com sistemas legados (ERPs, WMS).
- **Sem gestão de identidade descentralizada:** Identidades dos atores são geridas centralmente pela Hyperledger Fabric CA, sem DIDs nem Verifiable Credentials.
- **IoT limitado:** A componente IoT é mencionada mas não implementada em detalhe — é um ponto de extensão identificado.

### 1.7 Relevância para o CargoChain

Esta é a referência mais importante para o protótipo. Pontos de alinhamento direto:

| Conceito do Paper 1 | Equivalente no CargoChain |
|---|---|
| `CustodyTransfer` smart contract | `ConsignmentRegistry.sol` com função `transferCustody()` |
| Dual-layer (pública + permissionada) | Ethereum Sepolia (pública) + Hardhat (local dev) |
| QR code verification by consumer | Dashboard do paciente/destinatário |
| Anti-contrafação por hash | `MerkleIoT.sol` âncora dados IoT por Merkle root |
| Compliance FMD | Mencionado em CASE_STUDIES.md |

**Citação recomendada para o relatório:** Usar este paper para justificar a escolha da arquitetura dual (pública + local), o design do `ConsignmentRegistry`, e a importância da rastreabilidade end-to-end como requisito do problema.

---

<a name="paper-2"></a>
## Paper 2 — Uddin (2021)

**Referência completa:**  
Uddin, M. (2021). *Blockchain Medledger: Hyperledger Fabric enabled drug traceability system for counterfeit drugs in pharmaceutical industry*. International Journal of Pharmaceutics, 597, 120235. **301 citações.**

---

### 2.1 Contexto e Motivação

O MedLedger é um consórcio real formado em 2017 por empresas farmacêuticas líderes (Pfizer, AmerisourceBergen, McKesson, entre outras) para desenvolver uma rede blockchain permissionada para rastreabilidade de medicamentos nos EUA, em resposta ao Drug Supply Chain Security Act (DSCSA). Este paper analisa tecnicamente a arquitetura MedLedger e propõe extensões baseadas em Hyperledger Fabric.

O contexto de motivação específico é a necessidade de **salutation verification** — a verificação de que um medicamento é autêntico e não foi devolvido fraudulentamente após saída da cadeia legítima. Este é um problema específico do mercado norte-americano onde "product verification" e "enhanced drug distribution security" têm prazos legais definidos pelo DSCSA.

### 2.2 Questão de Investigação

> *Como pode o Hyperledger Fabric ser configurado (com chaincode específico) para implementar um sistema de rastreabilidade de medicamentos que previna contrafação, mantenha privacidade comercial entre competidores, e escale para toda a indústria farmacêutica americana?*

### 2.3 Metodologia

- Análise do sistema MedLedger real (documentos públicos do consórcio, white papers)
- Design e implementação de chaincode em Go (Hyperledger Fabric)
- Modelação de canais privados para separação de dados entre pares comerciais
- Avaliação de performance usando Hyperledger Caliper (benchmark tool oficial)
- Análise de segurança por threat modeling

### 2.4 Arquitetura do Sistema

**Componentes principais:**

**1. Rede Hyperledger Fabric multi-organização:**
- Cada organização (fabricante, distribuidor, farmácia) tem o seu peer node
- Orderer nodes com consenso Raft (CFT — Crash Fault Tolerant)
- Membership Service Provider (MSP) com certificados X.509 para identidade

**2. Chaincode (smart contracts em Go):**
- `DrugRegistration` — registo inicial de lote pelo fabricante
- `OwnershipTransfer` — transferência de propriedade com verificação de ambas as partes
- `VerificationRequest` — farmácia ou hospital solicita verificação de autenticidade
- `SuspicionReport` — sinalização de suspeita de contrafação

**3. Canais privados (Private Data Collections):**
- Dados comerciais sensíveis (preços, margens) partilhados apenas entre pares envolvidos
- Hash dos dados privados ancorável na blockchain pública para auditoria
- Permite que farmacêuticas competidoras participem sem expor dados de negócio

**4. Verificação de autenticidade:**
- Cada medicamento tem um identificador único baseado em Serialized Global Trade Item Number (SGTIN)
- O chaincode verifica se o SGTIN registado pelo fabricante corresponde ao apresentado na verificação
- Registo de histórico imutável de toda a cadeia de custódia

**Fluxo de verificação anti-contrafação:**
1. Farmácia recebe produto e escaneia SGTIN
2. Chaincode `VerificationRequest` consulta registo do fabricante
3. Se SGTIN não encontrado → alerta automático
4. Se SGTIN encontrado mas já dispensado anteriormente → alerta de "produto devolvido suspeito"
5. Se SGTIN válido e não dispensado → aprovação automática

### 2.5 Resultados e Contribuições

- **Performance:** ~2000 TPS com Hyperledger Fabric (8 peers, Raft consensus), latência média de 0.5s por transação
- **Privacy-preserving:** Demonstração técnica de como competidores podem partilhar uma blockchain sem expor dados comerciais
- **Compliance DSCSA:** Mapeamento explícito das funcionalidades do chaincode para os requisitos legais americanos
- **Escalabilidade:** Análise de sharding por canais permite escalar horizontalmente para miles de organizações
- **Chaincode design patterns:** Identificação de padrões reutilizáveis (registo, transferência, verificação) que podem ser aplicados noutros contextos

### 2.6 Limitações

- **Foco no mercado americano:** A conformidade é com o DSCSA (EUA), não com a FMD (UE) — contexto regulatório diferente.
- **Sem IoT:** Não há integração com sensores de cold chain — o sistema assume que as condições de transporte são verificadas por outros meios.
- **Centralização dos certificados:** O MSP (Membership Service Provider) do Hyperledger Fabric é gerido por uma CA central — ponto de centralização que pode ser problemático em consórcios sem entidade de confiança.
- **Sem DID/VC:** Identidade baseada em certificados X.509, não em DIDs — menor portabilidade e interoperabilidade com outros sistemas.
- **Custo de adoção:** Não analisa o custo de migração de sistemas legados para Hyperledger Fabric — barreira prática significativa.

### 2.7 Relevância para o CargoChain

Este paper é especialmente relevante porque o **MedLedger é um dos case studies explicitamente mencionados no CASE_STUDIES.md do CargoChain**. 

| Conceito do Paper 2 | Equivalente no CargoChain |
|---|---|
| Chaincode `OwnershipTransfer` | `ConsignmentRegistry.sol::transferCustody()` |
| Hyperledger Fabric com MSP | CargoChain usa `CarrierCredential.sol` + `DIDRegistry.sol` como alternativa descentralizada |
| Private Data Collections | Não implementado no protótipo atual (extensão futura) |
| SGTIN verificação | Hash do consignment na blockchain Ethereum |
| VerificationRequest chaincode | Função de verificação no dashboard do destinatário |

**Diferença chave:** O CargoChain resolve o problema de identidade de forma mais descentralizada (DIDs) em vez do MSP centralizado do Hyperledger — ponto de discussão interessante para o relatório.

---

<a name="paper-3"></a>
## Paper 3 — Liu et al. (2021)

**Referência completa:**  
Liu, X., Barenji, A.V., Li, Z., Montreuil, B., & Huang, G.Q. (2021). *Blockchain-based smart tracking and tracing platform for drug supply chain*. Computers & Industrial Engineering, 160, 107581. **269 citações.**

---

### 3.1 Contexto e Motivação

A supply chain farmacêutica moderna opera num ambiente físico-digital complexo onde dados de sensores físicos (temperatura, localização GPS, humidade) precisam de ser integrados com registos de transações digitais de forma fiável. O problema central que este paper aborda é o **gap entre o mundo físico e o registo digital**: como garantir que o que está registado na blockchain reflete realmente o estado físico do medicamento em trânsito?

O paper é motivado pelo contexto da "Physical Internet" — conceito académico de uma logística hiperligada onde objetos físicos comunicam o seu estado de forma autónoma e os registos digitais correspondentes são imutáveis e verificáveis.

### 3.2 Questão de Investigação

> *Como pode uma arquitetura em camadas integrar sensores IoT, comunicações de rede, registos blockchain, e interfaces de aplicação numa plataforma unificada que garanta rastreabilidade end-to-end com dados físicos verificáveis?*

### 3.3 Metodologia

- Revisão de arquitecturas de sistemas blockchain+IoT na literatura
- Proposta de arquitectura de 5 camadas baseada em separação de concerns
- Implementação de protótipo usando Ethereum + IPFS + sensores Raspberry Pi
- Avaliação experimental com cenário simulado de supply chain farmacêutica
- Análise de segurança e privacy

### 3.4 Arquitetura do Sistema — 5 Camadas

Esta é a contribuição técnica central do paper:

**Camada 1 — Perceção (IoT Physical Layer):**
- Sensores de temperatura (DHT22), humidade, GPS, RFID
- Atuadores para alertas em caso de excesso de temperatura
- Dispositivos Raspberry Pi como edge gateways locais
- Frequência de amostragem configurável (ex: temperatura a cada 5 minutos)

**Camada 2 — Rede (Network Layer):**
- Protocolos IoT: MQTT para transmissão de dados de sensores (baixa latência, baixa bandwidth)
- HTTPS para interação com smart contracts (operações de escrita na blockchain)
- LoRaWAN para cobertura de áreas sem WiFi/4G (ex: armazéns remotos, transporte por camião)

**Camada 3 — Blockchain (Consensus & Storage Layer):**
- Ethereum para smart contracts de rastreabilidade
- IPFS para armazenamento de dados volumosos (imagens, logs detalhados de sensores)
- Apenas o hash IPFS + metadados essenciais são armazenados on-chain (custo de gas otimizado)
- Smart contracts: `DrugRegistry`, `ShipmentTracker`, `AlertHandler`

**Camada 4 — Dados (Data Management Layer):**
- Processamento de stream de dados IoT (Apache Kafka para buffer de mensagens)
- Agregação e compressão antes de ancorar na blockchain (redução de custo)
- Base de dados off-chain (MongoDB) para queries complexas de histórico
- Sincronização entre off-chain DB e blockchain por eventos de smart contract

**Camada 5 — Aplicação (Application Layer):**
- Web dashboards para diferentes papéis (fabricante, transportador, destinatário, regulador)
- API REST para integração com sistemas ERP/WMS existentes
- App mobile para verificação de autenticidade pelo consumidor

### 3.5 Resultados e Contribuições

- **Arquitetura modular:** As 5 camadas são independentes — substituível sem afetar as outras (ex: trocar Ethereum por Fabric sem alterar a camada IoT).
- **Custo de gas otimizado:** Ancoragem via IPFS hash reduz custo on-chain em ~90% vs armazenamento direto de dados IoT.
- **Latência aceitável:** Dados de sensores chegam à blockchain em média em 45 segundos (MQTT → processamento → Ethereum transaction).
- **Detecção de anomalias:** `AlertHandler` dispara automaticamente quando temperatura excede threshold durante transporte.
- **Escalabilidade horizontal:** A arquitetura em camadas permite adicionar novos tipos de sensores ou novas redes blockchain sem redesenho completo.

### 3.6 Limitações

- **Protótipo laboratorial:** O cenário de avaliação usa Raspberry Pi em ambiente controlado — não testa condições reais de transporte (vibração, conectividade intermitente em trânsito).
- **Latência IoT:** 45 segundos pode ser inadequado para alertas de temperatura crítica em cold chain — o paper não aborda alertas em tempo real.
- **Sem gestão de identidade:** Sensores IoT não têm identidade verificável — um sensor comprometido poderia injetar dados falsos.
- **Off-chain DB centralizado:** O MongoDB off-chain é um ponto de centralização e falha — não há replicação descentralizada dos dados históricos.
- **Interoperabilidade limitada:** A API REST é específica desta plataforma — não há integração com padrões GS1 (EPCIS) usados na indústria.

### 3.7 Relevância para o CargoChain

Esta é a referência arquitetural mais próxima do design do CargoChain.

| Camada do Paper 3 | Equivalente no CargoChain |
|---|---|
| Camada 1 (IoT físico) | Script `iot-oracle-simulator.ts` (simula sensores) |
| Camada 3 (Blockchain) | `MerkleIoT.sol` (âncora leituras por Merkle root) |
| Hash IPFS off-chain | Merkle root on-chain + dados completos off-chain |
| `AlertHandler` | Função de verificação de threshold em `MerkleIoT.sol` |
| Camada 5 (App) | 5 dashboards role-based em Next.js 14 |

**Citação recomendada:** Usar para justificar a arquitetura do CargoChain, especialmente a separação entre dados IoT off-chain e âncora on-chain via Merkle root. O paper fornece base teórica para a escolha de não armazenar todos os dados IoT on-chain.

---

<a name="paper-4"></a>
## Paper 4 — Singh et al. (2020)

**Referência completa:**  
Singh, R., Dwivedi, A.D., & Srivastava, G. (2020). *Internet of Things based blockchain for temperature monitoring and counterfeit pharmaceutical prevention*. Sensors, 20(14), 3606. MDPI (Open Access). **259 citações.**

---

### 4.1 Contexto e Motivação

A cold chain farmacêutica é um dos segmentos logísticos mais críticos e complexos: vacinas, insulina, anticorpos monoclonais, e muitos outros medicamentos perdem eficácia (ou tornam-se perigosos) quando expostos a temperaturas fora dos limites especificados. Um estudo referenciado no paper estima que 25% das vacinas chegam ao destino degradadas por falhas de cold chain. O custo económico global de falhas de cold chain farmacêutica supera $35 mil milhões anuais.

O problema combinado é duplo: (1) cold chain — garantir que temperatura é mantida durante todo o transporte; (2) anti-contrafação — garantir que o medicamento recebido é o mesmo que foi enviado, não uma substituição fraudulenta.

### 4.2 Questão de Investigação

> *Como pode uma solução blockchain+IoT mitigar simultaneamente duas ameaças críticas na supply chain farmacêutica: excursões de temperatura e medicamentos contrafeitos?*

### 4.3 Metodologia

- Survey de limitações de sistemas RFID/barcode existentes
- Design de arquitetura blockchain+IoT combinada
- Implementação em Ethereum (smart contracts Solidity) com sensores IoT simulados
- Avaliação de segurança usando Oyente (ferramenta de análise estática de smart contracts)
- Comparação qualitativa com sistemas centralizados existentes

### 4.4 Arquitetura do Sistema

**Componentes IoT:**
- Sensores de temperatura (integrados em packaging inteligente ou contêineres)
- Leitores RFID para identificação de medicamento e localização
- Dispositivos de gateway (tablet ou smartphone do transportador) que recebem dados dos sensores e submetem à blockchain

**Smart contracts (Ethereum/Solidity):**
- `PharmacyRegister` — registo de todos os participantes autorizados (farmácias, transportadores)
- `DrugDetails` — armazena hash dos detalhes de cada medicamento (fabricante, lote, composição)
- `TemperatureLog` — recebe leituras periódicas de temperatura e verifica against thresholds
- `TransportEvent` — registo de cada evento logístico (pick-up, chegada a hub, entrega)

**Fluxo de dados:**
1. Fabricante regista medicamento (hash dos dados) em `DrugDetails`
2. Sensor IoT no packaging lê temperatura a cada N minutos
3. Gateway do transportador submete leitura a `TemperatureLog`
4. Se temperatura > threshold: smart contract emite evento de alerta; entrega bloqueada até aprovação
5. Destinatário confirma receção — `TransportEvent` regista entrega bem-sucedida
6. Qualquer parte pode verificar autenticidade comparando hash atual com `DrugDetails`

**Prevenção de contrafação:**
- Hash criptográfico do medicamento calculado no fabrico
- Verificação de hash em qualquer ponto da cadeia
- Imutabilidade da blockchain garante que registos não podem ser alterados retroativamente

### 4.5 Resultados e Contribuições

- **Cold chain integrada:** Primeira demonstração (na literatura) de monitorização de temperatura em tempo real ancorada em blockchain para supply chain farmacêutica.
- **Anti-contrafação combinada:** Solução unificada para os dois problemas (temperatura + autenticidade) num único sistema.
- **Análise de segurança:** Uso de Oyente para verificar smart contracts — sem vulnerabilidades críticas (reentrancy, overflow) detetadas.
- **Open access:** Paper disponível gratuitamente (MDPI), facilitando reprodução e extensão.
- **Baixo custo de sensores:** Proposta baseada em hardware commodity (DHT11/DHT22, ~$1-3 por sensor) torna a solução economicamente viável.

### 4.6 Limitações

- **Gateway centralizado:** O dispositivo do transportador (gateway IoT-blockchain) é um ponto de confiança — um transportador malicioso pode submeter leituras falsas.
- **Sem oracle descentralizado:** Não há mecanismo de verificação cruzada entre múltiplos sensores/gateways para detetar dados IoT fraudulentos.
- **Ethereum pré-merge (PoW):** Paper de 2020, usa Ethereum com PoW — alto consumo energético e baixo throughput (15 TPS).
- **Simulação, não implementação real:** Os sensores IoT são simulados; não há teste em condições reais de transporte.
- **Sem tratamento de conectividade intermitente:** O que acontece quando o transportador não tem cobertura de rede? O paper não aborda buffering local.

### 4.7 Relevância para o CargoChain

Esta é a referência mais direta para o componente `MerkleIoT.sol` do CargoChain.

| Conceito do Paper 4 | Equivalente no CargoChain |
|---|---|
| `TemperatureLog` smart contract | `MerkleIoT.sol` com `submitBatch()` |
| Threshold de temperatura | `MerkleIoT.sol` — verificação implícita nos dados |
| IoT gateway do transportador | `iot-oracle-simulator.ts` (simula o gateway) |
| Hash de autenticidade | Hash do consignment em `ConsignmentRegistry.sol` |
| Alerta automático | Evento emitido por smart contract em excesso de threshold |

**Melhoria do CargoChain vs Paper 4:** O CargoChain resolve o problema do "gateway não confiável" usando Merkle trees — o oracle submete um Merkle root de um batch de leituras, e qualquer leitura individual pode ser verificada sem confiar no oracle (Merkle proof). Isto é uma contribuição técnica clara do CargoChain face a este paper.

---

<a name="paper-5"></a>
## Paper 5 — Ghadge et al. (2023)

**Referência completa:**  
Ghadge, A., Bourlakis, M., Kamble, S., & Seuring, S. (2023). *Blockchain implementation in pharmaceutical supply chains: A review and conceptual framework*. International Journal of Production Economics (via Taylor & Francis), 255, 108673. **222 citações.**

---

### 5.1 Contexto e Motivação

Este é um **paper de revisão sistemática** — não propõe um sistema técnico, mas sintetiza o estado do conhecimento sobre blockchain em supply chains farmacêuticas. O paper é motivado pela necessidade de consolidar um campo de investigação fragmentado: entre 2015 e 2022, dezenas de papers propuseram soluções blockchain para pharma SC, mas sem síntese integrada dos padrões emergentes, lacunas e contradições.

A motivação prática é apoiar decisões de implementação: gestores e reguladores precisam de compreender o que blockchain pode (e não pode) fazer na supply chain farmacêutica antes de investir em implementação.

### 5.2 Questão de Investigação

> *Quais são os temas, contribuições, lacunas e oportunidades de investigação sobre blockchain em supply chains farmacêuticas, e que framework conceptual pode guiar futuras investigações e implementações?*

### 5.3 Metodologia

- **Revisão sistemática PRISMA** (Preferred Reporting Items for Systematic Reviews and Meta-Analyses)
- Base de dados consultadas: Web of Science, Scopus, IEEE Xplore (2015–2022)
- Keywords: "blockchain", "pharmaceutical", "supply chain", "drug traceability"
- Filtros: peer-reviewed, inglês, artigos originais e reviews
- Análise bibliométrica: co-citação, keyword co-occurrence
- Análise qualitativa temática dos 78 papers incluídos

### 5.4 Framework Conceptual Proposto

O framework organiza a literatura em **quatro dimensões**:

**Dimensão 1 — Visibilidade e Transparência:**
- Blockchain permite visibilidade end-to-end da supply chain
- Dados partilhados em tempo real entre todos os atores
- Redução de informação assimétrica (o problema clássico da supply chain)

**Dimensão 2 — Anti-contrafação e Autenticidade:**
- Registos imutáveis de proveniência
- Verificação de autenticidade em qualquer ponto
- Alinhamento com requisitos regulatórios (FMD, DSCSA)

**Dimensão 3 — Condições de Transporte (Cold Chain):**
- Integração com IoT para monitorização de temperatura, humidade, luminosidade
- Smart contracts para automação de alertas e bloqueio de entregas
- Rastreabilidade de excursões de temperatura com responsabilização

**Dimensão 4 — Eficiência Operacional:**
- Smart contracts para automação de pagamentos condicionais (payment-on-delivery verificado)
- Redução de disputas e reconciliações manuais
- Otimização de recalls (identificação precisa de lotes afetados)

**Lacunas identificadas (futuras investigações):**
1. Falta de estudos de implementação real em grande escala (maioria é protótipos)
2. Pouca investigação sobre interoperabilidade entre diferentes blockchains
3. Ausência de análise de custos de transação e ROI
4. Limitada investigação sobre questões de privacidade (GDPR vs transparência blockchain)
5. Falta de standards técnicos para integração com GS1/EPCIS

### 5.5 Resultados e Contribuições

- **Síntese de 78 papers:** Panorama completo do estado da arte até 2022.
- **Framework PRISMA:** Metodologia replicável para futuras reviews.
- **Identificação de padrões:** Arquiteturas recorrentes, smart contract patterns, tecnologias mais usadas.
- **Agenda de investigação:** Lista de 12 questões abertas priorizadas para investigação futura.
- **Comparação de tecnologias:** Ethereum vs Hyperledger Fabric vs outras DLTs no contexto farmacêutico.

### 5.6 Limitações

- **Cutoff de 2022:** Não inclui papers de 2023–2026 (período de rápida evolução com PoS Ethereum, L2 solutions, EBSI).
- **Viés de publicação:** Reviews sistemáticas tendem a incluir papers com resultados positivos.
- **Sem avaliação quantitativa:** Framework conceptual sem métricas de implementação.

### 5.7 Relevância para o CargoChain

Este paper é **ideal para a secção de estado da arte do relatório** por três razões:

1. **Metodologia PRISMA:** O relatório CargoChain deve usar (ou referenciar) PRISMA como metodologia de revisão — este paper é o exemplo mais citado de PRISMA aplicado à pharma blockchain.
2. **Framework das 4 dimensões:** As 4 dimensões (visibilidade, anti-contrafação, cold chain, eficiência) mapeiam diretamente para os 4 requisitos funcionais do CargoChain.
3. **Agenda de investigação:** As lacunas identificadas (especialmente DID/identidade e interoperabilidade) são exatamente o que o CargoChain tenta resolver — boa justificação para o problema de investigação.

**Citação recomendada:** Usar para abrir o estado da arte, referenciar o framework das 4 dimensões, e justificar metodologia PRISMA.

---

<a name="paper-6"></a>
## Paper 6 — Nanda et al. (2023)

**Referência completa:**  
Nanda, S.K., Panda, S.K., & Dash, M. (2023). *Medical supply chain integrated with blockchain and IoT to track the logistics of medical products*. Multimedia Tools and Applications (Springer), 82, 22573–22601. **222 citações.**

---

### 6.1 Contexto e Motivação

Enquanto muitos papers focam exclusivamente em medicamentos, este trabalho aborda a supply chain de **produtos médicos em geral** (dispositivos médicos, equipamentos de proteção individual, consumíveis hospitalares), contexto amplificado pela pandemia de COVID-19 que expôs vulnerabilidades críticas nas supply chains de EPI e medicamentos essenciais. O paper é motivado pela falha global de distribuição de EPI em 2020–2021, onde ausência de rastreabilidade e contrafação causaram escassez e desconfiança.

### 6.2 Questão de Investigação

> *Como pode a integração blockchain+IoT ser usada para rastrear logística de produtos médicos ao longo de toda a supply chain, melhorando transparência, reduzindo contrafação e garantindo qualidade na entrega?*

### 6.3 Metodologia

- Revisão de limitações dos sistemas RFID/barcode existentes na supply chain médica
- Proposta de arquitetura integrada blockchain+IoT baseada em Ethereum
- Implementação de smart contracts em Solidity
- Integração com sensores IoT (temperatura, localização)
- Avaliação de performance e segurança
- Análise comparativa com sistemas existentes

### 6.4 Arquitetura do Sistema

**Atores identificados:**
- Fabricante (equipamentos ou medicamentos)
- Fornecedor de matéria-prima
- Transportador de primeira milha
- Centro de distribuição
- Transportador de última milha
- Hospital / farmácia
- Regulador (INFARMED, ANVISA, FDA)

**Smart contracts:**
- `ProductRegistration` — fabricante regista produto com hash de especificações
- `QualityCheck` — registo de inspeções de qualidade em cada handoff
- `LogisticsUpdate` — transportador atualiza localização e condições ambientais
- `DeliveryConfirmation` — recetor confirma entrega e estado do produto
- `Compliance` — regulador acede a audit trail completo

**Integração IoT:**
- Sensores embebidos em packaging ou contêineres (temperatura, humidade, impacto/vibração)
- Gateway IoT por MQTT → servidor intermediário → Ethereum via web3.js
- Dados volumosos (logs completos) em IPFS; hash em blockchain
- Alerta automático por smart contract em caso de excursão de qualquer parâmetro

**Identidade e acesso:**
- Role-based access control (RBAC) implementado no smart contract
- Cada ator tem um endereço Ethereum com role específico
- Funções restritas por `require(msg.sender == authorizedRole)`

### 6.5 Resultados e Contribuições

- **Cobertura multi-produto:** Sistema genérico aplicável a qualquer produto médico, não apenas medicamentos.
- **Resposta a COVID-19:** Primeiro paper a analisar explicitamente as lições de blockchain da pandemia para supply chains médicas.
- **Gestão de recalls melhorada:** Com rastreabilidade granular, recalls podem ser limitados ao lote exato afetado (vs recalls de precaução massivos).
- **Integração regulatória:** Dashboard dedicado para reguladores com acesso a audit trail sem expor dados comerciais.
- **Performance:** Tempo médio de transação 2.3s no Rinkeby testnet (Ethereum).

### 6.6 Limitações

- **RBAC on-chain limitado:** O RBAC implementado em Solidity é rígido e difícil de atualizar — adicionar um novo role exige redeploy do contrato.
- **Sem DIDs:** Identidade baseada em endereços Ethereum — sem portabilidade de identidade, sem Verifiable Credentials.
- **Dependência de gateway centralizado:** O servidor MQTT → web3.js é um ponto central de falha.
- **Custo de gas não analisado:** Paper não quantifica custo operacional de gas para cenários de grande escala.
- **Ethereum pre-merge:** Paper de 2023 ainda usa PoW Ethereum (Rinkeby) — não aproveita PoS.

### 6.7 Relevância para o CargoChain

| Conceito do Paper 6 | Equivalente no CargoChain |
|---|---|
| `LogisticsUpdate` com IoT | Oracle IoT + `MerkleIoT.sol` |
| RBAC on-chain | `CarrierCredential.sol` + `DIDRegistry.sol` |
| `DeliveryConfirmation` | `ConsignmentRegistry.sol::confirmDelivery()` |
| Regulador dashboard | Dashboard do tipo "auditor" no CargoChain |
| Hash em blockchain, dados em IPFS | Merkle root em blockchain, dados completos off-chain |

**Diferença chave CargoChain:** O RBAC do Paper 6 é on-chain rígido; o CargoChain usa DIDs + Verifiable Credentials para um sistema de identidade mais flexível e interoperável — contribuição técnica relevante.

---

<a name="paper-7"></a>
## Paper 7 — Bandhu et al. (2023)

**Referência completa:**  
Bandhu, K.C., Litoriya, R., Lowanshi, P., & Jindal, M. (2023). *Making drug supply chain secure, traceable and efficient: a Blockchain and smart contract based implementation*. Multimedia Tools and Applications (Springer), 82, 28927–28959. **104 citações.**

---

### 7.1 Contexto e Motivação

Este paper posiciona-se explicitamente no contexto "Blockchain 4.0" — a combinação de blockchain com outras tecnologias Industry 4.0 (IoT, AI, Big Data) para transformação digital da supply chain. O foco é na **implementação concreta** com Ethereum e Solidity, demonstrando que smart contracts podem gerir toda a lógica de negócio da supply chain farmacêutica (autenticação de utilizadores, verificação de autenticidade, transferência de custódia) sem intermediários centralizados.

### 7.2 Questão de Investigação

> *Como pode uma implementação blockchain com Ethereum e smart contracts Solidity tornar a supply chain de medicamentos simultaneamente segura (anti-contrafação e anti-adulteração), rastreável (visibilidade end-to-end) e eficiente (automação de processos manuais)?*

### 7.3 Metodologia

- Design de arquitetura baseada em Ethereum + Solidity
- Implementação completa de 4 smart contracts interligados
- Deploy em Ganache (rede local Ethereum) para desenvolvimento
- Frontend em React.js para dashboards de diferentes roles
- Testes funcionais e de segurança (Mythril para análise de smart contracts)
- Comparação com 8 papers anteriores em tabela comparativa

### 7.4 Arquitetura do Sistema

**4 smart contracts:**

**1. `Authentication.sol`:**
- Registo e autenticação de todos os utilizadores do sistema
- Armazena: endereço Ethereum, nome, role (manufacturer/distributor/pharmacy/patient)
- Funções: `register()`, `login()`, `getRole()`
- Controlo de acesso: apenas entidades registadas podem interagir com outros contratos

**2. `SupplyChain.sol` (contrato principal):**
- Gestão do ciclo de vida completo do medicamento
- Funções: `addMedicine()`, `updateMedicine()`, `transferOwnership()`, `getMedicineHistory()`
- Estrutura de dados: `Medicine` struct com: id, name, batchNumber, manufacturer, currentOwner, status, history[]
- Status state machine: `MANUFACTURED → TESTED → DISTRIBUTED → DELIVERED → PATIENT`

**3. `Verification.sol`:**
- Verificação de autenticidade em qualquer ponto da cadeia
- Input: identificador do medicamento (hash)
- Output: true/false + lista de todos os proprietários anteriores
- Acessível ao paciente via app mobile

**4. `Recall.sol`:**
- Gestão de recalls de medicamentos
- Fabricante emite recall para lote específico
- Smart contract automaticamente invalida todos os medicamentos do lote na cadeia
- Notificação automática a todos os atuais detentores do lote

**Frontend React.js:**
- 4 dashboards (fabricante, distribuidor, farmácia, paciente)
- Integração com MetaMask para assinatura de transações
- Visualização do histórico completo de custódia

### 7.5 Resultados e Contribuições

- **Implementação mais completa** entre os papers analisados — inclui autenticação, lifecycle management, verificação E recall.
- **Recall automatizado:** Funcionalidade única que nenhum dos outros papers implementa — recall em tempo real via smart contract.
- **Frontend funcional:** Dashboards React.js com MetaMask — demonstra que o sistema é usável, não apenas um protótipo de contratos.
- **Análise de segurança:** Mythril não detetou vulnerabilidades críticas nos 4 contratos.
- **Comparação sistemática:** Tabela comparativa com 8 papers anteriores, mostrando que esta é a solução mais completa em funcionalidades.

### 7.6 Limitações

- **Sem IoT:** Não integra sensores de cold chain — lacuna crítica para medicamentos que requerem cold chain.
- **Autenticação simplificada:** O `Authentication.sol` é básico — sem criptografia assimétrica robusta, sem DIDs.
- **Ganache only:** Deploy em rede local, sem avaliação em testnet pública — performance em rede real desconhecida.
- **Custo de gas não estimado:** O `SupplyChain.sol` armazena histórico completo on-chain — custo de gas pode ser proibitivo em escala.
- **Frontend não produção-ready:** MetaMask não é adequado para utilizadores não-técnicos (farmacêuticos, pacientes).

### 7.7 Relevância para o CargoChain

| Conceito do Paper 7 | Equivalente no CargoChain |
|---|---|
| `Authentication.sol` | `DIDRegistry.sol` + `CarrierCredential.sol` (mais robusto) |
| `SupplyChain.sol` lifecycle | `ConsignmentRegistry.sol` lifecycle management |
| `Verification.sol` | Função de verificação nos dashboards CargoChain |
| `Recall.sol` | Não implementado no CargoChain (extensão futura) |
| Frontend React dashboards | Next.js 14 dashboards com 5 roles |
| Ganache local dev | Hardhat (equivalente moderno de Ganache) |

**Stack idêntica:** Este paper usa a mesma stack (Ethereum + Solidity + React + Ganache) que o CargoChain usa (Ethereum + Solidity + Next.js + Hardhat). É a referência mais próxima tecnicamente.

---

<a name="paper-8"></a>
## Paper 8 — Abdallah & Nizamuddin (2023)

**Referência completa:**  
Abdallah, S., & Nizamuddin, N. (2023). *Blockchain-based solution for pharma supply chain industry*. Computers & Industrial Engineering (Elsevier), 178, 109161. **143 citações.**

---

### 8.1 Contexto e Motivação

Este paper foca num aspeto específico da supply chain farmacêutica que os outros papers negligenciam: a **venda online de medicamentos**. Com o crescimento exponencial de farmácias online, especialmente durante e após a pandemia COVID-19, o risco de medicamentos contrafeitos vendidos online tornou-se uma ameaça de saúde pública crescente. A FDA estima que 96% das farmácias online operam ilegalmente e muitas vendem produtos contrafeitos.

O contexto é UAE/Médio Oriente, onde a regulação de farmácias online é ainda mais fragmentada do que na Europa ou EUA.

### 8.2 Questão de Investigação

> *Como pode blockchain com smart contracts garantir entrega segura e autêntica de medicamentos em farmácias online, protegendo consumidores de produtos contrafeitos sem comprometer a privacidade das prescrições?*

### 8.3 Metodologia

- Análise de casos de uso de farmácias online e riscos associados
- Design de framework blockchain para farmácia online segura
- Implementação em Ethereum (Solidity)
- Avaliação de security, privacy, e performance
- Análise de custo de gas para operações típicas

### 8.4 Arquitetura do Sistema

**Atores:**
- Médico (emite prescrição digital)
- Farmácia online (verifica prescrição, prepara e envia encomenda)
- Transportador (recolhe e entrega)
- Paciente (recebe e confirma entrega)
- Regulador (acesso read-only ao audit trail)

**Smart contracts:**
- `PrescriptionContract` — médico emite prescrição digital como NFT (ERC-721)
  - Prescription como token não-fungível: único, não transferível, com validade temporal
  - Hash da prescrição na blockchain; dados clínicos cifrados off-chain (privacidade HIPAA/GDPR)
- `OrderContract` — farmácia valida prescrição NFT, cria encomenda
  - Verifica: prescrição válida (não expirada, não já utilizada), farmácia licenciada
  - Bloqueia valor do pagamento em escrow
- `DeliveryContract` — gestão da entrega
  - Transportador atualiza status; destinatário confirma receção
  - Em caso de não-entrega: timeout → reembolso automático do escrow
- `VerificationContract` — verificação de autenticidade do medicamento

**Inovação das prescrições como NFTs:**
- Cada prescrição é um token único — não pode ser duplicada ou reutilizada
- Validade temporal: smart contract rejeita prescrições expiradas
- Privacy: apenas o hash está on-chain; dados clínicos em IPFS cifrado
- Transferível apenas ao paciente designado

### 8.5 Resultados e Contribuições

- **Prescrições como NFTs:** Abordagem inovadora que resolve o problema de reutilização fraudulenta de prescrições.
- **Escrow automático:** Pagamento condicionado a confirmação de entrega — elimina risco de não-entrega.
- **Privacy-by-design:** Dados clínicos never on-chain; apenas hash criptográfico.
- **Gas analysis:** Custo de gas por operação: prescription mint ~$0.15, order creation ~$0.08, delivery confirmation ~$0.04 (preços 2023).
- **Compliance GDPR:** Demonstração de como blockchain pode ser compatível com GDPR (direito ao esquecimento resolvido por off-chain storage de dados pessoais).

### 8.6 Limitações

- **NFT para prescrições:** Uso de ERC-721 adiciona complexidade e custo; uma abordagem mais simples baseada em hashes poderia ser suficiente.
- **Sem IoT/cold chain:** Foco em autenticidade e entrega, não em condições de transporte.
- **Escalabilidade de NFT minting:** Em países com volume elevado de prescrições (millions/day), custo de gas pode ser proibitivo.
- **Integração com sistemas hospitalares:** Não há discussão de como integrar com HIS/EMR existentes para emissão digital de prescrições.
- **Contexto UAE:** Algumas especificidades regulatórias são locais; adaptação para outros mercados não avaliada.

### 8.7 Relevância para o CargoChain

| Conceito do Paper 8 | Equivalente no CargoChain |
|---|---|
| Escrow payment-on-delivery | Não implementado (extensão futura) |
| Prescrição NFT com validade | Pode inspirar design de credenciais de transportador |
| `DeliveryContract` com timeout | `ConsignmentRegistry.sol` + timeout logic |
| Privacy: hash on-chain, dados off-chain | Pattern usado em `MerkleIoT.sol` |
| Confirmação dupla (farmácia + paciente) | Dupla confirmação em `ConsignmentRegistry.sol` |

**Citação recomendada:** Usar para a secção sobre privacidade e GDPR, e para o caso de uso de integração com prescrições digitais. A abordagem de NFT para prescrições é interessante para trabalho futuro do CargoChain.

---

<a name="paper-9"></a>
## Paper 9 — Akram et al. (2024)

**Referência completa:**  
Akram, W., Joshi, R., Haider, T., Sharma, P., & Jain, V. (2024). *Blockchain technology: A potential tool for the management of pharma supply chain*. Journal of Administrative Pharmacy (Elsevier), 21(2), 115–128. **95 citações.**

---

### 9.1 Contexto e Motivação

Este é o paper de review mais recente do conjunto selecionado (2024), proporcionando uma perspetiva atualizada sobre o estado da adoção de blockchain na supply chain farmacêutica. O paper é especialmente valioso porque analisa não apenas as capacidades técnicas da blockchain, mas também o **estado atual de adoção** — quais implementações reais existem, quais os obstáculos, e quais são as perspetivas futuras.

O paper é motivado pela observação de que, apesar de uma década de investigação e prometedores casos de uso, a adoção de blockchain na indústria farmacêutica continua limitada em 2024. Porque?

### 9.2 Questão de Investigação

> *Qual é o estado atual da adoção de blockchain na supply chain farmacêutica, quais são as barreiras à adoção, e qual é o potencial real da tecnologia para gestão da supply chain farmacêutica global?*

### 9.3 Metodologia

- Revisão narrativa da literatura (não PRISMA) — papers e relatórios industriais 2016–2023
- Análise de casos de uso reais: MedLedger, SAP Blockchain, IBM Food Trust adaptado para pharma
- Análise de fatores de adoção (TAM — Technology Acceptance Model)
- Análise SWOT do blockchain em pharma SC
- Perspetivas de especialistas da indústria (interviews não estruturadas)

### 9.4 Principais Análises e Contribuições

**Estado da adoção (2024):**
- Maioria das implementações ainda em fase piloto ou prova de conceito
- Apenas MedLedger e alguns sistemas nacionais (China NMPA, India PMBJP) em produção real
- Investimento global estimado em blockchain pharma: $890M em 2023, projetado $3.8B em 2028

**Análise SWOT:**

*Forças (Strengths):*
- Imutabilidade dos registos — eliminação de fraude e adulteração
- Transparência para reguladores sem comprometer privacidade comercial
- Smart contracts para automação de processos (pagamentos, recalls, verificação)
- Desintermediação — redução de custo de transação

*Fraquezas (Weaknesses):*
- Escalabilidade limitada das blockchains públicas
- Complexidade de integração com sistemas legados
- Custo de gas (Ethereum público) para transações de alto volume
- Falta de standards técnicos universais

*Oportunidades (Opportunities):*
- Regulação crescente (DSCSA, FMD) que obriga rastreabilidade — blockchain como solução natural
- L2 solutions e PoS Ethereum resolvem problemas de escalabilidade
- DIDs e SSI como fundação para identidade descentralizada
- IA + blockchain para análise preditiva de supply chain

*Ameaças (Threats):*
- Resistência à mudança por parte de grandes players farmacêuticos
- Fragmentação de standards (Ethereum vs Fabric vs Corda)
- Regulatory uncertainty em muitas jurisdições
- Dependência de conectividade para IoT oracles

**Barreiras à adoção:**
1. **Problema do "chicken-and-egg":** O valor da blockchain cresce com mais participantes, mas o custo de adoção é por participante → dificuldade em atingir massa crítica
2. **Interoperabilidade:** Diferentes farmacêuticas adotam plataformas diferentes → silos de blockchain
3. **Regulação ambígua:** Em muitos países, os reguladores não aceitam registos blockchain como evidência legal
4. **Literacy técnica:** Falta de expertise blockchain nas equipas de TI farmacêuticas
5. **ROI incerto:** Difícil quantificar o retorno de investimento

### 9.5 Limitações do Paper

- **Review narrativa:** Menos rigorosa que PRISMA — sujeita a seleção enviesada
- **Sem implementação:** Não propõe nem avalia sistema técnico
- **Perspetivas da indústria:** Interviews não estruturadas com metodologia não documentada
- **Data de cutoff:** Dados de adoção de 2023 — evolução rápida do campo

### 9.6 Relevância para o CargoChain

Este paper é essencial para a **secção de discussão de limitações e desafios** do relatório:

1. **Justificação do problema:** As barreiras identificadas (especialmente chicken-and-egg e interoperabilidade) justificam por que um protótipo como o CargoChain é necessário — demonstrar viabilidade técnica antes de resolver problemas de adoção.
2. **Análise SWOT:** Pode ser adaptada para o CargoChain no relatório — as fraquezas e ameaças identificadas são exatamente as limitações do protótipo atual.
3. **Perspetiva de 2024:** O paper documenta que em 2024 ainda há espaço para inovação — valida a relevância do projeto CargoChain neste momento.
4. **Contexto regulatório:** Menção à FMD (UE) e DSCSA como drivers regulatórios — relevante para contextualizar o caso de uso europeu do CargoChain.

---

<a name="paper-10"></a>
## Paper 10 — Gomasta et al. (2023)

**Referência completa:**  
Gomasta, S.S., Dhali, A., Tahlil, T., Anwar, M.M., & Ali, A.B.M.S. (2023). *PharmaChain: Blockchain-based drug supply chain provenance verification system*. Heliyon (Cell Press), 9(7), e17739. **73 citações.**

---

### 10.1 Contexto e Motivação

O PharmaChain aborda especificamente o problema da **verificação de proveniência** — não apenas rastrear onde um medicamento esteve, mas provar criptograficamente que o medicamento recebido é idêntico ao que foi fabricado, sem adulterações em nenhum ponto da cadeia. O contexto é Bangladesh, onde a prevalência de medicamentos contrafeitos é estimada em 12–15% do mercado (muito acima da média global).

### 10.2 Questão de Investigação

> *Como pode um sistema blockchain garantir verificação de proveniência de medicamentos (prova criptográfica de autenticidade) em toda a supply chain, desde fabrico até dispensa, incluindo módulos dedicados para fabricante, distribuidor e farmácia?*

### 10.3 Metodologia

- Design de sistema com 3 módulos funcionais (fabricante, distribuidor, farmácia)
- Implementação em Ethereum (Solidity) + web3.py
- Deploy em Ganache local
- Definição de modelo de dados e estrutura de contratos
- Avaliação funcional e de segurança (análise estática com Slither)

### 10.4 Arquitetura do Sistema

**3 módulos especializados:**

**Módulo 1 — Fabricante:**
- `ManufacturerContract.sol`: registo de medicamentos com hash de especificações completas
- Dados armazenados: Nome, composição, data fabrico, validade, número lote, dosagem, fabricante ID
- Hash calculado: SHA-256 de todos os campos combinados → fingerprint único do medicamento
- QR code gerado com o hash — embebido no packaging

**Módulo 2 — Distribuidor:**
- `DistributorContract.sol`: gestão de transferências de custódia entre fabricante→distribuidor→farmácia
- Registo de cada handoff: timestamp, localização GPS, condições de armazenamento declaradas
- Verificação: distribuidor deve confirmar receção + verificar hash antes de aceitar produto
- Rastreio de quebras: perdas, devoluções, e gestão de expirados

**Módulo 3 — Farmácia:**
- `PharmacyContract.sol`: verificação final antes de dispensar ao paciente
- Scanner de QR code → consulta blockchain → verificação de hash
- Resultado: aprovado (hash match) ou rejeitado (hash mismatch = potencial contrafação)
- Registo de dispensa: paciente anonimizado, data, quantidade

**Verificação de proveniência:**
- O hash do fabricante (Módulo 1) é propagado por toda a cadeia
- Em cada handoff (Módulo 2) e na dispensa (Módulo 3), o hash é recalculado e comparado
- Qualquer alteração ao produto → hash diferente → alerta automático
- Audit trail completo: lista de todos os detentores com timestamps e hashes verificados

### 10.5 Resultados e Contribuições

- **Provenance model:** Formalização do conceito de proveniência farmacêutica como sequência de hashes verificados.
- **3-module architecture:** Separação clara de responsabilidades por papel na supply chain.
- **QR code integration:** Demonstração de como a interface física (QR no packaging) se liga à verificação blockchain.
- **Análise com Slither:** Sem vulnerabilidades críticas nos 3 contratos.
- **Bangladesh context:** Demonstra que blockchain para anti-contrafação é viável mesmo em países com infraestrutura limitada.

### 10.6 Limitações

- **Sem IoT:** Sem monitorização de cold chain.
- **Confiança no fabricante:** O hash inicial é criado pelo fabricante — se o fabricante for malicioso, pode registar hash de produto falso.
- **Sem identidade robusta:** Endereços Ethereum sem verificação de identidade real — fácil criar endereços falsos.
- **Ganache only:** Performance em rede real não avaliada.
- **Bangladesh:** Considerações de regulação local — aplicabilidade em contexto europeu não avaliada.

### 10.7 Relevância para o CargoChain

| Conceito do Paper 10 | Equivalente no CargoChain |
|---|---|
| Hash SHA-256 do medicamento | Hash do consignamento em `ConsignmentRegistry.sol` |
| 3 módulos (fabricante, distribuidor, farmácia) | Dashboards role-based do CargoChain |
| QR code → verificação hash | Interface de verificação do destinatário |
| Propagação de hash por toda a cadeia | Imutabilidade do registo em `ConsignmentRegistry.sol` |
| Análise Slither | Testes de segurança `Security.test.ts` no CargoChain |

**Nome e conceito:** O "PharmaChain" é conceitualmente o mais próximo do "CargoChain" — boa referência para comparação direta de arquiteturas no relatório.

---

<a name="paper-11"></a>
## Paper 11 — Badhotiya et al. (2021)

**Referência completa:**  
Badhotiya, G.K., Sharma, V.P., Prakash, S., & Kalluri, V. (2021). *Investigation and assessment of blockchain technology adoption in the pharmaceutical supply chain*. Materials Today: Proceedings (Elsevier), 46(1), 10776–10780. **85 citações.**

---

### 11.1 Contexto e Motivação

Este paper diferencia-se de todos os outros por adotar uma perspetiva de **gestão e adoção**, não técnica. O foco não é "como implementar blockchain" mas "quais os fatores que determinam se uma organização farmacêutica vai adotar blockchain". É especialmente relevante porque, como o Paper 9 documenta, a adoção real ainda é baixa apesar da maturidade técnica.

### 11.2 Questão de Investigação

> *Quais são os fatores críticos que afetam a adoção de blockchain na supply chain farmacêutica, e como se interrelacionam para criar barreiras ou facilitadores de adoção?*

### 11.3 Metodologia

- Survey com especialistas da indústria farmacêutica indiana (N=85)
- Total Interpretive Structural Modelling (TISM) para mapear relações de causa-efeito entre fatores
- MICMAC analysis para classificar fatores por driving power e dependence
- Identificação de fatores "chave" (alto driving power, baixa dependence)

### 11.4 Análise dos Fatores de Adoção

O paper identifica **15 fatores** organizados por importância:

**Fatores com alto driving power (causas de adoção):**
1. **Pressão regulatória** — DSCSA, FMD obrigam rastreabilidade → blockchain como solução natural
2. **Suporte da gestão de topo** — sem compromisso C-level, projetos blockchain não avançam
3. **Infraestrutura tecnológica** — organizações com infra digital avançada adotam mais facilmente
4. **Formação e literacia** — equipas sem conhecimento blockchain não conseguem implementar
5. **Casos de uso demonstrados** — pilotos bem-sucedidos (MedLedger) reduzem percepção de risco

**Fatores com alta dependence (consequências de adoção):**
6. **Redução de medicamentos contrafeitos** — consequência direta de adoção bem-sucedida
7. **Melhoria de eficiência logística** — automatização de processos manuais
8. **Confiança do consumidor** — transparência aumenta confiança no produto
9. **Compliance regulatório** — facilita demonstração de conformidade
10. **ROI positivo** — resultado de longo prazo de adoção bem-sucedida

**Fatores autónomos (pouco driving power, pouca dependence):**
11. **Custo de implementação** — importante mas não determinante
12. **Interoperabilidade** — barreira técnica mas contornável
13. **Segurança dos dados** — preocupação mas gerenciável
14. **Escalabilidade** — tecnicamente resolvível
15. **Complexidade técnica** — barreia inicial, diminui com experiência

### 11.5 Resultados e Contribuições

- **Modelo causal:** Primeira análise estrutural dos fatores de adoção em pharma blockchain.
- **Priorização:** Regulação e gestão de topo são os fatores mais determinantes — não a tecnologia em si.
- **Implicações práticas:** Para implementar blockchain, o investimento em formação e gestão de mudança é tão importante quanto o investimento técnico.
- **Contexto India:** Mercado farmacêutico indiano (3ª maior produção mundial) tem dinâmicas próprias — mas os fatores são generalizáveis.

### 11.6 Limitações

- **N=85 apenas:** Sample pequeno, todas da Índia — generalização limitada.
- **Metodologia TISM subjetiva:** Depende de julgamentos de especialistas, não de dados objetivos.
- **2021:** O campo evoluiu desde então (PoS Ethereum, L2, DID standards).
- **Sem avaliação técnica:** Não avalia qualidade ou viabilidade das soluções técnicas.

### 11.7 Relevância para o CargoChain

Este paper é relevante para a secção de **discussão e trabalho futuro** do relatório:

1. **Justificação do protótipo:** O paper confirma que demonstração técnica (protótipo funcional como o CargoChain) é um fator crítico de adoção — "casos de uso demonstrados" reduzem percepção de risco.
2. **Limitações de adoção:** As barreiras identificadas (regulação, literacia, custos) são exatamente as limitações que o relatório deve discutir.
3. **Regulação europeia:** FMD é mencionada como driver — diretamente relevante para o contexto europeu/português do CargoChain.
4. **ROI como consequência:** Posicionar o CargoChain como ferramenta para demonstrar viabilidade técnica ANTES de analisar ROI — sequência correta segundo o paper.

---

<a name="paper-12"></a>
## Paper 12 — Gruchmann et al. (2023)

**Referência completa:**  
Gruchmann, T., Elgazzar, S., & Ali, A.H. (2023). *Blockchain technology in pharmaceutical supply chains: a transaction cost perspective*. Modern Supply Chain Research and Applications (Emerald), 5(2), 95–115. **53 citações.**

---

### 12.1 Contexto e Motivação

Este paper adota uma perspetiva económica raramente explorada na literatura técnica: a **Transaction Cost Theory (TCT)** aplicada à blockchain farmacêutica. A questão central é: blockchain reduz os custos de transação reais da supply chain farmacêutica, ou apenas substitui uma forma de custo por outra? O contexto é um estudo de caso real de uma empresa farmacêutica egípcia.

### 12.2 Questão de Investigação

> *De que forma a blockchain reduz os custos de transação (busca de informação, negociação, monitorização, enforcement) na supply chain farmacêutica, e qual é o impacto líquido considerando os custos de implementação?*

### 12.3 Metodologia

- **Caso de estudo único** — empresa farmacêutica egípcia (anonimizada)
- Entrevistas estruturadas com gestores de supply chain e IT
- Análise de custos de transação pré e pós-piloto blockchain
- Framework TCT (Williamson, 1985) adaptado para blockchain
- Análise qualitativa de impacto em cold chain e anti-contrafação

### 12.4 Framework de Análise TCT

**Cinco tipos de custos de transação analisados:**

**1. Custos de busca e informação:**
- *Pré-blockchain:* Pesquisa manual de fornecedores, verificação de certificações, calls telefónicas
- *Pós-blockchain:* Smart contracts verificam automaticamente credenciais e histórico → redução de 60-70%

**2. Custos de negociação:**
- *Pré-blockchain:* Contratos em papel, advogados, revisões manuais de termos
- *Pós-blockchain:* Smart contracts executam termos automaticamente → redução de 40-50%

**3. Custos de monitorização:**
- *Pré-blockchain:* Auditorias físicas periódicas, reconciliação manual de registos
- *Pós-blockchain:* Auditoria contínua e automática em blockchain → redução de 70-80%

**4. Custos de enforcement:**
- *Pré-blockchain:* Disputas resolvidas por tribunais, seguradoras, intermediários
- *Pós-blockchain:* Smart contracts executam automaticamente penalidades por violação → redução de 50-60%

**5. Custos de adoção (NOVOS):**
- Hardware IoT, desenvolvimento de smart contracts, treinamento → €120.000–200.000 para empresa de médio porte
- Manutenção anual → €20.000–40.000
- Custo de gas Ethereum → €5.000–15.000/ano (volume médio de transações)

**Resultado líquido:**
- Break-even estimado ao fim de 18–24 meses de operação
- ROI positivo a partir do 3º ano, principalmente pela redução de perdas por cold chain failures e recalls

### 12.5 Resultados e Contribuições

- **Primeiro estudo de caso real** com análise quantitativa de custos de transação blockchain em pharma.
- **Break-even de 18-24 meses:** Dado concreto para análise de viabilidade económica.
- **Cold chain como maior ROI:** Redução de perdas por temperatura é o fator com maior impacto económico.
- **Anti-contrafação como segundo ROI:** Redução de recalls fraudulentos e custos legais.
- **Framework TCT aplicável:** O framework é generalizado para outras empresas farmacêuticas.

### 12.6 Limitações

- **N=1:** Estudo de caso único — generalização limitada.
- **Contexto egípcio:** Estrutura de custos pode diferir significativamente de mercados europeus ou americanos.
- **Piloto, não produção:** O piloto pode não capturar todos os custos de escala.
- **Sem avaliação técnica rigorosa:** Foco em custos; detalhes técnicos da implementação não documentados.

### 12.7 Relevância para o CargoChain

Este paper é importante para a **justificação económica** do protótipo no relatório:

1. **Argumento de ROI:** O break-even de 18-24 meses e ROI positivo a partir do 3º ano é um argumento forte para investimento.
2. **Cold chain como business case:** A maior componente de ROI é cold chain — que é exatamente o que o `MerkleIoT.sol` do CargoChain resolve.
3. **Custo de gas:** Os €5.000–15.000/ano em gas são uma limitação real — relevante para discutir L2 solutions como Arbitrum como trabalho futuro.
4. **Custos de monitorização:** A redução de 70-80% em custos de monitorização justifica o investimento em automação por smart contract.

---

<a name="paper-13"></a>
## Paper 13 — Sarkar (2023)

**Referência completa:**  
Sarkar, S. (2023). *Blockchain for combating pharmaceutical drug counterfeiting and cold chain distribution*. Asian Journal of Research in Computer Science, 16(4), 1–15. (Disponível em SSRN). **32 citações.**

---

### 13.1 Contexto e Motivação

Este paper combina os dois desafios mais críticos em supply chain farmacêutica num único framework: **anti-contrafação + cold chain**. A motivação é que na prática, estes dois problemas são inseparáveis — um medicamento pode ser genuíno mas inutilizável (ou perigoso) por falha de cold chain, ou pode ser uma cópia perfeita mas contrafeito. A solução deve abordar ambos.

### 13.2 Questão de Investigação

> *Como pode um mecanismo blockchain com sensores IoT combinar rastreabilidade de distribuição cold chain com prevenção de contrafação num único sistema coerente?*

### 13.3 Metodologia

- Design de arquitetura blockchain-enabled para cold chain farmacêutica
- Análise de casos de contrafação e falhas de cold chain na literatura
- Proposta de sistema combinado com Ethereum + sensores IoT
- Avaliação qualitativa de segurança e viabilidade

### 13.4 Arquitetura do Sistema

**Dois subsistemas integrados:**

**Subsistema 1 — Anti-contrafação:**
- Identificação única por serialização + hash criptográfico (similar ao Paper 10/PharmaChain)
- QR code em packaging com hash do medicamento
- Blockchain regista cada transferência de propriedade
- Verificação de autenticidade em qualquer ponto

**Subsistema 2 — Cold Chain com IoT:**
- Sensores de temperatura integrados no packaging ou contêiner
- Threshold-based alerts: temperatura máxima e mínima configuráveis por tipo de medicamento
- Dados enviados via MQTT para gateway; gateway submete a Ethereum
- Smart contract `ColdChainMonitor`:
  - Armazena todas as leituras de temperatura com timestamp e localização
  - Verifica continuamente se temperatura está dentro dos limites
  - Em excursão: emite evento `TemperatureViolation`
  - Regista quem era o responsável pelo transporte no momento da excursão (accountability)

**Integração dos dois subsistemas:**
- Um medicamento é considerado "entregável" se E SOMENTE SE:
  1. Hash verifica (anti-contrafação OK)
  2. Histórico de temperatura sem violações (cold chain OK)
- Ambas as condições verificadas pelo smart contract antes de permitir confirmação de entrega

**Accountability automática:**
- Sistema regista automaticamente qual transportador era responsável durante cada excursão de temperatura
- Permite distribuição automática de responsabilidade em disputas de seguro/responsabilidade

### 13.5 Resultados e Contribuições

- **Integração coerente:** Framework único que combina anti-contrafação + cold chain com lógica de decisão integrada.
- **Accountability automática:** Contribuição única — rastreabilidade de responsabilidade em excursões de temperatura.
- **Modelo de "entregabilidade":** Formalização da condição de entrega (hash AND cold chain) como requisito duplo.
- **Aplicável a vacinas:** Especialmente relevante em contexto pós-COVID para supply chain de vacinas.

### 13.6 Limitações

- **Implementação limitada:** Paper mais conceitual que técnico — falta detalhe de implementação.
- **Performance não avaliada:** Sem análise de throughput, latência ou custo de gas.
- **N sensores:** Não especifica quantos sensores por contêiner nem frequência de amostragem ideal.
- **Conectividade:** Não aborda o problema de conectividade intermitente durante transporte.

### 13.7 Relevância para o CargoChain

Este paper é a melhor referência teórica para a **lógica combinada anti-contrafação + cold chain** do CargoChain:

| Conceito do Paper 13 | Equivalente no CargoChain |
|---|---|
| `ColdChainMonitor` | `MerkleIoT.sol` |
| `TemperatureViolation` event | Evento emitido por `MerkleIoT.sol` |
| Condição dupla (hash AND cold chain) | Lógica de verificação em `ConsignmentRegistry.sol` |
| Accountability do transportador | Registo de custódia em `ConsignmentRegistry.sol` |
| Anti-contrafação por hash | Hash do consignamento em `ConsignmentRegistry.sol` |

**Citação recomendada:** Usar para justificar o design da condição dupla de entrega no CargoChain — um consignamento só é aceite se tanto a identidade (DIDs/VC) quanto as condições de cold chain (MerkleIoT) forem verificadas.

---

<a name="paper-14"></a>
## Paper 14 — Zeng et al. (2024)

**Referência completa:**  
Zeng, W., Wang, Y., Liang, K., & Li, J. (2024). *Advancing emergency supplies management: a blockchain-based traceability system for cold-chain medicine logistics*. Advanced Theory and Applications (Wiley), 2024. **27 citações.**

---

### 14.1 Contexto e Motivação

Este paper aborda um caso de uso específico e urgente: a **logística de emergência médica** com cold chain. O contexto é a gestão de reservas estratégicas de medicamentos (antibióticos, antivirais, vacinas para emergências) onde falhas de cold chain durante distribuição de emergência (epidemias, desastres naturais) podem ter consequências fatais.

Motivado diretamente pela experiência da COVID-19, onde a distribuição de vacinas a -70°C (Pfizer-BioNTech) expôs a fragilidade da infraestrutura de cold chain global.

### 14.2 Questão de Investigação

> *Como pode um sistema blockchain com dispositivos IoT garantir integridade da cold chain durante logística de emergência de medicamentos, onde a velocidade de resposta e a confiabilidade dos dados são críticas?*

### 14.3 Metodologia

- Análise de falhas de cold chain durante COVID-19 (dados reais)
- Design de arquitetura para emergências médicas com requisitos específicos (speed, reliability)
- Implementação em Hyperledger Fabric (permissionada, por razões de performance)
- Integração com dispositivos IoT de temperatura
- Avaliação de performance em cenário simulado de emergência

### 14.4 Arquitetura do Sistema

**Por que Hyperledger Fabric (não Ethereum)?**
O paper justifica explicitamente a escolha: em logística de emergência, latência de 15-30 segundos do Ethereum é inaceitável. Hyperledger Fabric com Raft consensus oferece:
- Throughput: 2000+ TPS
- Latência: < 1 segundo por transação
- Finality determinística (crítico para decisões de emergência)

**Componentes:**

**IoT Layer:**
- Sensores de temperatura certificados (precisão ±0.1°C) em contêineres criogénicos
- GPS tracking em tempo real (atualização a cada 30 segundos)
- Transmissão via 4G/5G com fallback para satellite (para cobertura global de emergência)

**Blockchain Layer (Hyperledger Fabric):**
- Canal dedicado para cada operação de emergência
- Chaincode `EmergencySupplyChain`:
  - `initSupply()` — ativar reserva estratégica
  - `updateLocation()` — atualizar posição GPS
  - `logTemperature()` — registar leitura de sensor
  - `verifyIntegrity()` — verificar se toda a cadeia de custódia manteve temperatura correta
  - `emergencyAlert()` — alerta imediato em caso de falha de cold chain
- Endorsement policy: 2-of-3 (fabricante, autoridade de saúde, transportador) para decisões críticas

**Management Layer:**
- Dashboard de monitorização em tempo real para autoridades de saúde
- Sistema de alerta automático (SMS, email, push notification) em caso de excursão de temperatura
- Analytics: mapa de calor de riscos de cold chain por rota geográfica

### 14.5 Resultados e Contribuições

- **Performance para emergências:** Latência média de 0.8s por transação — adequada para logística de emergência.
- **Cobertura geográfica:** Integração com satellite IoT resolve problema de conectividade em locais remotos.
- **Analytics de risco:** Mapa de risco de rotas baseado em histórico de incidentes — contribuição nova.
- **Endorsement policy robusto:** A política 2-of-3 garante que nenhum ator único pode validar falsamente uma transação.
- **Aplicação COVID-19:** Caso de uso validado com dados reais de distribuição de vacinas em 2021.

### 14.6 Limitações

- **Hyperledger Fabric:** Menos acessível que Ethereum para novos participantes — requer infraestrutura dedicada.
- **Custo de satellite IoT:** Cobertura global via satélite é cara — viável para emergências, não para uso comercial quotidiano.
- **Centralização relativa:** Fabric é menos descentralizado que Ethereum público.
- **Sem DID/VC:** Identidade baseada em certificados X.509 da CA do Fabric.

### 14.7 Relevância para o CargoChain

| Conceito do Paper 14 | Equivalente no CargoChain |
|---|---|
| `logTemperature()` chaincode | `MerkleIoT.sol::submitBatch()` |
| `verifyIntegrity()` | Verificação de Merkle proof em `MerkleIoT.sol` |
| `emergencyAlert()` | Evento de threshold violation em smart contract |
| Endorsement policy 2-of-3 | Dupla confirmação em `ConsignmentRegistry.sol` |
| Dashboard de monitorização | Dashboard do transportador no CargoChain |
| GPS tracking | Dados GPS no payload do oracle IoT simulador |

**Comparação de escolha tecnológica:** O CargoChain usa Ethereum (pública, descentralizada, acessível) enquanto o Paper 14 usa Hyperledger Fabric (permissionada, alta performance). Esta é uma diferença arquitetural importante a discutir no relatório — trade-off entre descentralização e performance.

---

<a name="paper-15"></a>
## Paper 15 — Esperança et al. (2025)

**Referência completa:**  
Esperança, M., Correia, R., et al. (2025). *Blockchain-Based System for Monitoring Vaccine Transportation with Temperature Sensing*. 2025 IEEE International Conference on Distributed Computing Systems (ou similar). **Recente — citações em acumulação.**

---

### 15.1 Contexto e Motivação

Este é o paper mais recente do conjunto (2025) e o mais próximo geograficamente do contexto do CargoChain — com autores com nomes portugueses e publicado em conferência europeia IEEE. O foco é especificamente no **transporte de vacinas** com monitorização de temperatura, o caso de uso mais crítico de cold chain farmacêutica.

O contexto de motivação é duplo:
1. **Post-COVID:** A pandemia demonstrou que sistemas de transporte de vacinas sem monitorização adequada causam perdas massivas e risco de saúde pública.
2. **Regulação europeia:** A Estratégia Farmacêutica da UE (2020+) e a ENISA enfatizam necessidade de sistemas digitais seguros para supply chain de medicamentos críticos.

### 15.2 Questão de Investigação

> *Como pode um sistema blockchain integrado com sensores de temperatura garantir integridade do transporte de vacinas, com rastreabilidade completa e alertas em tempo real, no contexto regulatório europeu?*

### 15.3 Metodologia

- Design e implementação de sistema blockchain para transporte de vacinas
- Integração com sensores de temperatura (hardware real ou protótipo)
- Deploy em Ethereum testnet (provavelmente Sepolia ou Goerli, dada a data 2025)
- Avaliação em cenário de transporte simulado
- Alinhamento com regulação europeia (FMD, MDR, EUDAMED)

### 15.4 Arquitetura do Sistema

**Infraestrutura de sensores:**
- Sensores de temperatura compactos integrados em contêineres de vacinas
- Comunicação via BLE (Bluetooth Low Energy) ou Zigbee para gateway local
- Gateway transmite para blockchain via HTTPS/Web3

**Smart contracts:**
- Registo de cada lote de vacinas com parâmetros de cold chain (temperatura mín/máx, requisitos)
- Monitorização contínua de temperatura durante transporte
- Alertas automáticos em caso de excursão de temperatura
- Rastreabilidade de todo o percurso: fabricante → hub de distribuição → ponto de vacinação

**Contexto europeu:**
- Alinhamento explícito com Falsified Medicines Directive (FMD 2011/62/EU)
- Consideração do EUDAMED (European Database on Medical Devices)
- Privacidade de dados alinhada com GDPR
- Possível referência ao EBSI (European Blockchain Services Infrastructure)

**Inovação potencial (2025):**
- Dada a data, o paper pode usar Ethereum PoS (pós-Merge 2022) — aproveitando menor consumo energético
- Possível uso de ERC standards modernos (ERC-4337 Account Abstraction para simplificar UX)
- Possível integração com W3C DID standards (evolução desde 2021)

### 15.5 Resultados e Contribuições

- **Contexto europeu:** Um dos poucos papers com alinhamento explícito à regulação europeia (FMD, GDPR).
- **Vacinas como caso crítico:** Demonstração com o tipo de produto com requisitos de cold chain mais exigentes.
- **Muito recente (2025):** Incorpora lições da distribuição de vacinas COVID-19 e usa tecnologias mais maduras.
- **IEEE International:** Revisão por pares rigorosa — high quality threshold.
- **Autores europeus:** Perspetiva regulatória e cultural relevante para Portugal/ISCTE.

### 15.6 Limitações

- **Acesso limitado:** Paper muito recente, pode não estar amplamente disponível.
- **Escala não avaliada:** Protótipo académico — escalabilidade para uso nacional não demonstrada.
- **Detalhes técnicos:** Sendo uma conferência, o paper pode ser mais curto (8-10 páginas) e menos detalhado que um journal paper.

### 15.7 Relevância para o CargoChain

Este paper é especialmente importante por três razões únicas:

1. **Contexto europeu/português:** Diretamente relevante para justificar o caso de uso do CargoChain no contexto da UE e de Portugal (INFARMED, FMD).
2. **Stack tecnológica atual:** Sendo de 2025, usa a mesma geração de ferramentas que o CargoChain (Ethereum PoS, Hardhat/Foundry, etc.).
3. **Vacinas + temperatura:** O caso de uso mais exigente — se blockchain funciona para vacinas, funciona para medicamentos menos críticos.

| Conceito do Paper 15 | Equivalente no CargoChain |
|---|---|
| Sensores temperatura + BLE gateway | `iot-oracle-simulator.ts` |
| Smart contract monitorização vacinas | `MerkleIoT.sol` |
| Alinhamento FMD | Mencionado em CASE_STUDIES.md |
| Contexto europeu | Use case do CargoChain (Portugal, INFARMED) |
| Ethereum testnet (Sepolia) | CargoChain usa Ethereum Sepolia |

**Citação estratégica:** Este é o paper mais recente e geograficamente próximo — usar como "estado da arte mais atual" no início do SOTA para demonstrar que a investigação está ativa e crescente mesmo em 2025.

---

<a name="sintese"></a>
## Síntese Comparativa dos 15 Papers

### Tabela de análise multi-dimensional

| # | Paper | Tipo | Blockchain | IoT | DIDs/VC | Cold Chain | Anti-Contraf. | Performance | Contexto |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Musamih et al. | Sistema | Eth+Fabric | ✓ parcial | ✗ | ✓ parcial | ✓✓ | ~1000 TPS | EUA/global |
| 2 | Uddin | Sistema | HLF | ✗ | ✗ | ✗ | ✓✓ | ~2000 TPS | EUA |
| 3 | Liu et al. | Sistema | Ethereum | ✓✓ | ✗ | ✓✓ | ✓ | ~150 TPS | Global |
| 4 | Singh et al. | Sistema | Ethereum | ✓✓ | ✗ | ✓✓ | ✓✓ | ~15 TPS | Global |
| 5 | Ghadge et al. | Review | Multi | ✓ | ✗ | ✓ | ✓ | N/A | Global |
| 6 | Nanda et al. | Sistema | Ethereum | ✓✓ | ✗ | ✓ | ✓✓ | ~30 TPS | Global |
| 7 | Bandhu et al. | Sistema | Ethereum | ✗ | ✗ | ✗ | ✓✓ | Ganache | India |
| 8 | Abdallah et al. | Sistema | Ethereum | ✗ | ✗ (NFT) | ✗ | ✓ | Rinkeby | UAE |
| 9 | Akram et al. | Review | Multi | ✓ | ✗ | ✓ | ✓ | N/A | Global |
| 10 | Gomasta et al. | Sistema | Ethereum | ✗ | ✗ | ✗ | ✓✓ | Ganache | Bangladesh |
| 11 | Badhotiya et al. | Adoção | Multi | ✗ | ✗ | ✗ | ✓ | N/A | India |
| 12 | Gruchmann et al. | Económico | Piloto | ✓ | ✗ | ✓ | ✓ | N/A | Egito |
| 13 | Sarkar | Sistema | Ethereum | ✓✓ | ✗ | ✓✓ | ✓✓ | Conceitual | Asia |
| 14 | Zeng et al. | Sistema | HLF | ✓✓ | ✗ | ✓✓ | ✓ | ~2000 TPS | China/global |
| 15 | Esperança et al. | Sistema | Ethereum | ✓✓ | ✓? | ✓✓ | ✓ | Testnet | EU/PT |
| **CargoChain** | **Protótipo** | **Ethereum** | **✓✓** | **✓✓** | **✓✓** | **✓✓** | **Sepolia** | **EU/PT** |

*Legenda: ✓✓ = implementado com detalhe; ✓ = mencionado/parcial; ✗ = ausente; HLF = Hyperledger Fabric*

---

### Gap analysis: o que o CargoChain acrescenta

Analisando os 15 papers, identificam-se **três gaps** que o CargoChain preenche de forma única:

**Gap 1 — Identidade descentralizada (DIDs/Verifiable Credentials):**
Nenhum dos 15 papers implementa DIDs + VCs para identidade dos atores da supply chain. Todos usam ou certificados X.509 (Hyperledger Fabric) ou endereços Ethereum sem verificação de identidade. O CargoChain é pioneiro ao usar `DIDRegistry.sol` + `CarrierCredential.sol` para gestão descentralizada e portável de identidade de transportadores.

**Gap 2 — Merkle trees para dados IoT:**
Nenhum dos 15 papers resolve o problema da confiança no gateway IoT usando Merkle trees. O CargoChain usa `MerkleIoT.sol` para submeter Merkle roots de batches de leituras IoT, permitindo verificação individual de qualquer leitura sem confiar no oracle — um avanço técnico claro face ao estado da arte.

**Gap 3 — Contexto europeu/regulatório com FMD:**
Apenas o Paper 15 (Esperança et al., 2025) aborda explicitamente o contexto regulatório europeu. O CargoChain, desenvolvido no contexto do ISCTE (Portugal), tem alinhamento natural com a FMD, o INFARMED, e o GDPR.

---

### Mapa de citações recomendadas para o relatório

| Secção do relatório | Papers a citar |
|---|---|
| Introdução / motivação | 1, 4, 9, 13 |
| Estado da arte (abertura) | 5, 9 (reviews) |
| Problema dos medicamentos contrafeitos | 1, 2, 4, 10, 13 |
| Cold chain e IoT | 3, 4, 13, 14, 15 |
| Smart contracts em pharma | 1, 2, 7, 8 |
| Identidade (gap DIDs) | 2, 6, 7 (para mostrar o que não existe) |
| Hyperledger Fabric vs Ethereum | 2, 14 |
| Contexto europeu e regulação FMD | 5, 9, 15 |
| Limitações e trabalho futuro | 9, 11, 12 |
| Comparação com o CargoChain | 3, 7, 10 (arquiteturas mais próximas) |

---

### Classificação para o SOTA do relatório

Com base na análise, os 15 papers podem ser agrupados em:

**Grupo A — Essenciais (incluir todos no SOTA):**
Papers 1, 2, 3, 4, 5 — os mais citados, mais completos, e com maior impacto no campo.

**Grupo B — Importantes (incluir os mais relevantes):**
Papers 6, 7, 8, 13, 14, 15 — abordagens específicas com alta relevância para o CargoChain.

**Grupo C — Complementares (referenciar seletivamente):**
Papers 9, 10, 11, 12 — reviews e análises de adoção, úteis para contextualização e discussão.

---

*Análise elaborada para suporte ao SOTA do projeto CargoChain — Blockchain & DLT @ ISCTE, maio 2026.*

---

---

# SUPLEMENTO — Análise de Documentos Adicionais

> **Nota metodológica importante:** Os três documentos analisados nesta secção são documentos gerados por IA (ChatGPT e Gemini), não papers peer-reviewed. Não devem ser citados diretamente no relatório académico como fontes primárias. O seu valor está em: (1) identificar papers reais com DOIs verificáveis que não constavam nos 15 originais; (2) sintetizar padrões de SOTA de forma estruturada que pode servir de guia de leitura; (3) formular críticas ao protótipo CargoChain a partir de perspetiva industrial. Toda a informação factual utilizada no relatório deve ser verificada nas fontes primárias referenciadas.

---

## S1 — Novos Papers com DOIs Verificáveis (não incluídos nos 15 originais)

Os documentos analisados, em particular o documento "Blockchain e IoT no transporte farmacêutico em contentores", identificam 11 papers adicionais com DOIs verificáveis que complementam a análise do SOTA de forma significativa. Estão organizados por cluster temático.

---

### S1.1 — Cluster: Arquitetura Híbrida On-chain / Off-chain + EPCIS

**Li, X., et al. (2022).** *A Blockchain-Based Product Traceability System with Off-Chain EPCIS and IoT Device Authentication.* Sensors, 22(22), 8680.  
DOI: https://www.mdpi.com/1424-8220/22/22/8680

Este paper é particularmente valioso porque combina, num só artigo, três componentes raramente integrados na literatura: Hyperledger Fabric, repositório EPCIS off-chain, e autenticação/autorização de dispositivos IoT. Os autores defendem que apenas informação-chave e não sensível deve ficar on-chain, enquanto o grosso dos dados permanece num repositório EPCIS ligado por hashes e um serviço de descoberta de endereços EPCIS. Adicionalmente, apenas dispositivos autenticados podem carregar eventos originais para o repositório. **Relevância para CargoChain:** sustenta diretamente o padrão EPCIS como plano de dados, autenticação de fonte, e associação segura entre prova on-chain e conteúdo off-chain — lacuna identificada no protótipo atual.

---

**Fernández-Iglesias, M.J., et al. (2024).** *Efficient Traceability Systems with Smart Contracts: Balancing On-Chain and Off-Chain Data Storage for Enhanced Scalability and Privacy.* Applied Sciences, 14(23), 11078.  
DOI: https://doi.org/10.3390/app142311078

Compara explicitamente dois cenários: hash-only on-chain com detalhe off-chain vs. armazenamento completo on-chain. Conclui que o modelo híbrido reduz custos, melhora privacidade e mantém integridade, desde que o armazenamento off-chain seja confiável e verificável. **Relevância para CargoChain:** uma das melhores justificações académicas para a decisão de usar WORM off-chain + ancoragem criptográfica, em vez de colocar todos os dados IoT na cadeia.

---

### S1.2 — Cluster: IoT + Cold Chain + Smart Contracts

**Vilas Boas, N., et al. (2025).** *Coldnet: Vaccine Logistics Tracking by Integrating the Internet of Things and Smart Contracts.* Blockchain: Research and Applications.  
DOI: https://doi.org/10.1016/j.bcra.2025.100386

Coldnet junta atestação de dispositivos IoT, registo imutável, cláusulas de monitorização geridas por smart contracts, e avaliação de custo/desempenho. Reporta atraso médio de ~20 segundos para registo e verificação de condições; custo de ~US$1,51 para dez lotes com cinco propriedades monitorizadas. **Relevância para CargoChain:** é a fonte académica mais direta para IoT attestation + automação de cláusulas de cold chain + custo observável — os três elementos que `MerkleIoT.sol` implementa parcialmente mas sem benchmarks publicados.

---

**Duman, B., et al. (2025).** *Enhancing Traceability and Reliability in Cold Chain Logistics Through Hyperledger Fabric and IoT.* Applied Sciences, 15(22), 12149.  
DOI: https://www.mdpi.com/2076-3417/15/22/12149

Implementação com Hyperledger Fabric e IoT onde a função `logEnvironmentData` regista temperatura, humidade, timestamp e localização, criando uma trilha temporal imutável de condições ambientais. Mostra um caminho empresarial plausível usando rede permissionada para logística de frio. **Relevância para CargoChain:** sustenta a escolha de redes permissionadas para captura de exceções e eventos de qualidade na cadeia de frio; ponto de comparação direto com a abordagem de rede pública (Ethereum Sepolia) usada no CargoChain.

---

### S1.3 — Cluster: Falhanço do TradeLens e Governação de Ecossistemas

**Najati, H. (2025).** *Exploring the failure factors of blockchain adopting projects: a case study of TradeLens through the lens of commons theory.* Frontiers in Blockchain.  
DOI: https://doi.org/10.3389/fbloc.2025.1503595

Estudo de caso essencial: trata o falhanço do TradeLens como problema de ecossistema e não de engenharia. Destaca falta de buy-in dos stakeholders, relutância em partilhar dados com uma entidade percecionada como lucrativa/central (Maersk+IBM), rigidez da governação e incapacidade de atingir viabilidade comercial. **Relevância para CargoChain:** fornece evidência direta para justificar neutralidade institucional, incentivos e governação multilateral no desenho do relatório.

---

**Hanisch, M., Roozen, P., & Theodosiadis, V. (2026).** *Success and Failure in Blockchain-Based Interorganizational Ecosystems: A Governance Perspective.* Academy of Management Journal.  
DOI: https://doi.org/10.1177/01492063261420752

Compara 81 projetos blockchain interorganizacionais em 25 indústrias e identifica três trade-offs de governação: consistência vs. flexibilidade; reliance no sistema vs. reliance nos atores; utilidade do ecossistema vs. utilidade dos membros. É uma das evidências mais fortes de que o sucesso de um ecossistema blockchain depende menos do protocolo e mais de como a governação distribui custos, benefícios, controlo e capacidade de adaptação. **Relevância para CargoChain:** excelente fonte para defender governação híbrida e incentivos ex ante no relatório.

---

**Greiner, M., et al. (2024).** *Governance Requirements for Dezentralized Blockchain-based Supply Chain Consortia.* Wirtschaftsinformatik 2024.  
DOI: https://aisel.aisnet.org/wi2024/58/

Deriva 24 requisitos de governação para consórcios blockchain a partir de revisão da literatura, entrevistas com especialistas, focus group e inquérito. Desloca a discussão de "qual blockchain?" para "quais papéis, regras, incentivos, estruturas e processos decisórios?". **Relevância para CargoChain:** fornece material direto para desenhar operating model, comissões, regras de adesão e incentivos de partilha no relatório.

---

### S1.4 — Cluster: DIDs, VCs e Selective Disclosure

**Ramić, A., et al. (2024).** *Selective disclosure in digital credentials: A review.* ICT Express.  
DOI: https://doi.org/10.1016/j.icte.2024.05.011

Revisão que organiza o campo da divulgação seletiva em credenciais digitais, descrevendo a evolução cronológica, as famílias de métodos e os trade-offs entre privacidade, utilidade e complexidade. Evita visão "evangelista" das ZK proofs e mostra que diferentes mecanismos respondem a necessidades diferentes. **Relevância para CargoChain:** justifica porque é que relatórios a seguradoras, inspetores e clientes devem expor só atributos selecionados e não o histórico total — aplica-se diretamente à `CarrierCredential.sol`.

---

**Flamini, V., et al. (2024).** *On Cryptographic Mechanisms for the Selective Disclosure of Verifiable Credentials.* arXiv / CCS'25.  
DOI: https://doi.org/10.48550/arXiv.2401.08196

Compara duas famílias de mecanismos para divulgação seletiva: esquemas baseados em hiding commitments vs. esquemas baseados em provas ZK não interativas, incluindo BBS signatures. Inclui comparação de maturidade de normalização, agilidade criptográfica, segurança quântica, unlinkability, provas de predicados e custos de geração/verificação. **Relevância para CargoChain:** fornece base técnica para escolher BBS ou mecanismo equivalente em cenários de inspeção seletiva.

---

**Mazzocca, C., et al. (2024).** *EVOKE: Efficient Revocation of Verifiable Credentials in IoT Networks.* USENIX Security 2024.  
URL: https://www.usenix.org/system/files/usenixsecurity24-mazzocca.pdf

Ataca um problema frequentemente ignorado nas arquiteturas SSI: a revogação eficiente de credenciais em redes IoT com conectividade e recursos limitados. Usa acumuladores ECC para suportar revogação com baixo custo computacional, incluindo revogação em massa e cenários offline. **Relevância para CargoChain:** uma das poucas fontes fortes sobre como revogar credenciais de sensores, gateways ou certificados de conformidade — lacuna presente no `DIDRegistry.sol` atual.

---

**Ramírez-Gordillo, J.J., et al. (2025).** *Decentralized Identity Management for Internet of Things Devices Using IOTA Blockchain Technology.* Future Internet, 17(1), 49.  
DOI: https://doi.org/10.3390/fi17010049

Proof of concept de identidade descentralizada para dispositivos IoT com DIDs, VCs e componentes do ecossistema IOTA, validada em dispositivos com recursos limitados. Mostra que identidades descentralizadas para sensores e gateways são tecnicamente exequíveis em ambientes restritos, com ganhos em escalabilidade, privacidade e gestão de chaves. **Relevância para CargoChain:** boa referência para a parte "DID for things", com a ressalva de privilegiar interoperabilidade W3C acima do lock-in de uma stack específica.

---

### Tabela-resumo dos novos papers

| Paper | Ano | Contributo principal para o SOTA | DOI |
|---|---|---|---|
| Li et al. | 2022 | EPCIS off-chain + Fabric + autenticação IoT | mdpi.com/1424-8220/22/22/8680 |
| Fernández-Iglesias et al. | 2024 | On-chain vs off-chain: justificação WORM híbrido | 10.3390/app142311078 |
| Vilas Boas et al. (Coldnet) | 2025 | IoT attestation + SLA contracts + benchmarks cold chain | 10.1016/j.bcra.2025.100386 |
| Duman et al. | 2025 | Hyperledger Fabric + IoT cold chain, rede permissionada | mdpi.com/2076-3417/15/22/12149 |
| Najati | 2025 | Estudo de caso TradeLens — governação como causa de falhanço | 10.3389/fbloc.2025.1503595 |
| Hanisch et al. | 2026 | 81 projetos: trade-offs de governação em ecossistemas blockchain | 10.1177/01492063261420752 |
| Greiner et al. | 2024 | 24 requisitos de governação para consórcios blockchain | aisel.aisnet.org/wi2024/58/ |
| Ramić et al. | 2024 | Revisão de selective disclosure em credenciais digitais | 10.1016/j.icte.2024.05.011 |
| Flamini et al. | 2024 | Comparação criptográfica BBS vs ZK para VCs | 10.48550/arXiv.2401.08196 |
| Mazzocca et al. (EVOKE) | 2024 | Revogação eficiente de VCs em redes IoT | usenix.org/…usenixsecurity24-mazzocca.pdf |
| Ramírez-Gordillo et al. | 2025 | DID/VC para dispositivos IoT com IOTA | 10.3390/fi17010049 |

---

## S2 — O "Caso TradeLens": Síntese para o Relatório

O falhanço do TradeLens em novembro de 2022 é o caso de estudo mais citado sobre os limites dos ecossistemas blockchain em logística, e deve ser incluído no SOTA do relatório. A síntese abaixo consolida o que os documentos analisados e a literatura académica (Najati 2025, Hanisch et al. 2026) identificam como causas e lições.

### S2.1 — O que foi o TradeLens

TradeLens foi uma plataforma blockchain de rastreabilidade de contentores marítimos lançada em 2018 por Maersk (maior transportadora marítima do mundo) e IBM. Prometia digitalizar a documentação do comércio global — bills of lading, certificados de origem, dados de carga — e eliminar ineficiências burocráticas. Chegou a integrar mais de 300 organizações, incluindo terminais, autoridades portuárias, alfândegas e transportadoras. Foi descontinuada em novembro de 2022 por "falta de viabilidade comercial".

### S2.2 — Anatomia do Falhanço ("TradeLens Trap")

| Fator de falhanço | Descrição |
|---|---|
| **Operador = concorrente** | A plataforma era controlada por Maersk, concorrente direto das outras transportadoras. MSC, CMA CGM e Hapag-Lloyd recusaram-se a partilhar dados numa plataforma que beneficiava um rival. |
| **Desequilíbrio de incentivos** | Os dados partilhados pelas transportadoras beneficiavam Maersk mais do que os membros individuais — utilidade do ecossistema vs. utilidade dos membros. |
| **Rigidez de governação** | Regras e decisões de atualização eram controladas centralmente por Maersk/IBM; outros membros tinham poder de voto limitado. |
| **Vendor lock-in** | Construído sobre Hyperledger Fabric com customizações IBM; custo de saída elevado para membros. |
| **Modelo de negócio não validado** | O modelo de receita nunca se provou sustentável para cobrir os custos de operação e dar retorno aos membros. |
| **Ausência de padrões abertos** | Interoperabilidade com outras plataformas era limitada; os dados não eram portáveis em formato standard. |

### S2.3 — Contraste: PharmaLedger Association como contra-exemplo

O contraste mais citado com o TradeLens no domínio farmacêutico é a **PharmaLedger Association**, consórcio sem fins lucrativos com sede na Suíça, fundado com apoio da indústria farmacêutica (Roche, Novartis, Pfizer, entre outros) e da academia:

| Dimensão | TradeLens | PharmaLedger |
|---|---|---|
| Estrutura jurídica | Joint venture IBM + Maersk | Associação sem fins lucrativos |
| Governação | Controlada pelos fundadores | Multilateral, membros com voto igual |
| Padrões | Proprietários (Hyperledger customizado) | OpenDSU (standard aberto) |
| Conflito de interesses | Operador = concorrente direto | Operador é entidade neutra |
| Interoperabilidade | Limitada | Prioritária desde o início |
| Estado atual | Encerrado (2022) | Em operação |

### S2.4 — Lições para o Design do CargoChain

A literatura sobre o TradeLens oferece quatro lições diretas para o desenho de sistemas blockchain em logística farmacêutica:

1. **Neutralidade institucional é condição necessária:** O operador da plataforma não pode ser concorrente dos participantes. Modelo de governação off-chain com entidade neutra (associação, fundação, ou consórcio regulatório).
2. **Incentivos simétricos:** Cada membro deve beneficiar proporcionalmente ao que contribui. Modelos de tokenomics e partilha de valor devem ser explicitamente desenhados.
3. **Padrões abertos desde o início:** Dados em formato standard (EPCIS 2.0, W3C VC/DID) garantem portabilidade e reduzem o custo de saída — condição para adesão de concorrentes.
4. **Separação clara entre "quem opera" e "quem beneficia":** A infraestrutura deve ser utilidade partilhada; a vantagem competitiva dos membros vem dos seus próprios serviços sobre essa infraestrutura.

---

## S3 — Arquitetura SOTA Híbrida Recomendada

Os documentos analisados convergem para uma arquitetura de seis componentes que representa o estado da arte para transporte farmacêutico em contentores. Esta arquitetura integra os contributos dos 15 papers originais com os novos papers identificados e as normas regulatórias relevantes.

### S3.1 — Os Seis Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│              ARQUITETURA SOTA — TRANSPORTE FARMACÊUTICO         │
├────────────────────┬────────────────────────────────────────────┤
│ CAMADA             │ COMPONENTES                                 │
├────────────────────┼────────────────────────────────────────────┤
│ 1. IoT + Sensores  │ Sensores qualificados (temperatura,         │
│                    │ humidade, GPS, choques) com elemento        │
│                    │ seguro (SE/TPM/eSIM). Protocolo MQTT para   │
│                    │ envio. Apenas dispositivos atestados        │
│                    │ carregam dados (NIST SP 1800-36B).          │
├────────────────────┼────────────────────────────────────────────┤
│ 2. Gateway + EPCIS │ Gateway agrega leituras IoT em eventos      │
│                    │ EPCIS 2.0 (sensorReport, deviceMetadata,    │
│                    │ rawData). EPCIS é o modelo canónico de      │
│                    │ dados operacionais (FDA DSCSA).             │
├────────────────────┼────────────────────────────────────────────┤
│ 3. Off-chain WORM  │ Payloads EPCIS completos em armazenamento   │
│                    │ imutável (Object Lock / WORM). Certificados │
│                    │ de calibração, logs, relatórios de excursão.│
│                    │ Exigido por GDP UE + Annex 11 + MHRA.      │
├────────────────────┼────────────────────────────────────────────┤
│ 4. Merkle Batching │ Leituras IoT agrupadas por contentor/       │
│                    │ intervalo temporal. Apenas a raiz de Merkle │
│                    │ é ancorada on-chain. Provas por leitura     │
│                    │ mantidas off-chain para auditoria.          │
├────────────────────┼────────────────────────────────────────────┤
│ 5. L2 / Blockchain │ Smart contracts para: ancoragem de hashes,  │
│                    │ transferências de custódia, alertas de      │
│                    │ excursão, DIDs/VCs de participantes.        │
│                    │ L2 EVM (Arbitrum/zkSync) para custo/escala. │
├────────────────────┼────────────────────────────────────────────┤
│ 6. VC/DID + Prova  │ Credenciais verificáveis W3C para           │
│    Regulatória     │ transportadores, sensores, inspeções.       │
│                    │ BBS signatures para selective disclosure    │
│                    │ com reguladores, seguradoras, clientes.     │
└────────────────────┴────────────────────────────────────────────┘
```

### S3.2 — Mapeamento desta Arquitetura vs. CargoChain

| Componente SOTA | CargoChain atual | Gap |
|---|---|---|
| IoT qualificado + SE/TPM | Simulador IoT (sem hardware real) | Sem atestação de hardware; sem elemento seguro |
| Gateway EPCIS 2.0 | Não implementado | **Gap crítico:** ausência de EPCIS como modelo de dados |
| Off-chain WORM | IPFS (não imutável por design) | IPFS mutável; sem garantia de retenção regulatória |
| Merkle batching | `MerkleIoT.sol` (implementado) | ✅ Presente; faltam benchmarks de custo/latência |
| L2 / Ethereum | Sepolia testnet (L1) | L1 pública com custo de gas real; sem L2 |
| VC/DID para participantes | `DIDRegistry.sol` + `CarrierCredential.sol` | ✅ Presente; falta revogação e selective disclosure |
| Governação neutra | Não endereçado | **Gap de design:** necessária definição de operating model |

---

## S4 — Crítica Externa ao CargoChain (Perspetiva Industrial)

O documento "Blockchain no transporte farmacêutico em contentores" elabora uma análise crítica do protótipo CargoChain a partir de perspetiva industrial e regulatória. Esta análise é útil para o relatório na secção de limitações e trabalho futuro.

### S4.1 — Gaps Técnicos Identificados

| Gap | Descrição | Norma violada |
|---|---|---|
| **Ausência de EPCIS** | O CargoChain não usa EPCIS 2.0 como modelo de dados; os eventos de rastreabilidade não são interoperáveis | GS1 EPCIS 2.0, FDA DSCSA |
| **Sem validação GxP** | Não há validação dos sensores IoT como equipamento qualificado | GDP UE, Annex 11, MHRA |
| **Sensores não qualificados** | O simulador IoT não garante calibração, rastreabilidade metrológica ou alarmes configuráveis | GDP UE Capítulo 3, WHO Sup13 |
| **Sem assinatura formal de handover** | A transferência de custódia não inclui assinatura qualificada com timestamp auditável | Annex 11 §9 |
| **Chave privada exposta** | A chave de desenvolvimento está exposta no repositório público (`PRIVATE_KEY` no `.env`) | NIST SP 800-57 |
| **Wallet não cifrada** | O armazenamento da carteira não usa KMS nem HSM | NIST SP 1800-36B |
| **IPFS mutável** | IPFS não garante imutabilidade permanente; pins podem ser removidos | GDP UE, Annex 11 §7 |

### S4.2 — Gaps de Governação e Adoção

| Gap | Descrição |
|---|---|
| **Sem operating model** | O protótipo não define quem opera a infraestrutura, como são admitidos novos membros, como se resolvem disputas |
| **Sem modelo de incentivos** | Não há incentivo económico para que transportadores partilhem dados de cold chain |
| **Sem conformidade RGPD** | Dados de telemetria com GPS podem constituir dados pessoais (rastreio de condutores) |
| **Sem interoperabilidade** | Não há definição de como o CargoChain interoperaria com outros sistemas (MediLedger, OriginTrail, TraceLink) |

### S4.3 — Como Usar Esta Crítica no Relatório

Estes gaps **não desqualificam** o protótipo como trabalho académico — são esperados num protótipo de investigação. O relatório deve:
- Reconhecer explicitamente os gaps na secção de limitações
- Enquadrar o CargoChain como **prova de conceito** que valida os mecanismos core (DIDs, Merkle anchoring, transferência de custódia on-chain)
- Propor como trabalho futuro: EPCIS 2.0, sensores qualificados, KMS, governação formal
- Contrastar o CargoChain com o SOTA completo para mostrar consciência da distância entre protótipo e produção

---

## S5 — Normas Regulatórias Essenciais para o SOTA

Esta secção consolida as normas e guidelines que o relatório deve referenciar, organizadas por camada da arquitetura. Nenhuma delas é um paper académico; são documentos normativos primários.

| Prioridade | Norma | Relevância | URL |
|---|---|---|---|
| **Muito Alta** | EPCIS 2.0 / CBV 2.0 (GS1) | Modelo canónico de eventos de rastreabilidade; inclui sensorMetadata, sensorReport, rawData | https://ref.gs1.org/guidelines/epcis-cbv/ |
| **Muito Alta** | FDA DSCSA Guidance | Recomenda EPCIS para intercâmbio interoperável; âncora regulatória norte-americana | https://www.fda.gov/media/171796/download |
| **Muito Alta** | GDP UE (2013/C 343/01) | Exige temperature mapping, calibração, alarmes, rastreabilidade total, sistemas computorizados validados | https://health.ec.europa.eu/document/download/9f28179a-a6f8-418a-a5fc-ecfbb3ae3ba8_en |
| **Muito Alta** | Annex 11 + MHRA GxP | Validação, audit trails, metadados, retenção do registo original, integridade de dados | https://health.ec.europa.eu/system/files/2016-11/annex11_01-2011_en_0.pdf |
| **Muito Alta** | WHO GDP + Sup13/15 | Qualificação de contentores, monitorização de temperatura, prova documental de conformidade | https://www.who.int/…trs961-annex9-modelguidanceforstoragetransport.pdf |
| **Alta** | W3C VC Data Model 2.0 | Stack normativa para VCs; modelo emissor-detentor-verificador | https://www.w3.org/TR/vc-data-model-2.0/ |
| **Alta** | W3C DID Core | Identificadores descentralizados para pessoas, organizações e "coisas" (sensores) | https://www.w3.org/TR/did-1.0/ |
| **Alta** | W3C BBS Cryptosuite | Divulgação seletiva e provas não correlacionáveis | https://www.w3.org/TR/vc-di-bbs/ |
| **Alta** | NIST SP 1800-36B | Birth credentials, onboarding seguro de dispositivos IoT, secure storage | https://www.nccoe.nist.gov/…iot-onboarding-sp1800-36b-preliminary-draft.pdf |
| **Alta** | GSMA IoT SAFE | SIM/eSIM/iSIM como raiz de confiança para IoT celular; útil para contentores móveis | https://www.gsma.com/…iot-safe/ |
| **Alta** | IATA TCR + CEIV Pharma | Envio conforme de produtos farmacêuticos; certificação operacional de qualidade | https://www.iata.org/…ceiv-pharma/ |
| **Média** | DCSA eBL | Interoperabilidade entre plataformas de transporte marítimo; lição de ecossistemas | https://dcsa.org/standards/bill-of-lading |

---

## S6 — Recomendações de Citação Atualizadas

Com a adição dos novos papers, a estratégia de citação para o relatório deve ser estruturada por secção:

### Para a secção de Estado da Arte / SOTA

| Subsecção | Papers a citar (originais + novos) |
|---|---|
| Rastreabilidade farmacêutica geral | Musamih et al. (2021), Akram et al. (2024), Liu et al. (2021) |
| Arquitetura híbrida on/off-chain | **Li et al. (2022)**, **Fernández-Iglesias et al. (2024)**, Fernández-Caramés et al. (2019) |
| IoT + cold chain | **Vilas Boas et al. — Coldnet (2025)**, **Duman et al. (2025)**, Liu et al. (2021) |
| DIDs e VCs | Ruta et al. (2020), **Ramírez-Gordillo et al. (2025)**, Manzoor et al. (2021) |
| Selective disclosure | **Ramić et al. (2024)**, **Flamini et al. (2024)** |
| Revogação de credenciais IoT | **Mazzocca et al. — EVOKE (2024)** |
| Governação de ecossistemas | **Greiner et al. (2024)**, **Najati (2025)**, **Hanisch et al. (2026)** |
| Falhanço TradeLens | **Najati (2025)**, **Hanisch et al. (2026)** |

### Para a secção de Arquitetura / Design do CargoChain

| Decisão de design | Papers de suporte |
|---|---|
| DIDRegistry + CarrierCredential | Ruta et al. (2020), Manzoor et al. (2021), **Ramírez-Gordillo et al. (2025)** |
| MerkleIoT anchoring | Liu et al. (2021), **Vilas Boas et al. (2025)**, **Li et al. (2022)** |
| EPCIS como lacuna identificada | **Li et al. (2022)**, **Fernández-Iglesias et al. (2024)** |
| Escolha de Ethereum vs Fabric | Musamih et al. (2021), **Duman et al. (2025)**, Paper 2 — MedLedger |
| Privacidade e GDPR | Paper 8 — Alzahrani et al., **Flamini et al. (2024)** |

### Para a secção de Limitações e Trabalho Futuro

Citar: **Najati (2025)** para governação; **Li et al. (2022)** e **Fernández-Iglesias et al. (2024)** para EPCIS; **Mazzocca et al. (2024)** para revogação; GDP UE + Annex 11 para requisitos regulatórios não cobertos.

---

> **Nota final:** Os 11 novos papers identificados nesta secção complementam — mas não substituem — os 15 papers originais da análise principal. O conjunto combinado oferece cobertura sólida de todas as dimensões do SOTA: rastreabilidade técnica, cold chain, identidade descentralizada, privacidade seletiva, governação de ecossistemas e conformidade regulatória. Os papers marcados a **negrito** nas tabelas acima são os de maior prioridade para inclusão no relatório final.

*Suplemento elaborado em 05-05-2026 com base na análise de 3 documentos adicionais fornecidos para o projeto CargoChain — Blockchain & DLT @ ISCTE.*
