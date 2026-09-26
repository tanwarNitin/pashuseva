import { requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getDisputedRequests } from "@/services/request.service";
import DisputesClient from "./disputes-client";

export default async function AdminDisputesPage(
  props: { params: Promise<{ locale: string }> }
) {
  const params = await props.params;
  const session = await requireSession();
  
  if (session.user.role !== "ADMIN") {
    redirect(`/${params.locale}`);
  }

  const disputes = await getDisputedRequests(session.user.id);

  return <DisputesClient initialDisputes={disputes} />;
}
