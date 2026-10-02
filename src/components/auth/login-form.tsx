"use client";

import { useState, useRef } from "react";
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
  const [pinValues, setPinValues] = useState(["", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const newValues = [...pinValues];
    newValues[index] = digit;
    setPinValues(newValues);

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pinValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pasted) return;
    
    const newValues = [...pinValues];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setPinValues(newValues);
    
    const focusIndex = Math.min(pasted.length, 3);
    if (focusIndex < 4) {
      inputRefs.current[focusIndex]?.focus();
    } else {
      inputRefs.current[3]?.focus();
    }
  };

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
        <div className={`flex rounded-md border bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary ${formState.fieldErrors?.phone ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500" : "border-input"}`}>
          <div className="flex items-center pl-3 pr-2 text-gray-500 sm:text-sm border-r border-input bg-gray-50 rounded-l-md">
            +91
          </div>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="XXXXX XXXXX"
            autoComplete="tel"
            inputMode="numeric"
            className="border-0 focus-visible:ring-0 shadow-none rounded-l-none"
            aria-invalid={!!formState.fieldErrors?.phone}
            aria-describedby={formState.fieldErrors?.phone ? "phone-error" : undefined}
            disabled={isPending}
            required
          />
        </div>
        {formState.fieldErrors?.phone && (
          <p id="phone-error" className="text-sm text-red-600" role="alert">
            {formState.fieldErrors.phone}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label htmlFor="pin-0" className="text-sm font-medium text-gray-700">
            {dict.login.pinLabel}
          </Label>
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            disabled={isPending}
          >
            {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPin ? dict.login.hidePin : dict.login.showPin}
          </button>
        </div>
        <div className="flex gap-3 justify-between">
          <input type="hidden" name="pin" value={pinValues.join("")} />
          {[0, 1, 2, 3].map((index) => (
            <Input
              key={index}
              id={`pin-${index}`}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={1}
              value={pinValues[index]}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handlePinKeyDown(index, e)}
              onPaste={handlePinPaste}
              className={`w-14 h-14 text-center text-xl font-bold ${formState.fieldErrors?.pin ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={isPending}
              aria-invalid={!!formState.fieldErrors?.pin}
              required={index === 0}
            />
          ))}
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