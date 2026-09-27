import { getProvidersAction } from "@/actions/admin.actions";
import { VerifyClient } from "./verify-client";
import { requireAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";

export default async function AdminVerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const p = await params;
  const sp = await searchParams;
  
  try {
    await requireAdmin();
  } catch (e) {
    redirect(`/${p.locale}/login`);
  }
  
  const statusFilter = sp.status || "PENDING";
  
  const providers = await getProvidersAction(statusFilter !== "ALL" ? statusFilter : undefined);
  
  return (
    <PageShell title="Provider Verification Admin">
      <VerifyClient initialProviders={providers} currentStatus={statusFilter} locale={p.locale} />
    </PageShell>
  );
}
