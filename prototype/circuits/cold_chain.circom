pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/*
 * cold_chain.circom
 * -----------------
 * Proves: ALL of an array of temperature readings fall within [lowerBound, upperBound],
 *         without revealing the readings themselves. Also binds the proof to the
 *         Merkle root previously anchored on-chain, so the prover cannot invent data.
 *
 * Concept-map nodes: ZKP · zk-SNARKs · Non-interactive · Completeness · Soundness ·
 *                    Zero-Knowledge · Merkle Tree (Poseidon variant for SNARK-friendliness).
 *
 * Public inputs:
 *   lowerBound          e.g. 20 for 2.0°C * 10
 *   upperBound          e.g. 80 for 8.0°C * 10
 *   expectedRoot        Poseidon-based Merkle root that was anchored on-chain
 *   count               number of readings (constant at circuit compile time)
 *
 * Private inputs:
 *   readings[count]     the actual temperature values (*10 to stay integer)
 *   timestamps[count]   when they were taken
 *
 * The circuit is generated with N = 8 for development speed. For demo we scale
 * to N = 32 or 64; for production the batching layer handles partial trees.
 */

template InRange() {
    signal input value;
    signal input lo;
    signal input hi;

    component geq = GreaterEqThan(16);
    geq.in[0] <== value;
    geq.in[1] <== lo;
    geq.out === 1;

    component leq = LessEqThan(16);
    leq.in[0] <== value;
    leq.in[1] <== hi;
    leq.out === 1;
}

// Hash a leaf (ts, temp) with Poseidon for SNARK-friendly merkle
template Leaf() {
    signal input ts;
    signal input temp;
    signal output h;

    component p = Poseidon(2);
    p.inputs[0] <== ts;
    p.inputs[1] <== temp;
    h <== p.out;
}

// Merkle root over a power-of-two number of leaves using Poseidon
template MerkleRoot(N_LOG) {
    var N = 1 << N_LOG;
    signal input leaves[N];
    signal output root;

    signal level[N_LOG + 1][N];
    for (var i = 0; i < N; i++) level[0][i] <== leaves[i];

    component h[N_LOG][N / 2];
    for (var k = 0; k < N_LOG; k++) {
        var half = 1 << (N_LOG - k - 1);
        for (var j = 0; j < half; j++) {
            h[k][j] = Poseidon(2);
            h[k][j].inputs[0] <== level[k][2 * j];
            h[k][j].inputs[1] <== level[k][2 * j + 1];
            level[k + 1][j] <== h[k][j].out;
        }
    }
    root <== level[N_LOG][0];
}

template ColdChain(N_LOG) {
    var N = 1 << N_LOG;

    // public
    signal input lowerBound;
    signal input upperBound;
    signal input expectedRoot;

    // private
    signal input readings[N];
    signal input timestamps[N];

    // 1) Each reading is in range
    component rng[N];
    for (var i = 0; i < N; i++) {
        rng[i] = InRange();
        rng[i].value <== readings[i];
        rng[i].lo <== lowerBound;
        rng[i].hi <== upperBound;
    }

    // 2) Hash leaves
    component leaf[N];
    signal leafHashes[N];
    for (var i = 0; i < N; i++) {
        leaf[i] = Leaf();
        leaf[i].ts <== timestamps[i];
        leaf[i].temp <== readings[i];
        leafHashes[i] <== leaf[i].h;
    }

    // 3) Recompute root and check it matches public root
    component tree = MerkleRoot(N_LOG);
    for (var i = 0; i < N; i++) tree.leaves[i] <== leafHashes[i];
    tree.root === expectedRoot;
}

// Dev size: 8 leaves (N_LOG = 3). Increase to 5 or 6 for demo.
component main { public [lowerBound, upperBound, expectedRoot] } = ColdChain(3);
