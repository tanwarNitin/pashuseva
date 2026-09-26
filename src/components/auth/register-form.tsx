"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { registerAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Locale } from "@/i18n/config";

interface RegisterFormProps {
  locale: Locale;
  dict: {
    register: {
      title: string;
      subtitle: string;
      hasAccount: string;
      loginLink: string;
      phoneLabel: string;
      phonePlaceholder: string;
      nameLabel: string;
      namePlaceholder: string;
      pinLabel: string;
      pinPlaceholder: string;
      confirmPinLabel: string;
      confirmPinPlaceholder: string;
      roleLabel: string;
      roleFarmer: string;
      roleVet: string;
      roleParavet: string;
      showPin: string;
      hidePin: string;
      registerButton: string;
      registering: string;
      pinMismatch: string;
      phoneExists: string;
      invalidPhone: string;
      rateLimited: string;
      errorGeneric: string;
    };
  };
}

type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export function RegisterForm({ locale, dict }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || `/${locale}/discover`;

  const [showPin, setShowPin] = useState(false);
  const [formState, formAction, isPending] = useActionState<FormState, FormData>(
    async (prevState: FormState, formData: FormData): Promise<FormState> => {
      const phone = String(formData.get("phone") ?? "");
      const name = String(formData.get("name") ?? "");
      const pin = String(formData.get("pin") ?? "");
      const confirmPin = String(formData.get("confirmPin") ?? "");
      const role = String(formData.get("role") ?? "") as "FARMER" | "VET_DOCTOR" | "PARAVET_WORKER";

      // Client-side validation
      const fieldErrors: Record<string, string> = {};

      if (!phone) {
        fieldErrors.phone = "Phone number is required";
      } else if (!/^\+91\d{10}$/.test(phone) && !/^\d{10}$/.test(phone)) {
        fieldErrors.phone = dict.register.invalidPhone;
      }

      if (!name || name.trim().length < 2) {
        fieldErrors.name = "Name must be at least 2 characters";
      }

      if (!pin) {
        fieldErrors.pin = "PIN is required";
      } else if (!/^\d{4}$/.test(pin)) {
        fieldErrors.pin = "PIN must be exactly 4 digits";
      }

      if (pin !== confirmPin) {
        fieldErrors.confirmPin = dict.register.pinMismatch;
      }

      if (!role) {
        fieldErrors.role = "Role is required";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { error: undefined, fieldErrors };
      }

      try {
        const result = await registerAction(formData);

        if (!result.ok) {
          return { error: result.messageKey, fieldErrors: {} };
        }

        if (result.data.role !== "FARMER") {
          router.push(`/${locale}/onboarding`);
        } else {
          router.push(callbackUrl);
        }
        router.refresh();
        return { error: undefined, fieldErrors: {} };
      } catch (e) {
        console.error(e);
        return { error: dict.register.errorGeneric, fieldErrors: {} };
      }
    },
    { error: undefined, fieldErrors: {} }
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {formState.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="text-sm">{formState.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
          {dict.register.phoneLabel}
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder={dict.register.phonePlaceholder}
          autoComplete="tel"
          inputMode="numeric"
          className={formState.fieldErrors?.phone ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
          aria-invalid={!!formState.fieldErrors?.phone}
          aria-describedby={formState.fieldErrors?.phone ? "phone-error" : undefined}
          disabled={isPending}
          required
        />
        {formState.fieldErrors?.phone && (
          <p id="phone-error" className="text-sm text-red-600" role="alert">
            {formState.fieldErrors.phone}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
          {dict.register.nameLabel}
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder={dict.register.namePlaceholder}
          autoComplete="name"
          className={formState.fieldErrors?.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
          aria-invalid={!!formState.fieldErrors?.name}
          aria-describedby={formState.fieldErrors?.name ? "name-error" : undefined}
          disabled={isPending}
          required
        />
        {formState.fieldErrors?.name && (
          <p id="name-error" className="text-sm text-red-600" role="alert">
            {formState.fieldErrors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin" className="text-sm font-medium text-gray-700">
          {dict.register.pinLabel}
        </Label>
        <div className="relative">
          <Input
            id="pin"
            name="pin"
            type={showPin ? "text" : "password"}
            placeholder={dict.register.pinPlaceholder}
            autoComplete="new-password"
            inputMode="numeric"
            maxLength={4}
            className={formState.fieldErrors?.pin ? "border-red-500 focus:border-red-500 focus:ring-red-500 pr-12" : "pr-12"}
            aria-invalid={!!formState.fieldErrors?.pin}
            aria-describedby={formState.fieldErrors?.pin ? "pin-error" : undefined}
            disabled={isPending}
            required
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded p-1"
            aria-label={showPin ? dict.register.hidePin : dict.register.showPin}
            aria-pressed={showPin}
            disabled={isPending}
          >
            {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {formState.fieldErrors?.pin && (
          <p id="pin-error" className="text-sm text-red-600" role="alert">
            {formState.fieldErrors.pin}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPin" className="text-sm font-medium text-gray-700">
          {dict.register.confirmPinLabel}
        </Label>
        <Input
          id="confirmPin"
          name="confirmPin"
          type={showPin ? "text" : "password"}
          placeholder={dict.register.confirmPinPlaceholder}
          autoComplete="new-password"
          inputMode="numeric"
          maxLength={4}
          className={formState.fieldErrors?.confirmPin ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
          aria-invalid={!!formState.fieldErrors?.confirmPin}
          aria-describedby={formState.fieldErrors?.confirmPin ? "confirm-pin-error" : undefined}
          disabled={isPending}
          required
        />
        {formState.fieldErrors?.confirmPin && (
          <p id="confirm-pin-error" className="text-sm text-red-600" role="alert">
            {formState.fieldErrors.confirmPin}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role" className="text-sm font-medium text-gray-700">
          {dict.register.roleLabel}
        </Label>
        <select
          id="role"
          name="role"
          className={`w-full px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            formState.fieldErrors?.role ? "border-red-500" : "border-gray-300"
          }`}
          aria-invalid={!!formState.fieldErrors?.role}
          aria-describedby={formState.fieldErrors?.role ? "role-error" : undefined}
          disabled={isPending}
          required
        >
          <option value="" disabled>
            {dict.register.roleLabel}
          </option>
          <option value="FARMER">{dict.register.roleFarmer}</option>
          <option value="VET_DOCTOR">{dict.register.roleVet}</option>
          <option value="PARAVET_WORKER">{dict.register.roleParavet}</option>
        </select>
        {formState.fieldErrors?.role && (
          <p id="role-error" className="text-sm text-red-600" role="alert">
            {formState.fieldErrors.role}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full py-3"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {dict.register.registering}
          </>
        ) : (
          dict.register.registerButton
        )}
      </Button>
    </form>
  );
}