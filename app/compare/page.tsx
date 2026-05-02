import { Suspense } from "react";
import Link from "next/link";
import CompareClient from "@/components/CompareClient";

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-800">Connected India</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Compare Villages</span>
      </nav>
      <Suspense>
        <CompareClient />
      </Suspense>
    </div>
  );
}
