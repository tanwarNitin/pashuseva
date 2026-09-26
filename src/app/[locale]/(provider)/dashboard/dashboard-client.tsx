"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Shield,
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Compass,
  Navigation,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  acceptRequestAction,
  declineRequestAction,
  startRequestAction,
  markRequestDoneAction,
} from "@/actions/request.actions";
import {
  acceptRoutineBookingAction,
  declineRoutineBookingAction,
  completeRoutineBookingAction,
} from "@/actions/routine.actions";
import {
  toggleDutyStatusAction,
  renewDutyAction,
  updateLocationAction,
} from "@/actions/provider.actions";
import { en, Dictionary } from "@/i18n/dictionaries/en";
import { Locale } from "@/i18n/config";
import { PushToggle } from "@/components/ui/push-toggle";

interface ProviderProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  role: "VET_DOCTOR" | "PARAVET_WORKER";
  registrationNumber: string;
  registrationAuthority: string;
  qualification: string;
  specializationArea: string | null;
  yearsOfExperience: number | null;
  bio: string | null;
  district: string | null;
  state: string | null;
  villageOrServiceArea: string | null;
  baseVisitFeePaise: number | null;
  perKmFeePaise: number | null;
  serviceRadiusMeters: number | null;
  preferWhatsApp: boolean;
  dutyStatus: "ON_DUTY" | "OFF_DUTY" | string;
  dutyExpiresAt: string | Date | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED" | string;
  latitude: string | null;
  longitude: string | null;
  locationConfirmedAt: string | Date | null;
}

interface ServiceRequest {
  id: string;
  animalId: string | null;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  kind: "SOS" | "ROUTINE";
  serviceCode: string;
  conditionSummary: string;
  status: string;
  offerStatus?: string;
  latitude: string;
  longitude: string;
  locationDescription: string | null;
  distanceMeters?: number | null;
  estimatedTotalPaise?: number | null;
  expiresAt: string;
  scheduledFor?: string | null;
  createdAt: string;
  acceptedProviderId?: string | null;
}

interface ProviderDashboardClientProps {
  dict?: Dictionary;
  locale?: Locale;
}

export function TrustBadge({
  role,
  verificationStatus,
  registrationAuthority,
  dict,
}: {
  role: "VET_DOCTOR" | "PARAVET_WORKER";
  verificationStatus: string;
  registrationAuthority?: string;
  dict: Dictionary;
}) {
  const isVet = role === "VET_DOCTOR";
  if (verificationStatus === "VERIFIED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Shield className="w-3.5 h-3.5 text-emerald-600" />
        {isVet
          ? `${dict.provider.trustBadge.verifiedVet} • ${registrationAuthority || "VCI"}`
          : `${dict.provider.trustBadge.verifiedParavet} • ${registrationAuthority || "State Board"}`}
      </span>
    );
  }
  if (verificationStatus === "SUSPENDED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3.5 h-3.5 text-red-600" />
        {dict.provider.trustBadge.suspended}
      </span>
    );
  }
  if (verificationStatus === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3.5 h-3.5 text-red-600" />
        {dict.provider.trustBadge.rejected}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3.5 h-3.5 text-amber-600" />
      {dict.provider.trustBadge.pending}
    </span>
  );
}

function formatRelativeTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "Not set";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatCountdown(targetDateStr: string | Date | null | undefined): string {
  if (!targetDateStr) return "—";
  const diffMs = new Date(targetDateStr).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const diffSecs = Math.floor(diffMs / 1000);
  const mins = Math.floor(diffSecs / 60);
  const hours = Math.floor(mins / 60);
  if (hours > 0) {
    return `${hours}h ${mins % 60}m`;
  }
  return `${mins}m ${diffSecs % 60}s`;
}

