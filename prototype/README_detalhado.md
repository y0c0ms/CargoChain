# CargoChain Prototype

## 1. Arquitetura geral

A arquitetura do projeto é composta por três contratos principais:

| Ficheiro | Função principal |
|---|---|
| `Package.sol` | Representa uma carga ou pacote individual |
| `PackageFactory.sol` | Cria contratos `Package` através de clones EIP-1167 |
| `MerkleIoT.sol` | Regista provas agregadas de leituras IoT associadas aos pacotes |

---

## 2. Diferença entre a versão tradicional e a versão factory

A variante factory existe para resolver uma limitação potencial de arquiteturas baseadas num único contrato central.

Numa abordagem tradicional, todos os pacotes poderiam ser guardados dentro de um único contrato, por exemplo através de uma estrutura como:

```solidity
mapping(uint256 => Consignment) public consignments;
```

Nesta arquitetura, todas as operações de criação, atualização e transferência de custódia alterariam o estado do mesmo contrato. Em contextos com elevado volume de pacotes, esse contrato poderia tornar-se um ponto de contenção.

Na variante factory, cada pacote é criado como um contrato próprio. Esta abordagem permite que diferentes pacotes tenham estados isolados e sejam manipulados de forma independente.

| Aspeto | Abordagem tradicional | Abordagem factory |
|---|---|---|
| Armazenamento | Um contrato com vários registos | Um contrato por pacote |
| Estado de cada pacote | Linha num `mapping` | Estado próprio num contrato |
| Transferências | Todas passam pelo mesmo contrato | Cada pacote gere a sua própria custódia |
| Escalabilidade | Pode gerar contenção | Mais compatível com execução paralela |
| Isolamento | Um erro pode afetar todos os pacotes | O impacto tende a ficar limitado a um pacote |

---

## 3. Contrato `Package.sol`

O contrato `Package.sol` representa uma carga individual. Cada instância deste contrato corresponde a um pacote criado pela `PackageFactory`.

### 3.1. Responsabilidade do contrato

Este contrato é responsável por:

- guardar os dados essenciais do pacote;
- identificar o remetente inicial;
- identificar o atual detentor da custódia;
- controlar o estado do pacote;
- registar transferências de custódia;
- impedir transferências inválidas;
- guardar o histórico de movimentos;
- permitir marcar o pacote como entregue.

### 3.2. Estados possíveis do pacote

O contrato define um conjunto de estados através de um `enum`:

```solidity
enum Status {
    Created,
    InTransit,
    Delivered,
    Disputed
}
```

| Estado | Significado |
|---|---|
| `Created` | O pacote foi criado, mas ainda não entrou em trânsito |
| `InTransit` | O pacote encontra-se em transporte |
| `Delivered` | O pacote foi entregue |
| `Disputed` | Estado reservado para situações de disputa |


### 3.3. Dados guardados em cada pacote

Cada contrato `Package` guarda informação como:

| Variável | Significado |
|---|---|
| `factory` | Endereço da factory que criou o pacote |
| `shipper` | Entidade que criou ou enviou o pacote |
| `currentHolder` | Entidade que detém atualmente a custódia |
| `status` | Estado atual do pacote |
| `docsHash` | Hash dos documentos associados ao pacote |
| `docsURI` | URI dos documentos, por exemplo IPFS ou HTTPS |
| `createdAt` | Momento de criação do pacote |
| `_history` | Histórico das transferências de custódia |

### 3.4. Inicialização do pacote

Como os contratos `Package` são criados como clones EIP-1167, os clones não executam um construtor próprio. Por esse motivo, a configuração inicial é feita através da função:

```solidity
initialize(...)
```

Esta função define a factory responsável pela criação, o remetente inicial (`shipper`), o titular inicial da custódia, o hash dos documentos, o URI dos documentos, o timestamp de criação e o estado inicial do pacote.

