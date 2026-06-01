# -*- coding: utf-8 -*-
"""
Graficos do benchmark de gas do MerkleIoT (pt-PT).

Os valores de gas sao medicoes reais do hardhat-gas-reporter, obtidas em
prototype/test/GasBenchmark.test.ts. O custo de cada abordagem e LINEAR no
numero de leituras n. Cada serie mostra a sua formula na legenda.

Requer: pip install matplotlib numpy
Correr: python prototype/scripts/make_gas_charts.py

Saida (PNG 300 dpi), escrita em docs/ na raiz do repositorio:
    docs/gas_chart_trip.png      - barras: uma viagem de 5 h (300 leituras)
    docs/gas_chart_scaling.png   - linhas: gas total em funcao de n
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
import numpy as np

# ---- Constantes medidas (hardhat-gas-reporter) ----
G_TX   = 73_525       # on-chain completo, 1 transacao por leitura: gas/leitura
B_BASE = 45_000       # on-chain completo, 1 transacao unica: custo fixo
B_TX   = 46_135       # on-chain completo, 1 transacao unica: gas marginal/leitura
ANCHOR = 149_538      # MerkleIoT: gas por anchorBatch
LOTE   = 10           # leituras por lote Merkle
M_TX   = ANCHOR / LOTE
BLOCO  = 30_000_000   # limite de gas de um bloco Ethereum

RED, AMBAR, TEAL, CINZA = "#dc2626", "#d97706", "#0d9488", "#475569"
# Script vive em prototype/scripts/, mas os PNG vao para docs/ na raiz do repo.
OUT = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs")
)

LBL_TX = "On-chain completo, 1 tx por leitura:  g(n) = 73 525 × n"
LBL_UM = "On-chain completo, 1 tx única:  g(n) = 45 000 + 46 135 × n"
LBL_MK = "MerkleIoT (lote = 10):  g(n) = 149 538 × n.º de lotes"


def naive_tx(n): return G_TX * np.asarray(n)
def naive_um(n): return B_BASE + B_TX * np.asarray(n)
def merkle(n):   return ANCHOR * np.ceil(np.asarray(n) / LOTE)


def milhoes(x, _):
    if x >= 1e6:
        return "%.0f M" % (x / 1e6)
    if x >= 1e3:
        return "%.0f k" % (x / 1e3)
    return "%.0f" % x


# ===========================================================================
# Grafico 1 - barras: uma viagem de 5 h (300 leituras)
# ===========================================================================
def grafico_viagem():
    n = 300
    rotulos = ["On-chain completo\n1 tx por leitura",
               "On-chain completo\n1 tx única",
               "MerkleIoT\n30 raízes ancoradas"]
    vals = [float(naive_tx(n)), float(naive_um(n)), float(merkle(n))]
    cores = [RED, AMBAR, TEAL]

    fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
    barras = ax.bar(rotulos, vals, color=cores, width=0.62, zorder=3)

    ax.set_title("Gás para registar uma viagem de 5 h (300 leituras, 1/min)",
                 fontsize=13, fontweight="bold", pad=14)
    ax.set_ylabel("Gás total")
    ax.yaxis.set_major_formatter(FuncFormatter(milhoes))
    ax.grid(axis="y", color="#e2e8f0", zorder=0)
    ax.set_axisbelow(True)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for b, v in zip(barras, vals):
        ax.text(b.get_x() + b.get_width() / 2, v, "%.1f M" % (v / 1e6),
                ha="center", va="bottom", fontsize=10, fontweight="bold")

    from matplotlib.patches import Patch
    leg = [
        Patch(facecolor=RED,   label=LBL_TX),
        Patch(facecolor=AMBAR, label=LBL_UM),
        Patch(facecolor=TEAL,  label=LBL_MK),
    ]
    ax.legend(handles=leg, loc="upper right", fontsize=9, frameon=True)
    ax.text(0.0, -0.16,
            "Fonte: hardhat-gas-reporter (test/GasBenchmark.test.ts). "
            "n = número de leituras. Custo linear em n.",
            transform=ax.transAxes, fontsize=8, color="#64748b")

    fig.tight_layout()
    caminho = os.path.join(OUT, "gas_chart_trip.png")
    fig.savefig(caminho, bbox_inches="tight")
    plt.close(fig)
    print("escrito", caminho)


# ===========================================================================
# Grafico 2 - linhas (escala linear): gas total em funcao do numero de leituras
# ===========================================================================
def grafico_escala():
    n = np.arange(0, 10081, 30)
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)

    series = [
        (naive_tx, RED,   LBL_TX),
        (naive_um, AMBAR, LBL_UM),
        (merkle,   TEAL,  LBL_MK),
    ]
    for fn, cor, rot in series:
        ax.plot(n, fn(n), color=cor, lw=2.4, label=rot, zorder=4)

    ymax = float(naive_tx(10080)) * 1.10
    ax.set_ylim(0, ymax)
    ax.set_xlim(0, 10080)

    # mark each line at the round X-axis ticks (2000, 4000, 6000, 8000, 10000)
    # and trace every point both ways: horizontal to the Y axis (its gas value)
    # and vertical down to the X axis. No text label, the traces are enough.
    marcas = [2000, 4000, 6000, 8000, 10000]
    for leituras in marcas:
        for fn, cor, _ in series:
            y = float(fn(leituras))
            ax.plot([leituras], [y], "o", color=cor, ms=4.5, zorder=5,
                    markeredgecolor="white", markeredgewidth=0.6)
            # gas value at this point (label above the marker)
            ax.annotate(milhoes(y, None), xy=(leituras, y), xytext=(0, 7),
                        textcoords="offset points", fontsize=6.8,
                        color=cor, va="bottom", ha="center", zorder=6,
                        fontweight="bold")

    ax.set_title("Gás total em função do número de leituras",
                 fontsize=13, fontweight="bold", pad=14)
    ax.set_xlabel("Número de leituras  (n)")
    ax.set_ylabel("Gás total")
    ax.yaxis.set_major_formatter(FuncFormatter(milhoes))
    ax.grid(color="#eef2f6", zorder=0)
    ax.set_axisbelow(True)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.legend(loc="upper left", fontsize=9, frameon=True, framealpha=0.95)
    import textwrap
    caption = (
        "73 525 = gás por leitura quando cada leitura é uma transação própria "
        "(base de 21k + escrita em storage).  45 000 = custo fixo de uma única "
        "transação que guarda todas as leituras.  46 135 = gás adicional por cada "
        "leitura guardada nessa transação.  149 538 = gás de um anchorBatch, uma raiz "
        "Merkle por lote de 10 leituras (n.º de lotes = n / 10, arredondado para cima). "
        "Valores medidos com hardhat-gas-reporter. Os pontos indicam o gás total em cada n."
    )
    ax.text(0.0, -0.20, textwrap.fill(caption, width=133),
            transform=ax.transAxes, fontsize=9, color="#64748b",
            linespacing=1.5, va="top")

    fig.tight_layout()
    caminho = os.path.join(OUT, "gas_chart_scaling.png")
    fig.savefig(caminho, bbox_inches="tight")
    plt.close(fig)
    print("escrito", caminho)


if __name__ == "__main__":
    grafico_viagem()
    grafico_escala()
