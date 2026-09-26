"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewProviderAction } from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Provider = {
  id: string;
  name: string;
  role: string;
  phone: string;
  qualification: string | null;
  registrationNumber: string | null;
  registrationAuthority: string | null;
  registrationDocumentPath: string | null;
  verificationStatus: string;
  createdAt: Date;
};

export function VerifyClient({ initialProviders, currentStatus, locale }: { initialProviders: Provider[], currentStatus: string, locale: string }) {
  const router = useRouter();
  
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "SUSPEND" | "REINSTATE" | null>(null);
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTabChange = (val: string) => {
    router.push(`/${locale}/admin/providers/verify?status=${val}`);
  };

  const handleAction = async () => {
    if (!selectedProvider || !actionType) return;
    
    // Validation
    if ((actionType === "REJECT" || actionType === "SUSPEND") && !notes.trim()) {
      alert("Please provide a mandatory reason in the notes field.");
      return;
    }

    setIsSubmitting(true);
    try {
      let decision: "VERIFIED" | "REJECTED" | "SUSPENDED" | "PENDING" = "PENDING";
      if (actionType === "APPROVE" || actionType === "REINSTATE") decision = "VERIFIED";
      if (actionType === "REJECT") decision = "REJECTED";
      if (actionType === "SUSPEND") decision = "SUSPENDED";

      await reviewProviderAction({
        providerId: selectedProvider.id,
        decision,
        notes: notes.trim() || undefined,
        evidenceReference: evidence.trim() || undefined,
      });
      
      setSelectedProvider(null);
      setActionType(null);
      setNotes("");
      setEvidence("");
      // router.refresh() is called in the server action via revalidatePath
    } catch (e: any) {
      alert(e.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={currentStatus} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="VERIFIED">Verified</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="SUSPENDED">Suspended</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Qualifications</TableHead>
              <TableHead>License Details</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Submitted On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialProviders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No providers found for this status.
                </TableCell>
              </TableRow>
            ) : (
              initialProviders.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.role === "VET_DOCTOR" ? "Vet Doctor" : "Paravet"}</Badge>
                  </TableCell>
                  <TableCell>{p.phone}</TableCell>
                  <TableCell>{p.qualification || "N/A"}</TableCell>
                  <TableCell>
                    {p.registrationNumber ? (
                      <div>
                        <div className="font-medium">{p.registrationNumber}</div>
                        <div className="text-xs text-gray-500">{p.registrationAuthority}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not provided</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.registrationDocumentPath ? (
                      <a 
                        href={`/api/provider/documents?path=${encodeURIComponent(p.registrationDocumentPath)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Doc
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    {p.verificationStatus === "PENDING" && (
                      <>
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => { setSelectedProvider(p); setActionType("APPROVE"); }}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => { setSelectedProvider(p); setActionType("REJECT"); }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {p.verificationStatus === "VERIFIED" && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => { setSelectedProvider(p); setActionType("SUSPEND"); }}
                      >
                        Suspend
                      </Button>
                    )}
                    {p.verificationStatus === "SUSPENDED" && (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => { setSelectedProvider(p); setActionType("REINSTATE"); }}
                      >
                        Reinstate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!actionType} onOpenChange={(open) => !open && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "APPROVE" && "Approve Provider"}
              {actionType === "REJECT" && "Reject Provider"}
              {actionType === "SUSPEND" && "Suspend Provider"}
              {actionType === "REINSTATE" && "Reinstate Provider"}
            </DialogTitle>
            <DialogDescription>
              Action for {selectedProvider?.name} ({selectedProvider?.phone})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                Reason / Notes {(actionType === "REJECT" || actionType === "SUSPEND") && <span className="text-red-500">*</span>}
              </Label>
              <Textarea 
                id="notes" 
                placeholder="Enter detailed reason or notes for this decision..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="evidence">Evidence Reference (Optional)</Label>
              <Input 
                id="evidence" 
                placeholder="e.g., State Registry Link, Verification ID..." 
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              variant={actionType === "REJECT" || actionType === "SUSPEND" ? "destructive" : "default"}
              onClick={handleAction} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
