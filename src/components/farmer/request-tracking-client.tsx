"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useTranslation } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2, CheckCircle, AlertTriangle, XCircle, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRequestDetailsAction, cancelRequestAction, confirmRequestAction, disputeRequestAction } from "@/actions/request.actions";
import type { FarmerRequestDetails } from "@/services/request.service";

interface RequestTrackingClientProps {
  requestId: string;
}

export default function RequestTrackingClient({ requestId }: RequestTrackingClientProps) {
  const dict = useTranslation();
  const router = useRouter();

  const [request, setRequest] = useState<FarmerRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelActionState, cancelAction, isPending] = useActionState(
    cancelRequestAction,
    null
  );

  const [confirmActionState, confirmAction, isConfirmPending] = useActionState(
    confirmRequestAction,
    null
  );

  const [disputeActionState, disputeAction, isDisputePending] = useActionState(
    disputeRequestAction,
    null
  );

  const fetchRequest = useCallback(async () => {
    try {
      const result = await getRequestDetailsAction(requestId);
      if (result.ok) {
        setRequest(result.data as FarmerRequestDetails);
      } else {
        const errorKey = result.messageKey.replace(/^errors\./, "");
        const errorText =
          dict.errors[errorKey as keyof typeof dict.errors] ||
          dict.errors[result.messageKey as keyof typeof dict.errors] ||
          "Failed to fetch request";
        setError(errorText);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [requestId, dict]);

  useEffect(() => {
    fetchRequest();

    // Poll every 5 seconds if not in a terminal state
    const interval = setInterval(() => {
      fetchRequest();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchRequest]);

  useEffect(() => {
    if (cancelActionState) {
      if (cancelActionState.ok) {
        fetchRequest();
      } else {
        const errorKey = cancelActionState.messageKey.replace(/^errors\./, "");
        const errorText =
          dict.errors[errorKey as keyof typeof dict.errors] ||
          dict.errors[cancelActionState.messageKey as keyof typeof dict.errors] ||
          "Failed to cancel request";
        setError(errorText);
      }
    }
  }, [cancelActionState, fetchRequest, dict]);

  useEffect(() => {
    if (confirmActionState) {
      if (confirmActionState.ok) {
        fetchRequest();
      } else {
        setError("Failed to confirm request");
      }
    }
  }, [confirmActionState, fetchRequest]);

  useEffect(() => {
    if (disputeActionState) {
      if (disputeActionState.ok) {
        fetchRequest();
      } else {
        setError("Failed to dispute request");
      }
    }
  }, [disputeActionState, fetchRequest]);

  const handleCancel = () => {
    const reason = window.prompt("Reason for cancellation?");
    if (reason === null) {
      return; // User cancelled prompt dialog
    }
    const formData = new FormData();
    formData.append("requestId", requestId);
    formData.append("reason", reason || "Cancelled by farmer");
    startTransition(() => {
      cancelAction(formData);
    });
  };

  const handleConfirm = () => {
    const formData = new FormData();
    formData.append("requestId", requestId);
    startTransition(() => {
      confirmAction(formData);
    });
  };

  const handleDispute = () => {
    const reason = window.prompt("Reason for dispute?");
    if (!reason || reason.trim() === "") {
      alert("A reason is required to dispute the visit.");
      return;
    }
    const formData = new FormData();
    formData.append("requestId", requestId);
    formData.append("reason", reason);
    startTransition(() => {
      disputeAction(formData);
    });
  };

  if (loading && !request) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading request details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <Card className="border-destructive bg-destructive/5">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium mb-4">{error || "Request not found"}</p>
          <Button onClick={() => router.push("/en/discover")}>Return to Discovery</Button>
        </CardContent>
      </Card>
    );
  }

  const isTerminal = request.status === "COMPLETED" || request.status === "CANCELLED" || request.status === "EXPIRED";

  const getStatusText = (status: string) => {
    switch (status) {
      case "OPEN": return `⏳ ${status}`;
      case "ACCEPTED": return `✅ ${status}`;
      case "IN_PROGRESS": return `✅ ${status}`;
      case "AWAITING_CONFIRMATION": return `⏳ ${status}`;
      case "DISPUTED": return `🚨 ${status}`;
      case "COMPLETED": return `✅ ${status}`;
      case "CANCELLED":
      case "EXPIRED": return `❌ ${status}`;
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" onClick={() => router.push("/en/discover")}>
          ← Back
        </Button>
      </div>

      <Card className={`border-t-4 ${request.kind === "SOS" ? "border-destructive" : "border-primary"}`}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-black tracking-hero text-gray-900 flex items-center gap-2">
                {request.kind === "SOS" && <AlertTriangle className="h-6 w-6 text-destructive" />}
                {request.kind === "SOS" ? "Emergency Request" : "Routine Request"}
              </CardTitle>
              <CardDescription className="mt-1">
                Created on {new Date(request.createdAt).toLocaleString()}
              </CardDescription>
            </div>
            <Badge
              className={(
                request.status === "OPEN" ? "bg-yellow-100 text-yellow-800" :
                  request.status === "ACCEPTED" ? "bg-blue-100 text-blue-800" :
                    request.status === "IN_PROGRESS" ? "bg-purple-100 text-purple-800" :
                      request.status === "AWAITING_CONFIRMATION" ? "bg-orange-100 text-orange-800" :
                        request.status === "DISPUTED" ? "bg-red-100 text-red-800" :
                          request.status === "COMPLETED" ? "bg-primary-100 text-primary-800" :
                            "bg-gray-100 text-gray-800"
              ) + " uppercase tracking-kicker text-xs font-medium"}
            >
              {getStatusText(request.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Condition</h3>
            <p className="text-foreground">{request.conditionSummary}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Service Needed</h3>
              <p className="text-foreground">{request.serviceCode}</p>
            </div>
            {request.animalName && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Animal</h3>
                <p className="text-foreground">{request.animalName} {request.animalTagId ? `(${request.animalTagId})` : ""}</p>
              </div>
            )}
          </div>

          {request.status === "OPEN" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-yellow-600 animate-spin" />
              <p className="text-yellow-800 font-medium text-center">
                Broadcasting to nearby providers...
              </p>
              <p className="text-yellow-700 text-base text-center">
                Please wait. A provider will accept your request shortly.
              </p>
            </div>
          )}

          {request.providerName && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-blue-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Provider Assigned
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Name</p>
                  <p className="font-medium text-blue-900">{request.providerName}</p>
                </div>
                {request.estimatedTotalPaise && (
                  <div>
                    <p className="text-sm text-blue-700">Estimated Fee</p>
                    <p className="font-semibold text-xl tracking-tight tabular-nums text-blue-900">₹{(request.estimatedTotalPaise / 100).toFixed(0)}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <a
                  href={`tel:${request.providerPhone}`}
                  className="flex-1"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Phone className="mr-2 h-4 w-4" /> Call Provider
                  </Button>
                </a>
                <a
                  href={`https://wa.me/${request.providerPhone}`}
                  className="flex-1"
                  target="_blank" rel="noopener noreferrer"
                >
                  <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          )}

          {request.status === "AWAITING_CONFIRMATION" && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-orange-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Did your visit happen?
              </h3>
              <p className="text-base text-orange-800">
                The provider has marked this visit as done. Please confirm or dispute.
              </p>
              <div className="flex gap-3 pt-2">
                <Button 
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white" 
                  onClick={handleConfirm}
                  disabled={isConfirmPending || isDisputePending}
                >
                  {isConfirmPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Confirm
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={handleDispute}
                  disabled={isConfirmPending || isDisputePending}
                >
                  {isDisputePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                  Dispute
                </Button>
              </div>
            </div>
          )}

          {request.status === "DISPUTED" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col items-center justify-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <p className="text-red-800 font-medium text-center">
                Visit Disputed
              </p>
              <p className="text-red-700 text-base text-center">
                An administrator will review your dispute shortly.
              </p>
            </div>
          )}

          {!isTerminal && (
            <div className="pt-4 border-t flex justify-end">
              <Button
                id="cancel-request-button"
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                onClick={handleCancel}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Cancel Request
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
