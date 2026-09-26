"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { onboardingAction } from "@/actions/provider.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Locale } from "@/i18n/config";

interface OnboardingFormProps {
  locale: Locale;
  dict: {
    title: string;
    subtitle: string;
    qualification: string;
    registrationNumber: string;
    registrationAuthority: string;
    specializationArea: string;
    yearsOfExperience: string;
    serviceRadiusMeters: string;
    baseVisitFeePaise: string;
    perKmFeePaise: string;
    preferWhatsApp: string;
    document: string;
    submit: string;
    submitting: string;
    success: string;
  };
}

type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

export function OnboardingForm({ locale, dict }: OnboardingFormProps) {
  const router = useRouter();

  const [formState, formAction, isPending] = useActionState<FormState, FormData>(
    async (prevState: FormState, formData: FormData): Promise<FormState> => {
      // Basic Client Validation
      const fieldErrors: Record<string, string[]> = {};
      
      const file = formData.get("document") as File | null;
      if (file && file.size > 5 * 1024 * 1024) {
        fieldErrors.document = ["File too large. Max 5MB allowed."];
      }

      // Convert rupees to paise
      const baseFee = formData.get("baseVisitFeePaise");
      if (baseFee) {
          formData.set("baseVisitFeePaise", (Number(baseFee) * 100).toString());
      }
      const perKmFee = formData.get("perKmFeePaise");
      if (perKmFee) {
          formData.set("perKmFeePaise", (Number(perKmFee) * 100).toString());
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { error: undefined, fieldErrors };
      }

      try {
        const result = await onboardingAction(formData);

        if (!result.ok) {
          if (result.code === "VALIDATION_ERROR" && result.fieldErrors) {
             return { error: undefined, fieldErrors: result.fieldErrors };
          }
          return { error: result.messageKey, fieldErrors: {} };
        }

        router.push(`/${locale}/dashboard`);
        router.refresh();
        return { success: true, fieldErrors: {} };
      } catch {
        return { error: "Something went wrong.", fieldErrors: {} };
      }
    },
    { error: undefined, fieldErrors: {} }
  );

  if (formState.success) {
    return (
      <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
        <h3 className="text-lg font-medium text-green-900 mb-2">{dict.success}</h3>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {formState.error && (
        <Alert variant="destructive">
          <AlertDescription>{formState.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="qualification">{dict.qualification} *</Label>
            <Input id="qualification" name="qualification" required disabled={isPending} />
            {formState.fieldErrors?.qualification && (
              <p className="text-sm text-red-600">{formState.fieldErrors.qualification[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specializationArea">{dict.specializationArea}</Label>
            <Input id="specializationArea" name="specializationArea" disabled={isPending} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">{dict.registrationNumber} *</Label>
            <Input id="registrationNumber" name="registrationNumber" required disabled={isPending} />
            {formState.fieldErrors?.registrationNumber && (
              <p className="text-sm text-red-600">{formState.fieldErrors.registrationNumber[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationAuthority">{dict.registrationAuthority} *</Label>
            <Input id="registrationAuthority" name="registrationAuthority" required disabled={isPending} />
            {formState.fieldErrors?.registrationAuthority && (
              <p className="text-sm text-red-600">{formState.fieldErrors.registrationAuthority[0]}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="yearsOfExperience">{dict.yearsOfExperience}</Label>
            <Input id="yearsOfExperience" name="yearsOfExperience" type="number" min="0" disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceRadiusMeters">{dict.serviceRadiusMeters}</Label>
            <Input id="serviceRadiusMeters" name="serviceRadiusMeters" type="number" min="0" defaultValue="10000" disabled={isPending} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="baseVisitFeePaise">{dict.baseVisitFeePaise} *</Label>
            <Input id="baseVisitFeePaise" name="baseVisitFeePaise" type="number" min="0" defaultValue="100" disabled={isPending} />
            <p className="text-xs text-gray-500">Enter value in ₹</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="perKmFeePaise">{dict.perKmFeePaise} *</Label>
            <Input id="perKmFeePaise" name="perKmFeePaise" type="number" min="0" defaultValue="10" disabled={isPending} />
             <p className="text-xs text-gray-500">Enter value in ₹</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="document">{dict.document} *</Label>
          <Input id="document" name="document" type="file" accept=".pdf,.jpg,.png" required disabled={isPending} />
          <p className="text-xs text-gray-500">Max size 5MB. PDF, JPG, PNG only.</p>
          {formState.fieldErrors?.document && (
             <p className="text-sm text-red-600">{formState.fieldErrors.document[0]}</p>
          )}
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox id="preferWhatsApp" name="preferWhatsApp" value="true" disabled={isPending} />
          <Label htmlFor="preferWhatsApp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {dict.preferWhatsApp}
          </Label>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {dict.submitting}
          </>
        ) : (
          dict.submit
        )}
      </Button>
    </form>
  );
}
