"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Locale } from "@/i18n/config";

interface LoginFormProps {
  locale: Locale;
  dict: {
    login: {
      title: string;
      subtitle: string;
      noAccount: string;
      registerLink: string;
      phoneLabel: string;
      phonePlaceholder: string;
      pinLabel: string;
      pinPlaceholder: string;
      showPin: string;
      hidePin: string;
      loginButton: string;
      loggingIn: string;
      invalidCredentials: string;
      accountInactive: string;
      rateLimited: string;
      errorGeneric: string;
    };
  };
}

type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export function LoginForm({ locale, dict }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || `/${locale}/discover`;

  const [showPin, setShowPin] = useState(false);
  const [formState, formAction, isPending] = useActionState<FormState, FormData>(
    async (prevState: FormState, formData: FormData): Promise<FormState> => {
      const phone = String(formData.get("phone") ?? "");
      const pin = String(formData.get("pin") ?? "");

      // Client-side validation
      const fieldErrors: Record<string, string> = {};

      if (!phone) {
        fieldErrors.phone = "Phone number is required";
      } else if (!/^\+91\d{10}$/.test(phone) && !/^\d{10}$/.test(phone)) {
        fieldErrors.phone = "Enter a valid 10-digit Indian phone number";
      }

      if (!pin) {
        fieldErrors.pin = "PIN is required";
      } else if (!/^\d{4}$/.test(pin)) {
        fieldErrors.pin = "PIN must be exactly 4 digits";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { error: undefined, fieldErrors };
      }

      try {
        const result = await loginAction(formData);

        if (!result.ok) {
          return { error: result.messageKey, fieldErrors: {} };
        }

        const explicitCallback = searchParams.get("callbackUrl");
        if (explicitCallback) {
          router.push(explicitCallback);
        } else if (result.data?.role === "ADMIN") {
          router.push(`/${locale}/admin/providers/verify`);
        } else if (result.data?.role === "VET_DOCTOR" || result.data?.role === "PARAVET_WORKER") {
          router.push(`/${locale}/dashboard`);
        } else {
          router.push(callbackUrl);
        }
        router.refresh();
        return { error: undefined, fieldErrors: {} };
      } catch {
        return { error: dict.login.errorGeneric, fieldErrors: {} };
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
          {dict.login.phoneLabel}
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder={dict.login.phonePlaceholder}
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
        <Label htmlFor="pin" className="text-sm font-medium text-gray-700">
          {dict.login.pinLabel}
        </Label>
        <div className="relative">
          <Input
            id="pin"
            name="pin"
            type={showPin ? "text" : "password"}
            placeholder={dict.login.pinPlaceholder}
            autoComplete="one-time-code"
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
            aria-label={showPin ? dict.login.hidePin : dict.login.showPin}
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

      <Button
        type="submit"
        className="w-full py-3"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {dict.login.loggingIn}
          </>
        ) : (
          dict.login.loginButton
        )}
      </Button>
    </form>
  );
}