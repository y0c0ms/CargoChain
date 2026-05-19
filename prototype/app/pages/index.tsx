import Link from "next/link";

export default function Home() {
  const dashboards = [
    { href: "/shipper",    name: "Shipper",    desc: "Create a package (factory spawns a dedicated clone, manifest hash anchored on-chain)" },
    { href: "/carrier",    name: "Carrier",    desc: "Take custody, hand off to next carrier, or mark delivered" },
    { href: "/simulation", name: "Simulation", desc: "Live IoT batches + on-chain Merkle proof verification" },
    { href: "/regulator",  name: "Regulator",  desc: "Full audit trail for any package" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-teal-800 mb-2">CargoChain</h1>
        <p className="text-slate-600 mb-2">
          Blockchain logistics platform: immutable custody tracking and
          IoT data integrity verifiable by anyone on-chain.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          Pick a role to open its dashboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboards.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="block p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-teal-100"
            >
              <div className="text-xl font-semibold text-teal-700">{d.name}</div>
              <div className="text-slate-500 text-sm mt-1">{d.desc}</div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-xs text-slate-500">
          Demo prototype · Group GX · ISCTE Blockchain &amp; DLT · T1–T6
        </div>
      </div>
    </main>
  );
}
