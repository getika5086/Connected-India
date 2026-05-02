import { notFound } from "next/navigation";
import DistrictClient from "@/components/DistrictClient";

interface Props {
  params: Promise<{ state: string; district: string }>;
}

export default async function DistrictPage({ params }: Props) {
  const { state, district } = await params;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/district/${state}/${district}`,
    { cache: "no-store" }
  );

  if (!res.ok) notFound();
  const data = await res.json();
  if (data.error) notFound();

  return <DistrictClient summary={data.summary} yearBreakdown={data.yearBreakdown} />;
}
