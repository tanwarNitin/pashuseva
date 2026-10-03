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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
        <Shield className="w-3.5 h-3.5 text-primary-600" />
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
        <p className="text-base text-foreground">{dict.common.loading}</p>
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
    <div className="space-y-6 max-w-[880px] mx-auto">
      {/* Notifications / Alerts */}
      {actionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {actionSuccess && (
        <Alert className="border-primary-200 bg-primary-50 text-primary-800">
          <Check className="h-4 w-4 text-primary-600" />
          <AlertDescription>{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Full-width DUTY HERO BAND */}
      <div className={`p-4 md:p-6 rounded-xl border flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-sm transition-colors ${isOnDuty && !leaseExpired ? 'bg-primary-900 text-white border-primary-900' : 'bg-gray-100 text-gray-900 border-gray-200'}`}>
        {/* Left: Identity */}
        <div className="flex-1 flex items-center gap-3 w-full">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-medium">{profile?.name}</h2>
              {isVerified && (
                <Shield className={`w-4 h-4 ${isOnDuty && !leaseExpired ? 'text-primary-400' : 'text-primary-600'}`} />
              )}
            </div>
            <p className={`text-xs md:text-sm mt-0.5 ${isOnDuty && !leaseExpired ? 'text-primary-100/80' : 'text-gray-500'}`}>
              {profile?.qualification} • {profile?.role ? dict.roles[profile.role as keyof typeof dict.roles] || profile.role : ""}
            </p>
          </div>
        </div>

        {/* Middle: Duty Lease & Location */}
        <div className="flex-1 flex flex-col items-center md:items-start w-full text-center md:text-left gap-1.5">
          <div className="flex flex-col items-center md:items-start gap-1">
            {isOnDuty ? (
              leaseExpired ? (
                <span className={`text-2xl font-bold tracking-hero ${isOnDuty && !leaseExpired ? 'text-primary-200' : 'text-gray-600'}`}>{dict.provider.dutyCard.expired}</span>
              ) : (
                <div className="flex flex-col md:items-start items-center">
                  <span className="text-xs text-primary-100/80 uppercase tracking-widest">{dict.provider.dutyCard.expiresIn}</span>
                  <span className="text-4xl md:text-5xl font-black font-mono tracking-hero text-white tabular-nums leading-none mt-1">
                    {formatCountdown(profile?.dutyExpiresAt)}
                  </span>
                </div>
              )
            ) : (
              <span className="text-4xl md:text-5xl font-black tracking-hero text-gray-900">{dict.provider.offDuty}</span>
            )}
            {isOnDuty && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRenewDuty}
                disabled={isDutyLoading || !isVerified}
                className={`h-7 px-3 text-xs font-semibold ${isOnDuty && !leaseExpired ? 'bg-primary-800 text-primary-100 hover:bg-primary-700 border-primary-700 hover:text-white' : ''}`}
              >
                {dict.provider.dutyCard.renewDuty}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs">
             <MapPin className={`w-3.5 h-3.5 ${isOnDuty && !leaseExpired ? 'text-primary-300' : 'text-gray-400'}`} />
             <span className={isOnDuty && !leaseExpired ? 'text-primary-100/80' : 'text-gray-500'}>
               {profile?.locationConfirmedAt
                    ? formatRelativeTime(profile.locationConfirmedAt)
                    : dict.provider.dutyCard.coordinatesUnconfirmed}
             </span>
             <button
               onClick={handleUpdateLocation}
               disabled={isLocationLoading}
               className={`font-semibold underline ${isOnDuty && !leaseExpired ? 'text-primary-200 hover:text-white' : 'text-primary-600 hover:text-primary-700'}`}
             >
               {isLocationLoading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
               {dict.provider.dutyCard.refreshLocation}
             </button>
          </div>
        </div>

        {/* Right: Toggle & Push Notifications */}
        <div className="flex items-center gap-4 shrink-0 justify-between w-full md:w-auto">
          <div className={`p-1 rounded flex items-center ${isOnDuty && !leaseExpired ? 'bg-primary-800' : 'bg-white/50'}`}>
             <PushToggle />
          </div>
          <div className="flex items-center gap-3">
             <span className={`text-sm font-bold ${isOnDuty && !leaseExpired ? 'text-primary-50' : 'text-gray-600'}`}>
               {isOnDuty && !leaseExpired ? dict.provider.onDuty : dict.provider.offDuty}
             </span>
             <Switch
                checked={isOnDuty && !leaseExpired}
                onCheckedChange={handleToggleDuty}
                disabled={!isVerified || isDutyLoading}
                aria-label={dict.provider.toggleDuty}
                className={`data-[state=checked]:bg-primary-400 h-[28px] w-[52px] [&_span[data-state=checked]]:translate-x-[24px]`}
                style={{ transform: 'scale(1.2)' }}
             />
          </div>
        </div>
      </div>

      {/* ONE URGENCY-ORDERED QUEUE */}
      <div className="space-y-8">
        
        {/* NOW: Active & Incoming */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-kicker">
              <span>{dict.provider.requestsFeed.now || 'NOW'}</span>
              <Badge variant="secondary" className="font-semibold text-base tabular-nums">
                {incomingRequests.length + activeRequests.length}
              </Badge>
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              <span>{dict.common.updated} {lastFetched ? formatRelativeTime(lastFetched.toISOString()) : '...'}</span>
              <button
                onClick={() => fetchData()}
                disabled={isRefreshing}
                className="p-1 hover:text-gray-900 transition-colors focus:outline-none"
                aria-label="Refresh live feed"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary-600' : ''}`} />
              </button>
            </div>
          </div>
          
          {incomingRequests.length === 0 && activeRequests.length === 0 ? (
            <Card className="bg-white border-dashed shadow-none">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-gray-500">
                  {dict.provider.requestsFeed.noActive}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {[...incomingRequests, ...activeRequests].map((req) => (
                <Card
                  key={req.id}
                  className={`border-l-4 ${req.status === 'OPEN' ? (req.kind === 'SOS' ? 'border-l-red-500 shadow-md' : 'border-l-blue-500 shadow-sm') : 'border-l-primary-600 shadow-sm'} bg-white`}
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            className={
                              req.kind === 'SOS'
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }
                          >
                            {req.kind === 'SOS'
                              ? dict.provider.requestsFeed.emergencyBadge
                              : dict.provider.requestsFeed.routineBadge}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {req.status === 'OPEN' ? '⏳ ' : req.status === 'COMPLETED' ? '✅ ' : req.status === 'ACCEPTED' ? '✅ ' : req.status === 'IN_PROGRESS' ? '✅ ' : ''}
                            {req.status.replace('_', ' ')}
                          </Badge>
                          {req.status === 'OPEN' && (
                             <span className="text-xs text-red-600 font-semibold flex items-center gap-1 ml-2">
                               <Clock className="w-3.5 h-3.5" />
                               {dict.provider.requestsFeed.expiresIn} {formatCountdown(req.expiresAt)}
                             </span>
                          )}
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

                      <div className="text-right shrink-0">
                        {req.estimatedTotalPaise && (
                          <p className="font-semibold text-base text-gray-900 tracking-tight tabular-nums">
                            ₹{(req.estimatedTotalPaise / 100).toFixed(0)}
                          </p>
                        )}
                        {req.distanceMeters && (
                          <p className="text-xs text-gray-600 font-semibold tabular-nums">
                            {(req.distanceMeters / 1000).toFixed(1)} {dict.common.kmAway}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-base text-foreground bg-gray-50 p-3 rounded-md">
                      {req.conditionSummary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${req.farmerPhone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-foreground" />
                          {dict.provider.requestsFeed.contactFarmer}
                        </a>
                        <a
                          href={`https://wa.me/${req.farmerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-foreground" />
                          {dict.provider.requestsFeed.whatsAppFarmer}
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.status === 'OPEN' && (
                          <>
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
                          </>
                        )}
                        {req.status === 'ACCEPTED' && (
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

                        {req.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            onClick={() => handleComplete(req.id)}
                            disabled={pendingActionId === req.id}
                            className="bg-primary-600 hover:bg-primary-700 text-white"
                          >
                            {pendingActionId === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {dict.provider.requestsFeed.markDone || 'Mark visit done'}
                          </Button>
                        )}
                        {['AWAITING_CONFIRMATION', 'DISPUTED'].includes(req.status) && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 py-1.5 px-3">
                            <Clock className="w-3.5 h-3.5 mr-1.5 inline" />
                            {dict.provider.requestsFeed.waitingConfirmation || 'Waiting for farmer confirmation'}
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

        {/* TODAY: Upcoming Routine Visits */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-kicker">
              <span>{dict.provider.requestsFeed.today || 'TODAY'}</span>
              <Badge variant="secondary" className="font-semibold text-base tabular-nums">
                {routineBookings.filter(b => b.status === 'REQUESTED' || b.status === 'CONFIRMED').length}
              </Badge>
            </h2>
          </div>
          {routineBookings.filter(b => b.status === 'REQUESTED' || b.status === 'CONFIRMED').length === 0 ? (
            <Card className="bg-white border-dashed shadow-none">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-gray-500">
                  {dict.routine?.noUpcoming || 'No upcoming routine visits'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {routineBookings
                .filter(b => b.status === 'REQUESTED' || b.status === 'CONFIRMED')
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
                              {dict.provider.requestsFeed.routineBadge || 'ROUTINE VISIT'}
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

                      <p className="text-base text-foreground bg-gray-50 p-3 rounded-md">
                        <span className="font-semibold">{dict.routine?.reason || 'Reason'}: </span>
                        {req.reason}
                      </p>

                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                        <a
                          href={`tel:${req.farmerPhone}`}
                          className="inline-flex mr-auto items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-foreground" />
                          {dict.provider.requestsFeed.contactFarmer || 'Call'}
                        </a>

                        {req.status === 'REQUESTED' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeclineRoutine(req.id)}
                              disabled={pendingActionId === req.id}
                            >
                              {dict.provider.requestsFeed.decline || 'Decline'}
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
                              {dict.provider.requestsFeed.accept || 'Accept'}
                            </Button>
                          </>
                        )}

                        {req.status === 'CONFIRMED' && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteRoutine(req.id)}
                            disabled={pendingActionId === req.id}
                            className="bg-primary-600 hover:bg-primary-700 text-white"
                          >
                            {pendingActionId === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {dict.provider.requestsFeed.complete || 'Complete'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {/* DONE: Completed Today (Collapsed by default) */}
        <details className="group border rounded-lg bg-gray-50 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
            <div className="flex items-center gap-2 text-base font-semibold text-kicker">
              <span>{dict.provider.requestsFeed.done || 'DONE'}</span>
              <Badge variant="secondary" className="font-semibold text-base tabular-nums">
                 {requests.filter(r => r.status === 'COMPLETED').length + routineBookings.filter(b => b.status === 'COMPLETED').length}
              </Badge>
            </div>
            <span className="transition group-open:rotate-180">
              <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </summary>
          
          <div className="p-4 pt-0 space-y-4">
             {requests.filter(r => r.status === 'COMPLETED').length === 0 && routineBookings.filter(b => b.status === 'COMPLETED').length === 0 ? (
               <p className="text-base text-foreground text-center py-4">{dict.provider.requestsFeed.noCompleted}</p>
             ) : (
               <div className="grid grid-cols-1 gap-4">
                 {requests.filter(r => r.status === 'COMPLETED').map(req => (
                    <Card key={req.id} className="bg-white opacity-75">
                      <CardContent className="p-4 flex items-center justify-between">
                         <div>
                            <span className="text-sm font-semibold text-gray-900">{req.farmerName}</span>
                            <span className="text-xs text-gray-500 ml-2 block sm:inline">{req.conditionSummary}</span>
                         </div>
                         <Badge variant="outline" className="bg-gray-100">✅ {dict.requestStatus.COMPLETED}</Badge>
                      </CardContent>
                    </Card>
                 ))}
                 {routineBookings.filter(b => b.status === 'COMPLETED').map(req => (
                    <Card key={req.id} className="bg-white opacity-75">
                      <CardContent className="p-4 flex items-center justify-between">
                         <div>
                            <span className="text-sm font-semibold text-gray-900">{req.farmerName}</span>
                            <span className="text-xs text-gray-500 ml-2 block sm:inline">{dict.provider.requestsFeed.routineBadge}: {req.reason}</span>
                         </div>
                         <Badge variant="outline" className="bg-gray-100">✅ {dict.requestStatus.COMPLETED}</Badge>
                      </CardContent>
                    </Card>
                 ))}
               </div>
             )}
          </div>
        </details>
      </div>

      {/* Demoted Profile Details */}
      <Card className="shadow-sm border-gray-200 mt-12">
        <CardHeader className="pb-3">
           <CardTitle className="text-base font-bold text-gray-900 flex items-center justify-between">
             {dict.provider.profileAndFees || 'Profile & Fees'}
             {profile && (
               <TrustBadge
                 role={profile.role}
                 verificationStatus={profile.verificationStatus}
                 registrationAuthority={profile.registrationAuthority}
                 dict={dict}
               />
             )}
           </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 border-t border-gray-100 mt-2 py-4">
           <div>
             <span className="block text-xs text-gray-500 mb-1">{dict.provider.onboarding.registrationNumber}</span>
             <span className="font-medium text-gray-900">{profile?.registrationNumber}</span>
           </div>
           <div>
             <span className="block text-xs text-gray-500 mb-1">{dict.provider.onboarding.baseVisitFeePaise}</span>
             <span className="font-medium text-gray-900">
               ₹{((profile?.baseVisitFeePaise || 0) / 100).toFixed(0)}
             </span>
           </div>
           <div>
             <span className="block text-xs text-gray-500 mb-1">{dict.provider.onboarding.perKmFeePaise}</span>
             <span className="font-medium text-gray-900">
               ₹{((profile?.perKmFeePaise || 0) / 100).toFixed(0)}/km
             </span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