A inicialização só pode ocorrer uma vez. Isto protege o contrato contra tentativas de reinicialização ou alteração maliciosa dos dados fundacionais do pacote.

### 3.5. Transferência de custódia

A função central do contrato é:

```solidity
transferCustody(
    address to,
    string calldata locationUnLocode,
    bytes32 proofOfHandshake
)
```

Esta função representa a passagem da custódia da carga de uma entidade para outra.

Um fluxo típico seria:

```text
Shipper → Carrier A → Carrier B → Destinatário
```

A função valida três condições principais:

1. quem chama a função tem de ser o atual titular da custódia;
2. o pacote não pode já estar entregue;
3. o destinatário da nova custódia não pode ser o endereço zero.

Quando a transferência é válida, o contrato atualiza o `currentHolder`, altera o estado para `InTransit`, se aplicável, regista a transferência no histórico e emite um evento de transferência de custódia.

Cada transferência inclui:

| Campo | Significado |
|---|---|
| `from` | Endereço de quem transfere a custódia |
| `to` | Endereço de quem recebe a custódia |
| `timestamp` | Momento da transferência |
| `locationUnLocode` | Local da transferência |
| `proofOfHandshake` | Prova criptográfica da transferência |

O campo `locationUnLocode` pode usar códigos como `PTLIS`, para Lisboa, ou `PTOPO`, para Porto.

### 3.6. Entrega do pacote

A função:

```solidity
markDelivered()
```

permite que o atual titular da custódia marque o pacote como entregue.

Depois de marcado como `Delivered`, o pacote deixa de poder ser transferido. Esta regra garante que uma carga entregue não continua a circular no sistema.

### 3.7. Histórico de transferências

A função `historyOf()` devolve a lista completa de transferências de custódia.
A função `hopCount()` devolve o número total de transferências realizadas.

---

## 4. Contrato `PackageFactory.sol`

O contrato `PackageFactory.sol` é responsável por criar os contratos `Package`.

Pode ser entendido como a fábrica do sistema: sempre que é necessário criar um novo pacote, a factory cria um novo clone do contrato `Package`.

### 4.1. Implementação base

A factory guarda um endereço chamado:

```solidity
implementation
```

Este endereço corresponde ao contrato `Package` base. Os pacotes criados posteriormente não são contratos completamente novos do zero, mas sim clones leves dessa implementação.

Esta abordagem segue o padrão EIP-1167, também conhecido como **minimal proxy pattern**.

### 4.2. Criação de pacotes

A função principal da factory é:

```solidity
create(bytes32 docsHash, string calldata docsURI)
```

Quando esta função é chamada, a factory incrementa o contador de pacotes, cria um clone do contrato `Package`, inicializa o clone com os dados do pacote, associa o novo pacote a um identificador numérico, guarda o endereço do contrato criado e emite um evento `PackageCreated`.

### 4.3. Mapeamento entre IDs e contratos

A factory mantém duas relações fundamentais:

```solidity
mapping(uint256 => address) public packageOf;
mapping(address => uint256) public idOf;
```

A primeira permite descobrir o endereço do contrato de um pacote a partir do seu ID:

```text
packageOf[1] → endereço do Package #1
```

A segunda permite fazer a relação inversa:

```text
idOf[endereço do Package #1] → 1
```

Isto é importante porque outros contratos ou aplicações externas podem precisar de confirmar se determinado endereço corresponde realmente a um pacote criado pela factory.

### 4.4. Verificação de pacotes

A função:

```solidity
requirePackage(uint256 id)
```

serve para verificar se um determinado ID corresponde a um pacote válido criado pela factory.

Se o pacote não existir, a função reverte com um erro específico.

Esta função é útil para integrações futuras, por exemplo com contratos de pagamento, seguros, escrow ou validação IoT.

---

## 5. Contrato `MerkleIoT.sol`

O contrato `MerkleIoT.sol` trata da associação entre pacotes e dados IoT.