export default function ProviderDashboardClient({
  dict = en,
  locale = "en",
}: ProviderDashboardClientProps = {}) {
  const router = useRouter();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [routineBookings, setRoutineBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDutyLoading, setIsDutyLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  // Periodic tick for live countdown timers
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch profile and requests
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const [profileRes, requestsRes, routineRes] = await Promise.all([
        fetch("/api/provider/profile", { cache: "no-store" }),
        fetch("/api/provider/requests", { cache: "no-store" }),
        fetch("/api/provider/routine-requests", { cache: "no-store" }),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      } else if (profileRes.status === 401) {
        router.push(`/${locale}/login`);
        return;
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(Array.isArray(requestsData) ? requestsData : []);
      }
      if (routineRes.ok) {
        const routineData = await routineRes.json();
        setRoutineBookings(Array.isArray(routineData) ? routineData : []);
      }
      setLastFetched(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [locale, router]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Visibility-aware polling (~10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [fetchData]);

  // Duty Toggle Handler
  const handleToggleDuty = async (newChecked: boolean) => {
    if (!profile) return;
    setIsDutyLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const targetStatus = newChecked ? "ON_DUTY" : "OFF_DUTY";

      // If going ON_DUTY, obtain current geolocation if available
      let lat = profile.latitude;
      let lng = profile.longitude;

      if (newChecked && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 6000,
              enableHighAccuracy: true,
            });
          });
          lat = pos.coords.latitude.toString();
          lng = pos.coords.longitude.toString();
        } catch {
          // Fall back to saved coordinates
        }
      }

      const formData = new FormData();
      formData.set("dutyStatus", targetStatus);
      if (lat && lng) {
        formData.set("latitude", lat);
        formData.set("longitude", lng);
      }

      const result = await toggleDutyStatusAction(formData);

      if (!result.ok) {
        setActionError(result.messageKey);
      } else {
        setProfile((prev) => (prev ? { ...prev, ...result.data } : null));
        fetchData(true);
      }
    } catch {
      setActionError("Failed to update duty status");
    } finally {
      setIsDutyLoading(false);
    }
  };

  // Renew 8-Hour Duty Lease
  const handleRenewDuty = async () => {
    setIsDutyLoading(true);
    setActionError(null);
    try {
      const result = await renewDutyAction();
      if (!result.ok) {
        setActionError(result.messageKey);
      } else {
        setProfile((prev) =>
          prev ? { ...prev, dutyExpiresAt: result.data.dutyExpiresAt.toISOString(), dutyStatus: "ON_DUTY" } : null
        );
        setActionSuccess("Duty lease renewed for 8 hours");
      }
    } catch {
      setActionError("Failed to renew duty");
    } finally {
      setIsDutyLoading(false);
    }
  };

  // Update GPS Location
  const handleUpdateLocation = async () => {
    if (!navigator.geolocation) {
      setActionError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocationLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true,
        });
      });

      const formData = new FormData();
      formData.set("latitude", pos.coords.latitude.toString());
      formData.set("longitude", pos.coords.longitude.toString());
      formData.set("accuracyM", Math.round(pos.coords.accuracy).toString());

      const result = await updateLocationAction(formData);

      if (!result.ok) {
        setActionError(result.messageKey);
      } else {
        setProfile((prev) =>
          prev
            ? {
              ...prev,
              latitude: pos.coords.latitude.toString(),
              longitude: pos.coords.longitude.toString(),
              locationConfirmedAt: result.data.locationConfirmedAt.toISOString(),
            }
            : null
        );
        setActionSuccess(dict.provider.dutyCard.locationUpdated);
      }
    } catch (e: any) {
      setActionError(e.message || "Could not retrieve GPS coordinates");
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Request Lifecycle Handlers
  const handleAccept = async (requestId: string) => {
    if (!profile) return;
    setPendingActionId(requestId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const formData = new FormData();
      formData.set("requestId", requestId);
      formData.set("providerId", profile.userId);

      const result = await acceptRequestAction(formData);
      if (!result.ok) {
        setActionError(
          result.code === "CONFLICT"
            ? dict.provider.requestsFeed.acceptConflict
            : result.messageKey
        );
      } else {
        setActionSuccess("Request accepted! It is now in your active assignments.");
      }
      fetchData(true);
    } catch {
      setActionError("Failed to accept request");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    if (!profile) return;
    setPendingActionId(requestId);
    setActionError(null);

    try {
      const formData = new FormData();
      formData.set("requestId", requestId);
      formData.set("providerId", profile.userId);
      formData.set("reason", "Provider declined via dashboard");

      const result = await declineRequestAction(formData);
      if (!result.ok) {
        setActionError(result.messageKey);
      }
      fetchData(true);
    } catch {
      setActionError("Failed to decline request");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleStart = async (requestId: string) => {
    if (!profile) return;
    setPendingActionId(requestId);
    setActionError(null);

    try {
      const formData = new FormData();
      formData.set("requestId", requestId);
      formData.set("providerId", profile.userId);

      const result = await startRequestAction(formData);
      if (!result.ok) {
        setActionError(result.messageKey);
      }
      fetchData(true);
    } catch {
      setActionError("Failed to update status");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleComplete = async (requestId: string) => {
    if (!profile) return;
    setPendingActionId(requestId);
    setActionError(null);

    try {
      const formData = new FormData();
      formData.set("requestId", requestId);
      formData.set("providerId", profile.userId);

      const result = await markRequestDoneAction(formData);
      if (!result.ok) {
        setActionError(result.messageKey);
      } else {
        setActionSuccess(dict.provider.requestsFeed.markedDoneWaitConfirm || "Visit marked as done. Waiting for confirmation.");
      }
      fetchData(true);
    } catch {
      setActionError("Failed to mark visit done");
    } finally {
      setPendingActionId(null);
    }
  };

  // Routine Actions
  const handleAcceptRoutine = async (bookingId: string) => {
    if (!profile) return;
    setPendingActionId(bookingId);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.set("id", bookingId);
      const result = await acceptRoutineBookingAction(formData);
      if (!result.ok) setActionError(result.messageKey);
      else setActionSuccess("Routine visit accepted!");
      fetchData(true);
    } catch {
      setActionError("Failed to accept routine booking");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleDeclineRoutine = async (bookingId: string) => {
    if (!profile) return;
    setPendingActionId(bookingId);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.set("id", bookingId);
      const result = await declineRoutineBookingAction(formData);
      if (!result.ok) setActionError(result.messageKey);
      fetchData(true);
    } catch {
      setActionError("Failed to decline routine booking");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleCompleteRoutine = async (bookingId: string) => {
    if (!profile) return;
    setPendingActionId(bookingId);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.set("id", bookingId);
      const result = await completeRoutineBookingAction(formData);
      if (!result.ok) setActionError(result.messageKey);
      else setActionSuccess("Routine visit marked as completed!");
      fetchData(true);
    } catch {
      setActionError("Failed to complete routine booking");
    } finally {
      setPendingActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm text-gray-500">{dict.common.loading}</p>
      </div>
    );
  }

  const isVerified = profile?.verificationStatus === "VERIFIED";
  const isOnDuty = profile?.dutyStatus === "ON_DUTY";
  const leaseExpired =
    profile?.dutyExpiresAt && new Date(profile.dutyExpiresAt).getTime() <= Date.now();

  const activeRequests = requests.filter(
    (r) => ["ACCEPTED", "IN_PROGRESS", "AWAITING_CONFIRMATION", "DISPUTED"].includes(r.status)
  );
  const incomingRequests = requests.filter(
    (r) => r.status === "OPEN" && r.offerStatus === "PENDING"
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PushToggle />
      </div>

      {/* Notifications / Alerts */}
      {actionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {actionSuccess && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <Check className="h-4 w-4 text-emerald-600" />
          <AlertDescription>{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Top Profile & Duty Management Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card with Trust Badge */}
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {profile?.name}
                </CardTitle>
                <CardDescription className="text-sm text-gray-500 mt-0.5">
                  {profile?.qualification} • {profile?.role === "VET_DOCTOR" ? "Veterinary Doctor" : "Paravet Worker"}
                </CardDescription>
              </div>
            </div>
            <div className="mt-2.5">
              {profile && (
                <TrustBadge
                  role={profile.role}
                  verificationStatus={profile.verificationStatus}
                  registrationAuthority={profile.registrationAuthority}
                  dict={dict}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between py-1 border-t border-gray-100">
              <span className="text-gray-500">{dict.provider.onboarding.registrationNumber}</span>
              <span className="font-medium text-gray-900">{profile?.registrationNumber}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-gray-100">
              <span className="text-gray-500">{dict.provider.onboarding.baseVisitFeePaise}</span>
              <span className="font-medium text-gray-900">
                ₹{((profile?.baseVisitFeePaise || 0) / 100).toFixed(0)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-gray-100">
              <span className="text-gray-500">{dict.provider.onboarding.perKmFeePaise}</span>
              <span className="font-medium text-gray-900">
                ₹{((profile?.perKmFeePaise || 0) / 100).toFixed(0)}/km
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Duty Control Card */}
        <Card className="md:col-span-2 shadow-sm border-primary-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  {dict.provider.dutyCard.title}
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-1">
                  {!isVerified
                    ? dict.provider.dutyCard.dutyHelpPending
                    : isOnDuty
                      ? dict.provider.dutyCard.dutyHelpOn
                      : dict.provider.dutyCard.dutyHelpOff}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-semibold ${isOnDuty && !leaseExpired ? "text-emerald-600" : "text-gray-500"
                    }`}
                >
                  {isOnDuty && !leaseExpired ? dict.provider.onDuty : dict.provider.offDuty}
                </span>
                <Switch
                  checked={isOnDuty && !leaseExpired}
                  onCheckedChange={handleToggleDuty}
                  disabled={!isVerified || isDutyLoading}
                  aria-label={dict.provider.toggleDuty}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Duty Lease and Location status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              {/* Lease info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {dict.provider.dutyCard.activeLease}
                  </span>
                  {isOnDuty && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRenewDuty}
                      disabled={isDutyLoading || !isVerified}
                      className="h-6 text-xs text-primary-600 hover:text-primary-700 p-0"
                    >
                      {dict.provider.dutyCard.renewDuty}
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {isOnDuty
                    ? leaseExpired
                      ? dict.provider.dutyCard.expired
                      : `${dict.provider.dutyCard.expiresIn} ${formatCountdown(profile?.dutyExpiresAt)}`
                    : dict.provider.offDuty}
                </p>
              </div>

              {/* Location info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {dict.provider.dutyCard.locationFreshness}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUpdateLocation}
                    disabled={isLocationLoading}
                    className="h-6 text-xs text-primary-600 hover:text-primary-700 p-0"
                  >
                    {isLocationLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : null}
                    {dict.provider.dutyCard.refreshLocation}
                  </Button>
                </div>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {profile?.locationConfirmedAt
                    ? formatRelativeTime(profile.locationConfirmedAt)
                    : "Coordinates unconfirmed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Polling Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>{dict.provider.requestsFeed.liveUpdatesNotice}</span>
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span>
              Updated {formatRelativeTime(lastFetched.toISOString())}
            </span>
          )}
          <button
            onClick={() => fetchData()}
            disabled={isRefreshing}
            className="p-1 hover:text-gray-900 transition-colors focus:outline-none"
            aria-label="Refresh live feed"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Section 1: Active Assigned Requests */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>{dict.provider.requestsFeed.activeRequests}</span>
          <Badge variant="secondary" className="font-semibold text-xs">
            {activeRequests.length}
          </Badge>
        </h2>

        {activeRequests.length === 0 ? (
          <Card className="bg-white border-dashed shadow-none">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-gray-500">
                {dict.provider.requestsFeed.noActive}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeRequests.map((req) => (
              <Card
                key={req.id}
                className="border-l-4 border-l-primary-600 shadow-sm bg-white"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={
                            req.kind === "SOS"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                          }
                        >
                          {req.kind === "SOS"
                            ? dict.provider.requestsFeed.emergencyBadge
                            : dict.provider.requestsFeed.routineBadge}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {req.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {req.farmerName}
                      </h3>
                      {req.locationDescription && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {req.locationDescription}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      {req.estimatedTotalPaise && (
                        <p className="font-bold text-lg text-gray-900">
                          ₹{(req.estimatedTotalPaise / 100).toFixed(0)}
                        </p>
                      )}
                      {req.distanceMeters && (
                        <p className="text-xs text-gray-500">
                          {(req.distanceMeters / 1000).toFixed(1)} km away
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                    {req.conditionSummary}
                  </p>

                  {/* Actions & Contact Links */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${req.farmerPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {dict.provider.requestsFeed.contactFarmer}
                      </a>
                      <a
                        href={`https://wa.me/${req.farmerPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        {dict.provider.requestsFeed.whatsAppFarmer}
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === "ACCEPTED" && (
                        <Button
                          size="sm"
                          onClick={() => handleStart(req.id)}
                          disabled={pendingActionId === req.id}
                          className="bg-primary-600 hover:bg-primary-700 text-white"
                        >
                          {pendingActionId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Navigation className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {dict.provider.requestsFeed.start}
                        </Button>
                      )}

                      {req.status === "IN_PROGRESS" && (
                        <Button
                          size="sm"
                          onClick={() => handleComplete(req.id)}
                          disabled={pendingActionId === req.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {pendingActionId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {dict.provider.requestsFeed.markDone || "Mark visit done"}
                        </Button>
                      )}
                      {["AWAITING_CONFIRMATION", "DISPUTED"].includes(req.status) && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 py-1.5 px-3">
                          <Clock className="w-3.5 h-3.5 mr-1.5 inline" />
                          {dict.provider.requestsFeed.waitingConfirmation || "Waiting for farmer confirmation"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Incoming Requests Feed */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>{dict.provider.requestsFeed.incomingFeed}</span>
          <Badge variant="secondary" className="font-semibold text-xs">
            {incomingRequests.length}
          </Badge>
        </h2>

        {incomingRequests.length === 0 ? (
          <Card className="bg-white border-dashed shadow-none">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-gray-500">
                {dict.provider.requestsFeed.noIncoming}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {incomingRequests.map((req) => (
              <Card
                key={req.id}
                className={`border-l-4 ${req.kind === "SOS" ? "border-l-red-500" : "border-l-blue-500"
                  } shadow-sm bg-white`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={
                            req.kind === "SOS"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "bg-blue-100 text-blue-800 border-blue-200"
                          }
                        >
                          {req.kind === "SOS"
                            ? dict.provider.requestsFeed.emergencyBadge
                            : dict.provider.requestsFeed.routineBadge}
                        </Badge>
                        <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {dict.provider.requestsFeed.expiresIn} {formatCountdown(req.expiresAt)}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {req.farmerName}
                      </h3>
                      {req.locationDescription && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {req.locationDescription}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      {req.estimatedTotalPaise && (
                        <p className="font-bold text-lg text-gray-900">
                          ₹{(req.estimatedTotalPaise / 100).toFixed(0)}
                        </p>
                      )}
                      {req.distanceMeters && (
                        <p className="text-xs text-gray-500">
                          {(req.distanceMeters / 1000).toFixed(1)} km away
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                    {req.conditionSummary}
                  </p>

                  {/* Accept / Decline actions */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecline(req.id)}
                      disabled={pendingActionId === req.id}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {dict.provider.requestsFeed.decline}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(req.id)}
                      disabled={pendingActionId === req.id || !isOnDuty}
                      className="bg-primary-600 hover:bg-primary-700 text-white font-semibold"
                    >
                      {pendingActionId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {dict.provider.requestsFeed.accept}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Upcoming Routine Visits */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>{dict.routine?.upcomingVisits || "Upcoming Routine Visits"}</span>
          <Badge variant="secondary" className="font-semibold text-xs">
            {routineBookings.filter(b => b.status === "REQUESTED" || b.status === "CONFIRMED").length}
          </Badge>
        </h2>
        {routineBookings.filter(b => b.status === "REQUESTED" || b.status === "CONFIRMED").length === 0 ? (
          <Card className="bg-white border-dashed shadow-none">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-gray-500">
                {dict.routine?.noUpcoming || "No upcoming routine visits"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {routineBookings
              .filter(b => b.status === "REQUESTED" || b.status === "CONFIRMED")
              .map((req) => (
                <Card
                  key={req.id}
                  className="border-l-4 border-l-blue-500 shadow-sm bg-white"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {dict.provider.requestsFeed.routineBadge || "ROUTINE VISIT"}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {req.status}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {req.farmerName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(req.scheduledFor).toLocaleString(locale)}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      <span className="font-semibold">{dict.routine?.reason || "Reason"}: </span>
                      {req.reason}
                    </p>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                      <a
                        href={`tel:${req.farmerPhone}`}
                        className="inline-flex mr-auto items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {dict.provider.requestsFeed.contactFarmer || "Call"}
                      </a>

                      {req.status === "REQUESTED" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeclineRoutine(req.id)}
                            disabled={pendingActionId === req.id}
                          >
                            {dict.provider.requestsFeed.decline || "Decline"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRoutine(req.id)}
                            disabled={pendingActionId === req.id}
                            className="bg-primary-600 hover:bg-primary-700 text-white"
                          >
                            {pendingActionId === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {dict.provider.requestsFeed.accept || "Accept"}
                          </Button>
                        </>
                      )}

                      {req.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteRoutine(req.id)}
                          disabled={pendingActionId === req.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {pendingActionId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {dict.provider.requestsFeed.complete || "Complete"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}