import { notFound } from "next/navigation";
import { Suspense } from "react";
import VillageClient from "./VillageClient";

interface Props {
  params: Promise<{ state: string; district: string; name: string }>;
}

export default async function VillagePage({ params }: Props) {
  const { state, district, name } = await params;
  const slug = `${state}/${district}/${name}`;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/village/${slug}`,
    { cache: "no-store" }
  );

  if (!res.ok) notFound();
  const data = await res.json();
  if (data.error) notFound();

  return (
    <Suspense>
      <VillageClient data={data} />
    </Suspense>
  );
}
