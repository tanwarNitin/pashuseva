"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createRequestAction } from "@/actions/request.actions";
import { getFarmerAnimalsAction } from "@/actions/cattle.actions";

interface SOSCreationModalProps {
  farmerId: string;
  latitude: string;
  longitude: string;
  locale?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SOSCreationModal({
  farmerId,
  latitude,
  longitude,
  locale = "en",
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: SOSCreationModalProps) {
  const dict = useTranslation();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animals, setAnimals] = useState<Array<{ id: string; name: string | null; tagId: string | null; species: string; breed: string | null }>>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  
  const [formData, setFormData] = useState({
    animalId: "",
    serviceCode: "EMERGENCY",
    conditionSummary: "",
  });

  // Fetch farmer's animals when modal opens
  useEffect(() => {
    if (open && farmerId) {
      setLoadingAnimals(true);
      getFarmerAnimalsAction()
        .then((res) => {
          if (res.success && res.animals.length > 0) {
            setAnimals(res.animals);
            setFormData((prev) => ({
              ...prev,
              animalId: prev.animalId || res.animals[0].id,
            }));
          }
        })
        .finally(() => setLoadingAnimals(false));
    }
  }, [open, farmerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      data.append("farmerId", farmerId);
      data.append("kind", "SOS");
      data.append("serviceCode", formData.serviceCode);
      data.append("conditionSummary", formData.conditionSummary);
      data.append("latitude", latitude);
      data.append("longitude", longitude);
      data.append("locationSource", "GPS");
      
      if (formData.animalId) {
        data.append("animalId", formData.animalId);
      }

      // Expires in 30 minutes
      const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();
      data.append("expiresAt", expiresAt);
      data.append("clientRequestId", crypto.randomUUID());
      data.append("idempotencyPayloadHash", "hash-" + Date.now());

      const result = await createRequestAction(data);
      if (result.ok) {
        setOpen(false);
        router.push(`/${locale}/requests/${result.data.requestId}`);
      } else {
        const errorKey = result.messageKey?.replace(/^errors\./, "") || result.code;
        setError((dict.errors as any)[errorKey] || (dict.errors as any)[result.messageKey] || "Failed to create request");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger && <DialogTrigger render={trigger as any} />
      ) : (
        <DialogTrigger 
          render={<Button size="lg" className="bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse h-14 text-base font-bold flex items-center gap-2" />}
        >
          <AlertTriangle className="h-5 w-5" />
          {dict.discovery.emergency}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2 text-xl font-bold">
            <AlertTriangle className="h-6 w-6" />
            {dict.request.sosTitle}
          </DialogTitle>
          <DialogDescription>
            {dict.request.sosSubtitle}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Animal Picker */}
          <div className="space-y-1.5">
            <Label htmlFor="sos-animal-select" className="text-sm font-medium text-gray-700">
              {dict.request.animalType || "Select Affected Animal"} *
            </Label>
            {loadingAnimals ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your registered cattle...
              </div>
            ) : animals.length > 0 ? (
              <select
                id="sos-animal-select"
                value={formData.animalId}
                onChange={(e) => setFormData((prev) => ({ ...prev, animalId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              >
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || "Unnamed"} (Tag: {a.tagId}) — {a.species} {a.breed ? `(${a.breed})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                No cattle currently registered. Your emergency request will still be dispatched with location and condition details.
              </div>
            )}
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="conditionSummary" className="text-sm font-medium text-gray-700">
              {dict.request.conditionSummary} (minimum 10 characters) *
            </Label>
            <Textarea 
              id="conditionSummary" 
              value={formData.conditionSummary}
              onChange={(e) => setFormData((prev) => ({ ...prev, conditionSummary: e.target.value }))}
              placeholder={dict.request.conditionPlaceholder}
              className="min-h-[100px] text-sm"
              minLength={10}
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {dict.common.cancel}
            </Button>
            <Button 
              type="submit" 
              disabled={loading || formData.conditionSummary.trim().length < 10} 
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dict.request.dispatchNow}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
