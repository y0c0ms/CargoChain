import { useState, useEffect } from "react";
import { ACCOUNTS, Account, getSelectedAccount, setSelectedAccount } from "../lib/accounts";

/**
 * Floating account picker shown in the top-right of every dashboard.
 *
 * Why this exists:
 *   The demo doesn't use MetaMask, so without this every "switch identity"
 *   moment required editing prototype/app/.env.local and restarting the dev
 *   server. With the picker, switching from "Pfizer" to "TAP Air Cargo" is
 *   one click — every dashboard's getSigner() reads the selection from
 *   localStorage on the next interaction.
 *
 *   In production this whole component would be replaced by a wallet-connect
 *   button (MetaMask, WalletConnect, etc.). The picker is a demo affordance.
 */
export function AccountPicker() {
  const [selected, setSelected] = useState<Account>(ACCOUNTS[0]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    // Hydrate from localStorage after mount (avoids SSR mismatch)
    setSelected(getSelectedAccount());
    setMounted(true);
  }, []);

  function pick(a: Account) {
    setSelectedAccount(a);
    setSelected(a);
    setOpen(false);
  }

  async function copyAddress(e: React.MouseEvent, address: string) {
    // Don't trigger the row's pick() click
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(address);
      window.setTimeout(() => setCopied((cur) => (cur === address ? null : cur)), 1200);
    } catch {
      // Fallback for older browsers / non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = address;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
      setCopied(address);
      window.setTimeout(() => setCopied((cur) => (cur === address ? null : cur)), 1200);
    }
  }

  // Render a placeholder during SSR so hydration matches
  if (!mounted) return <div className="fixed top-3 right-3 z-50 h-10" />;

  const roleColor = {
    issuer:   "bg-purple-100 text-purple-700",
    shipper:  "bg-blue-100   text-blue-700",
    carrier:  "bg-teal-100   text-teal-700",
    receiver: "bg-amber-100  text-amber-700",
  }[selected.role];

  return (
    <div className="fixed top-3 right-3 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="bg-white border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50"
        data-testid="account-picker-toggle"
      >
        <span className="text-slate-500">Signing as</span>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${roleColor}`}>
          {selected.name}
        </span>
        <span className="text-xs font-mono text-slate-400">
          {selected.address.slice(0, 6)}…{selected.address.slice(-4)}
        </span>
        <span className="text-slate-400">▼</span>
      </button>

      {open && (
        <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-md w-96 max-h-[28rem] overflow-auto">
          <div className="px-3 py-2 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
            Pick an identity to sign as
          </div>
          {ACCOUNTS.map((a) => {
            const isSelected   = selected.address === a.address;
            const isCopied     = copied === a.address;
            const c = {
              issuer:   "bg-purple-50 text-purple-700",
              shipper:  "bg-blue-50   text-blue-700",
              carrier:  "bg-teal-50   text-teal-700",
              receiver: "bg-amber-50  text-amber-700",
            }[a.role];
            return (
              <div
                key={a.address}
                onClick={() => pick(a)}
                className={`p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer ${isSelected ? "bg-teal-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{a.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${c}`}>{a.role}</span>
                  {isSelected && <span className="ml-auto text-teal-600 text-xs">●</span>}
                </div>
                {a.hint && <div className="text-xs text-slate-500 mt-0.5">{a.hint}</div>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-slate-400 truncate">{a.address}</span>
                  <button
                    onClick={(e) => copyAddress(e, a.address)}
                    aria-label={`Copy ${a.name} address`}
                    title="Copy address"
                    className={`ml-auto shrink-0 text-xs px-2 py-0.5 rounded border transition-colors ${
                      isCopied
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`}
                  >
                    {isCopied ? "✓ copied" : "📋 copy"}
                  </button>
                </div>
              </div>
            );
          })}
          <div className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100">
            Click a row to sign as that identity. The 📋 button copies the address.
          </div>
        </div>
      )}
    </div>
  );
}