Sensores IoT podem gerar muitas leituras durante o transporte de uma carga. Guardar todas essas leituras diretamente na blockchain seria caro e pouco eficiente. Por isso, o contrato usa uma abordagem baseada em **Merkle roots**.

### 5.1. Ideia principal

Em vez de guardar cada leitura individualmente, o sistema pode recolher várias leituras IoT fora da blockchain, calcular uma Merkle tree com essas leituras, guardar apenas a Merkle root na blockchain e permitir, mais tarde, provar que uma leitura específica fazia parte desse conjunto.

Assim, a blockchain guarda uma prova compacta da existência e integridade dos dados, sem armazenar todos os dados brutos.

### 5.2. Estrutura dos batches

O contrato organiza as leituras em lotes, designados por `Batch`.

Cada batch contém:

| Campo | Significado |
|---|---|
| `tokenId` | ID do pacote associado |
| `merkleRoot` | Raiz Merkle das leituras |
| `readingCount` | Número de leituras incluídas |
| `firstTs` | Timestamp da primeira leitura |
| `lastTs` | Timestamp da última leitura |
| `submitter` | Endereço do oracle que submeteu o lote |

### 5.3. Oracles aprovados

Nem qualquer endereço pode submeter leituras IoT. O contrato mantém uma lista de oracles aprovados:

```solidity
mapping(address => bool) public approvedOracle;
```

Apenas endereços aprovados podem submeter batches.

A aprovação ou remoção de oracles é feita através da função:

```solidity
setApprovedOracle(address oracle, bool approved)
```

Esta função só pode ser chamada pelo dono do contrato.

### 5.4. Registo de batches IoT

A função principal é:

```solidity
anchorBatch(...)
```

Esta função permite que um oracle aprovado registe uma Merkle root associada a um determinado pacote.

A função recebe informação como o ID do pacote, a Merkle root, o número de leituras, o timestamp inicial e o timestamp final.

Quando o batch é registado, fica disponível para posterior verificação.

### 5.5. Verificação de leituras

A função:

```solidity
verifyReading(
    uint256 batchId,
    bytes32 leaf,
    bytes32[] calldata proof
)
```

permite verificar se uma leitura específica pertence a um batch previamente registado.

A leitura individual pode ser representada através de um hash, por exemplo:

```solidity
keccak256(abi.encodePacked(ts, tempTenthsC, gpsHash))
```

Desta forma, é possível provar que uma determinada leitura existia no conjunto original, sem revelar ou guardar todas as leituras diretamente na blockchain.

---

## 6. Limitações e pontos de atenção

Apesar da arquitetura ser coerente para um protótipo, existem alguns aspetos que poderiam ser desenvolvidos numa versão mais robusta.

### 6.1. Estado `Disputed` ainda não implementado

O estado `Disputed` está previsto, mas não existe ainda uma função para abrir, gerir ou resolver disputas.

### 6.2. Validação dos pacotes no `MerkleIoT`

O contrato `MerkleIoT` associa batches a um `tokenId`, mas não valida diretamente se esse ID corresponde a um pacote existente na `PackageFactory`.

Numa versão futura, o `MerkleIoT` poderia receber o endereço da factory e chamar uma função como `requirePackage(id)` antes de aceitar batches.

### 6.3. Validação de localizações

O campo `locationUnLocode` é uma string livre. O contrato não valida se o código segue efetivamente o formato UN/LOCODE.

### 6.4. Validação de documentos

O campo `docsURI` também não é validado. Isto é aceitável num protótipo, mas numa solução de produção seria recomendável validar ou normalizar os formatos aceites.

### 6.5. Controlo de papéis

Atualmente, qualquer endereço que seja titular da custódia pode transferir o pacote para qualquer outro endereço. O sistema não distingue formalmente transportadoras, destinatários, operadores autorizados ou outras entidades.
