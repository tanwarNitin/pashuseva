"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { resolveDisputeRequestAction } from "@/actions/request.actions";
import { PageShell } from "@/components/layout/page-shell";

export interface DisputedRequest {
  id: string;
  kind: string;
  serviceCode: string;
  status: string;
  createdAt: Date | string;
  farmerId: string;
  farmerName: string | null;
  farmerPhone: string;
  providerId: string | null;
}

export default function DisputesClient({ initialDisputes }: { initialDisputes: DisputedRequest[] }) {
  const router = useRouter();
  const [disputes, setDisputes] = useState(initialDisputes);
  const [isPending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = (id: string, resolution: "COMPLETED" | "CANCELLED") => {
    const notes = window.prompt(`Resolve as ${resolution}? Enter notes for resolution:`);
    if (notes === null) return;
    if (!notes.trim()) {
      alert("Notes are required for resolution.");
      return;
    }

    setResolvingId(id);
    const formData = new FormData();
    formData.append("requestId", id);
    formData.append("resolution", resolution);
    formData.append("notes", notes);

    startTransition(async () => {
      try {
        const res = await resolveDisputeRequestAction(undefined, formData);
        if (res.ok) {
          setDisputes((prev) => prev.filter((d) => d.id !== id));
          router.refresh();
        } else {
          alert(`Failed to resolve dispute: ${res.messageKey}`);
        }
      } catch (err) {
        console.error(err);
        alert("An error occurred");
      } finally {
        setResolvingId(null);
      }
    });
  };

  return (
    <PageShell
      title="Disputes Queue"
      subtitle="Manage and resolve disputed service requests"
      primaryAction={
        <Badge variant="destructive" className="text-sm px-3 py-1">
          {disputes.length} Pending
        </Badge>
      }
    >
      {disputes.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="p-12 text-center text-muted-foreground">
            <CheckCircle className="mx-auto h-12 w-12 text-primary mb-4 opacity-50" />
            <p>No disputed requests at the moment. Good job!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {disputes.map((dispute) => (
            <Card key={dispute.id} className="border-l-4 border-l-destructive shadow-sm hover:shadow transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {dispute.farmerName} 
                      <span className="text-sm text-muted-foreground font-normal">({dispute.farmerPhone})</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {dispute.kind} • {dispute.serviceCode} • Created {new Date(dispute.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant="destructive">
                    {dispute.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
                  <Button 
                    variant="outline"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                    disabled={isPending && resolvingId === dispute.id}
                    onClick={() => handleResolve(dispute.id, "CANCELLED")}
                  >
                    {isPending && resolvingId === dispute.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Resolve as Cancelled
                  </Button>
                  <Button 
                    variant="default"
                    disabled={isPending && resolvingId === dispute.id}
                    onClick={() => handleResolve(dispute.id, "COMPLETED")}
                  >
                    {isPending && resolvingId === dispute.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Resolve as Completed
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
