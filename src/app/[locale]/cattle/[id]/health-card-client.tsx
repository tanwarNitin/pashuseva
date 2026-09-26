
"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Droplet, Shield, Heart, Printer, QrCode, Plus, Edit, Trash2, Calendar, AlertTriangle, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { grantHealthCardAccess, revokeHealthCardAccess, getActiveGrants } from "@/actions/cattle.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Animal } from "@/db/schema/cattle";

function format(date: Date | string, fmt: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return fmt
    .replace('dd', day)
    .replace('MMM', monthNames[d.getMonth()])
    .replace('MM', month)
    .replace('yyyy', String(year))
    .replace('HH', hours)
    .replace('mm', minutes);
}

interface HealthCardProps {
  animal: Animal;
  isProvider?: boolean;
}

interface MilkYieldEntry {
  id: string;
  animalId: string;
  farmerId: string;
  recordedOn: string;
  litersPerDay: string;
  notes: string | null;
  source: string;
  createdAt: string;
}

interface VaccinationRecord {
  id: string;
  animalId: string;
  farmerId: string;
  vaccineName: string;
  diseaseTarget: string | null;
  administeredOn: string;
  nextDueOn: string | null;
  batchNumber: string | null;
  administeredByText: string | null;
  providerUserId: string | null;
  source: string;
  notes: string | null;
  createdAt: string;
}

interface MedicalRecord {
  id: string;
  animalId: string;
  farmerId: string;
  recordedOn: string;
  recordType: string;
  symptoms: string;
  diagnosis: string | null;
  treatment: string | null;
  followUpDate: string | null;
  source: string;
  notes: string | null;
  createdAt: string;
}

export default function CattleHealthCardClient({ animal, isProvider }: HealthCardProps) {
  const dict = useTranslation();
  const router = useRouter();

  const [grants, setGrants] = useState<any[]>([]);
  const [providerPhoneInput, setProviderPhoneInput] = useState("");
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);

  const [milkYields, setMilkYields] = useState<MilkYieldEntry[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Dialog states
  const [showMilkDialog, setShowMilkDialog] = useState(false);
  const [showVaccinationDialog, setShowVaccinationDialog] = useState(false);
  const [showMedicalDialog, setShowMedicalDialog] = useState(false);
  const [editingMilk, setEditingMilk] = useState<MilkYieldEntry | null>(null);
  const [editingVaccination, setEditingVaccination] = useState<VaccinationRecord | null>(null);
  const [editingMedical, setEditingMedical] = useState<MedicalRecord | null>(null);

  // Form states
  const [milkForm, setMilkForm] = useState({ recordedOn: "", litersPerDay: "", notes: "" });
  const [vaccinationForm, setVaccinationForm] = useState({
    vaccineName: "",
    diseaseTarget: "",
    administeredOn: "",
    nextDueOn: "",
    batchNumber: "",
    administeredByText: "",
    source: "FARMER_REPORTED",
    notes: "",
  });
  const [medicalForm, setMedicalForm] = useState({
    recordedOn: "",
    recordType: "FARMER_NOTE",
    symptoms: "",
    diagnosis: "",
    treatment: "",
    followUpDate: "",
    source: "FARMER_REPORTED",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [animal.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [
        fetch(`/api/cattle/${animal.id}/milk-yields`).then(res => res.ok ? res.json() : []),
        fetch(`/api/cattle/${animal.id}/vaccinations`).then(res => res.ok ? res.json() : []),
        fetch(`/api/cattle/${animal.id}/medical-records`).then(res => res.ok ? res.json() : []),
      ];
      if (!isProvider) promises.push(getActiveGrants(animal.id));

      const [milkRes, vaccRes, medicalRes, grantsRes] = await Promise.all(promises);

      setMilkYields(milkRes);
      setVaccinations(vaccRes);
      setMedicalRecords(medicalRes);
      if (!isProvider && grantsRes?.success) setGrants(grantsRes.grants);
    } catch (err) {
      console.error("Failed to fetch cattle data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingGrant(true);
    const res = await grantHealthCardAccess(animal.id, providerPhoneInput);
    setIsSubmittingGrant(false);
    if (res.success) {
      setProviderPhoneInput("");
      fetchData();
    } else {
      alert(res.error);
    }
  };

  const handleRevokeAccess = async (consentId: string) => {
    if (!confirm(dict.cattle.revoke + "?")) return;
    const res = await revokeHealthCardAccess(consentId);
    if (res.success) fetchData();
    else alert(res.error);
  };

  const getSpeciesLabel = (species: string) => {
    const labels: Record<string, string> = {
      CATTLE: dict.cattle.species.cattle,
      BUFFALO: dict.cattle.species.buffalo,
      GOAT: dict.cattle.species.goat,
      SHEEP: dict.cattle.species.sheep,
      OTHER: dict.cattle.species.other,
    };
    return labels[species] || species;
  };

  const getSexLabel = (sex: string) => {
    const labels: Record<string, string> = {
      MALE: dict.cattle.male,
      FEMALE: dict.cattle.female,
      UNKNOWN: dict.cattle.unknown,
    };
    return labels[sex] || sex;
  };

  const calculateAge = (dateOfBirth?: string | null, approximateAgeMonths?: number | null) => {
    if (dateOfBirth) {
      const birth = new Date(dateOfBirth);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - birth.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      return `${years} ${dict.common.years} ${months} ${dict.common.months}`;
    }
    if (approximateAgeMonths) {
      const years = Math.floor(approximateAgeMonths / 12);
      const months = approximateAgeMonths % 12;
      return `${years} ${dict.common.years} ${months} ${dict.common.months} (${dict.cattle.approximate})`;
    }
    return dict.common.unknown;
  };

  const getSourceBadge = (source: string) => {
    return source === "FARMER_REPORTED"
      ? <Badge variant="secondary">{dict.cattle.farmerReported}</Badge>
      : <Badge className="bg-blue-100 text-blue-800">{dict.cattle.providerEntered}</Badge>;
  };

  const getRecordTypeBadge = (type: string) => {
    const badges: Record<string, React.ReactNode> = {
      FARMER_NOTE: <Badge variant="secondary">{dict.cattle.farmerNote}</Badge>,
      PROVIDER_VISIT: <Badge className="bg-green-100 text-green-800">{dict.cattle.providerVisit}</Badge>,
      FOLLOW_UP: <Badge className="bg-purple-100 text-purple-800">{dict.cattle.followUp}</Badge>,
    };
    return badges[type] || <Badge variant="secondary">{type}</Badge>;
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const handleMilkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMilk ? `/api/cattle/${animal.id}/milk-yields/${editingMilk.id}` : `/api/cattle/${animal.id}/milk-yields`;
      const method = editingMilk ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(milkForm),
      });
      if (res.ok) {
        setShowMilkDialog(false);
        setEditingMilk(null);
        setMilkForm({ recordedOn: "", litersPerDay: "", notes: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Failed to save milk yield:", err);
    }
  };

  const handleVaccinationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingVaccination ? `/api/cattle/${animal.id}/vaccinations/${editingVaccination.id}` : `/api/cattle/${animal.id}/vaccinations`;
      const method = editingVaccination ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vaccinationForm),
      });
      if (res.ok) {
        setShowVaccinationDialog(false);
        setEditingVaccination(null);
        setVaccinationForm({ vaccineName: "", diseaseTarget: "", administeredOn: "", nextDueOn: "", batchNumber: "", administeredByText: "", source: "FARMER_REPORTED", notes: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Failed to save vaccination:", err);
    }
  };

  const handleMedicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMedical ? `/api/cattle/${animal.id}/medical-records/${editingMedical.id}` : `/api/cattle/${animal.id}/medical-records`;
      const method = editingMedical ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(medicalForm),
      });
      if (res.ok) {
        setShowMedicalDialog(false);
        setEditingMedical(null);
        setMedicalForm({ recordedOn: "", recordType: "FARMER_NOTE", symptoms: "", diagnosis: "", treatment: "", followUpDate: "", source: "FARMER_REPORTED", notes: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Failed to save medical record:", err);
    }
  };

  const handleDeleteMilk = async (id: string) => {
    if (!confirm(dict.common.confirmDelete)) return;
    try {
      const res = await fetch(`/api/cattle/${animal.id}/milk-yields/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Failed to delete milk yield:", err);
    }
  };

  const handleDeleteVaccination = async (id: string) => {
    if (!confirm(dict.common.confirmDelete)) return;
    try {
      const res = await fetch(`/api/cattle/${animal.id}/vaccinations/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Failed to delete vaccination:", err);
    }
  };

  const handleDeleteMedical = async (id: string) => {
    if (!confirm(dict.common.confirmDelete)) return;
    try {
      const res = await fetch(`/api/cattle/${animal.id}/medical-records/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Failed to delete medical record:", err);
    }
  };

  const handleEditMilk = (entry: MilkYieldEntry) => {
    setEditingMilk(entry);
    setMilkForm({ recordedOn: entry.recordedOn, litersPerDay: entry.litersPerDay, notes: entry.notes || "" });
    setShowMilkDialog(true);
  };

  const handleEditVaccination = (entry: VaccinationRecord) => {
    setEditingVaccination(entry);
    setVaccinationForm({
      vaccineName: entry.vaccineName,
      diseaseTarget: entry.diseaseTarget || "",
      administeredOn: entry.administeredOn,
      nextDueOn: entry.nextDueOn || "",
      batchNumber: entry.batchNumber || "",
      administeredByText: entry.administeredByText || "",
      source: entry.source,
      notes: entry.notes || "",
    });
    setShowVaccinationDialog(true);
  };

  const handleEditMedical = (entry: MedicalRecord) => {
    setEditingMedical(entry);
    setMedicalForm({
      recordedOn: entry.recordedOn,
      recordType: entry.recordType,
      symptoms: entry.symptoms,
      diagnosis: entry.diagnosis || "",
      treatment: entry.treatment || "",
      followUpDate: entry.followUpDate || "",
      source: entry.source,
      notes: entry.notes || "",
    });
    setShowMedicalDialog(true);
  };

  const printHealthCard = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-4 animate-pulse"><div className="h-20 bg-gray-200 rounded"/></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Animal Header Card */}
      <Card className="border-l-4 border-green-500">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-green-100">
                <Heart className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{animal.name || dict.cattle.unnamed}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Badge variant="outline">{getSpeciesLabel(animal.species)}</Badge>
                  </span>
                  <span className="flex items-center gap-1">
                    {animal.breed && <Badge variant="outline">{animal.breed}</Badge>}
                  </span>
                  <span className="flex items-center gap-1">
                    <Badge variant="outline">{getSexLabel(animal.sex)}</Badge>
                  </span>
                  {animal.tagId && (
                    <span className="flex items-center gap-1">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{animal.tagId}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={printHealthCard}>
                <Printer className="h-4 w-4 mr-2" />
                {dict.cattle.printCard}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {dict.cattle.exportPdf}
              </Button>
              <Button variant="outline" size="sm">
                <QrCode className="h-4 w-4 mr-2" />
                {dict.cattle.shareQr}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500">{dict.cattle.age}</p>
              <p className="font-medium">{calculateAge(animal.dateOfBirth, animal.approximateAgeMonths)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{dict.cattle.colorMarkings}</p>
              <p className="font-medium">{animal.colorOrIdentifyingMarks || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{dict.cattle.owner}</p>
              <p className="font-medium">{dict.common.you}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{dict.cattle.registeredOn}</p>
              <p className="font-medium">{format(new Date(animal.createdAt), "dd MMM yyyy")}</p>
            </div>
          </div>

          {animal.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{dict.cattle.notes}</p>
              <p className="text-gray-900">{animal.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different record types */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${!isProvider ? "grid-cols-4 lg:grid-cols-5" : "grid-cols-4"} gap-1 overflow-x-auto h-auto min-h-10 p-1`}>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{dict.cattle.overview}</span>
          </TabsTrigger>
          <TabsTrigger value="milk">
            <Droplet className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{dict.cattle.milkYield}</span>
          </TabsTrigger>
          <TabsTrigger value="vaccinations">
            <Shield className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{dict.cattle.vaccinations}</span>
          </TabsTrigger>
          <TabsTrigger value="medical">
            <AlertTriangle className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{dict.cattle.medicalRecords}</span>
          </TabsTrigger>
          {!isProvider && (
            <TabsTrigger value="share">
              <Users className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{dict.cattle.share || "Share"}</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplet className="h-5 w-5 text-blue-600" />
                  {dict.cattle.milkYield}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{milkYields.length} {dict.cattle.entries}</p>
                {milkYields.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {dict.cattle.latest}: {parseFloat(milkYields[0].litersPerDay).toFixed(1)} L
                  </p>
                )}
                <Button className="mt-4 w-full" variant="outline" size="sm" onClick={() => setActiveTab("milk")}>
                  {dict.common.viewAll}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  {dict.cattle.vaccinations}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{vaccinations.length} {dict.cattle.total}</p>
                {vaccinations.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {dict.cattle.nextDue}: {vaccinations.find(v => v.nextDueOn) ? format(new Date(vaccinations.find(v => v.nextDueOn)!.nextDueOn!), "dd MMM yyyy") : "—"}
                  </p>
                )}
                <Button className="mt-4 w-full" variant="outline" size="sm" onClick={() => setActiveTab("vaccinations")}>
                  {dict.common.viewAll}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  {dict.cattle.medicalRecords}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{medicalRecords.length} {dict.cattle.entries}</p>
                {medicalRecords.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {dict.cattle.latest}: {format(new Date(medicalRecords[0].recordedOn), "dd MMM yyyy")}
                  </p>
                )}
                <Button className="mt-4 w-full" variant="outline" size="sm" onClick={() => setActiveTab("medical")}>
                  {dict.common.viewAll}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {dict.cattle.healthSummary}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">{dict.cattle.recentVaccinations}</h4>
                  {vaccinations.slice(0, 3).length === 0 ? (
                    <p className="text-sm text-gray-500">{dict.cattle.noVaccinations}</p>
                  ) : (
                    <ul className="space-y-2">
                      {vaccinations.slice(0, 3).map(v => (
                        <li key={v.id} className="flex items-center justify-between text-sm">
                          <span>{v.vaccineName}</span>
                          <span className="text-gray-500">{format(new Date(v.administeredOn), "dd MMM yyyy")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-3">{dict.cattle.upcomingVaccinations}</h4>
                  {vaccinations.filter(v => v.nextDueOn && !isOverdue(v.nextDueOn)).slice(0, 3).length === 0 ? (
                    <p className="text-sm text-gray-500">{dict.cattle.noUpcoming}</p>
                  ) : (
                    <ul className="space-y-2">
                      {vaccinations.filter(v => v.nextDueOn && !isOverdue(v.nextDueOn)).slice(0, 3).map(v => (
                        <li key={v.id} className="flex items-center justify-between text-sm">
                          <span>{v.vaccineName}</span>
                          <Badge className={`text-xs ${isOverdue(v.nextDueOn) ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                            {format(new Date(v.nextDueOn!), "dd MMM yyyy")}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milk Yield Tab */}
        <TabsContent value="milk" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{dict.cattle.milkYieldRecords}</h3>
            <Button onClick={() => { setEditingMilk(null); setMilkForm({ recordedOn: "", litersPerDay: "", notes: "" }); setShowMilkDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {dict.cattle.addMilkRecord}
            </Button>
          </div>

          {milkYields.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Droplet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">{dict.cattle.noMilkRecords}</h3>
                  <p className="text-sm text-muted-foreground">{dict.cattle.addFirstMilkRecord}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {milkYields.map(entry => (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-blue-100">
                          <Droplet className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{parseFloat(entry.litersPerDay).toFixed(1)} L</p>
                          <p className="text-sm text-gray-500">{format(new Date(entry.recordedOn), "dd MMM yyyy")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.notes && <span className="text-sm text-gray-500">{entry.notes}</span>}
                        {getSourceBadge(entry.source)}
                        <Button variant="ghost" size="icon" onClick={() => handleEditMilk(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteMilk(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vaccinations Tab */}
        <TabsContent value="vaccinations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{dict.cattle.vaccinationRecords}</h3>
            <Button onClick={() => { setEditingVaccination(null); setVaccinationForm({ vaccineName: "", diseaseTarget: "", administeredOn: "", nextDueOn: "", batchNumber: "", administeredByText: "", source: "FARMER_REPORTED", notes: "" }); setShowVaccinationDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {dict.cattle.addVaccination}
            </Button>
          </div>

          {vaccinations.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">{dict.cattle.noVaccinations}</h3>
                  <p className="text-sm text-muted-foreground">{dict.cattle.addFirstVaccination}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {vaccinations.map(entry => (
                <Card key={entry.id} className={isOverdue(entry.nextDueOn) ? "border-red-200" : ""}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 rounded-full bg-green-100">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{entry.vaccineName}</p>
                          <p className="text-sm text-gray-500">{entry.diseaseTarget || dict.cattle.general}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.administeredOn), "dd MMM yyyy")}
                        </span>
                        {entry.nextDueOn && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <Badge className={`${isOverdue(entry.nextDueOn) ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                              {dict.cattle.nextDueOn}: {format(new Date(entry.nextDueOn), "dd MMM yyyy")}
                            </Badge>
                          </span>
                        )}
                        {getSourceBadge(entry.source)}
                        <Button variant="ghost" size="icon" onClick={() => handleEditVaccination(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteVaccination(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {(entry.batchNumber || entry.administeredByText || entry.notes) && (
                      <div className="mt-3 pt-3 border-t text-sm text-gray-500 space-y-1">
                        {entry.batchNumber && <p><strong>{dict.cattle.batch}:</strong> {entry.batchNumber}</p>}
                        {entry.administeredByText && <p><strong>{dict.cattle.administeredBy}:</strong> {entry.administeredByText}</p>}
                        {entry.notes && <p><strong>{dict.common.notes}:</strong> {entry.notes}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Medical Records Tab */}
        <TabsContent value="medical" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{dict.cattle.medicalRecords}</h3>
            <Button onClick={() => { setEditingMedical(null); setMedicalForm({ recordedOn: "", recordType: "FARMER_NOTE", symptoms: "", diagnosis: "", treatment: "", followUpDate: "", source: "FARMER_REPORTED", notes: "" }); setShowMedicalDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {dict.cattle.addMedicalRecord}
            </Button>
          </div>

          {medicalRecords.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">{dict.cattle.noMedicalRecords}</h3>
                  <p className="text-sm text-muted-foreground">{dict.cattle.addFirstMedicalRecord}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {medicalRecords.map(entry => (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 rounded-full bg-purple-100 mt-0.5">
                          <AlertTriangle className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{entry.symptoms}</p>
                            {getRecordTypeBadge(entry.recordType)}
                          </div>
                          <p className="text-sm text-gray-500">{format(new Date(entry.recordedOn), "dd MMM yyyy")}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {getSourceBadge(entry.source)}
                        <Button variant="ghost" size="icon" onClick={() => handleEditMedical(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteMedical(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {(entry.diagnosis || entry.treatment || entry.followUpDate || entry.notes) && (
                      <div className="mt-3 pt-3 border-t text-sm text-gray-500 space-y-1">
                        {entry.diagnosis && <p><strong>{dict.cattle.diagnosis}:</strong> {entry.diagnosis}</p>}
                        {entry.treatment && <p><strong>{dict.cattle.treatment}:</strong> {entry.treatment}</p>}
                        {entry.followUpDate && (
                          <p className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <strong>{dict.cattle.followUp}:</strong>
                            <Badge className={isOverdue(entry.followUpDate) ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                              {format(new Date(entry.followUpDate), "dd MMM yyyy")}
                            </Badge>
                          </p>
                        )}
                        {entry.notes && <p><strong>{dict.common.notes}:</strong> {entry.notes}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {!isProvider && (
          <TabsContent value="share" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  {dict.cattle.share || "Share Health Card"}
                </CardTitle>
                <CardDescription>
                  {dict.cattle.grantAccessDesc || "Grant temporary access to a provider to view this animal's health card."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGrantAccess} className="flex flex-col sm:flex-row gap-4 max-w-lg">
                  <div className="flex-1 space-y-2">
                    <Label>{dict.cattle.providerPhone || "Provider Phone Number"}</Label>
                    <Input 
                      placeholder="+91 XXXXX XXXXX" 
                      value={providerPhoneInput}
                      onChange={(e) => setProviderPhoneInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={isSubmittingGrant}>
                      {isSubmittingGrant ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      {dict.cattle.grantAccess || "Grant Access"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{dict.cattle.activeGrants || "Active Grants"}</CardTitle>
              </CardHeader>
              <CardContent>
                {grants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{dict.cattle.noActiveGrants || "No active grants"}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {grants.map(grant => (
                      <div key={grant.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{grant.provider.name}</p>
                          <p className="text-sm text-gray-500">{grant.provider.phone}</p>
                          <p className="text-xs text-gray-400 mt-1">Granted: {format(grant.grantedAt, "dd MMM yyyy")}</p>
                        </div>
                        <Button variant="outline" className="text-red-600 mt-4 sm:mt-0" onClick={() => handleRevokeAccess(grant.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          {dict.cattle.revoke || "Revoke"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Milk Yield Dialog */}
      <Dialog open={showMilkDialog} onOpenChange={setShowMilkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMilk ? dict.cattle.editMilkRecord : dict.cattle.addMilkRecord}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMilkSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{dict.cattle.recordedOn}</Label>
                  <Input type="date" value={milkForm.recordedOn} onChange={e => setMilkForm({ ...milkForm, recordedOn: e.target.value })} required />
                </div>
                <div>
                  <Label>{dict.cattle.litersPerDay}</Label>
                  <Input type="number" step="0.1" min="0" value={milkForm.litersPerDay} onChange={e => setMilkForm({ ...milkForm, litersPerDay: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>{dict.common.notes}</Label>
                <Textarea value={milkForm.notes} onChange={e => setMilkForm({ ...milkForm, notes: e.target.value })} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowMilkDialog(false); setEditingMilk(null); }}>
                {dict.common.cancel}
              </Button>
              <Button type="submit">{editingMilk ? dict.common.update : dict.common.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vaccination Dialog */}
      <Dialog open={showVaccinationDialog} onOpenChange={setShowVaccinationDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVaccination ? dict.cattle.editVaccination : dict.cattle.addVaccination}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVaccinationSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label>{dict.cattle.vaccineName}</Label>
                <Input value={vaccinationForm.vaccineName} onChange={e => setVaccinationForm({ ...vaccinationForm, vaccineName: e.target.value })} required />
              </div>
              <div>
                <Label>{dict.cattle.diseaseTarget}</Label>
                <Input value={vaccinationForm.diseaseTarget} onChange={e => setVaccinationForm({ ...vaccinationForm, diseaseTarget: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{dict.cattle.administeredOn}</Label>
                  <Input type="date" value={vaccinationForm.administeredOn} onChange={e => setVaccinationForm({ ...vaccinationForm, administeredOn: e.target.value })} required />
                </div>
                <div>
                  <Label>{dict.cattle.nextDueOn}</Label>
                  <Input type="date" value={vaccinationForm.nextDueOn} onChange={e => setVaccinationForm({ ...vaccinationForm, nextDueOn: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{dict.cattle.batchNumber}</Label>
                  <Input value={vaccinationForm.batchNumber} onChange={e => setVaccinationForm({ ...vaccinationForm, batchNumber: e.target.value })} />
                </div>
                <div>
                  <Label>{dict.cattle.administeredBy}</Label>
                  <Input value={vaccinationForm.administeredByText} onChange={e => setVaccinationForm({ ...vaccinationForm, administeredByText: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>{dict.cattle.source}</Label>
                <Select value={vaccinationForm.source ?? "FARMER_REPORTED"} onValueChange={(v: string | null) => setVaccinationForm({ ...vaccinationForm, source: v ?? "FARMER_REPORTED" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FARMER_REPORTED">{dict.cattle.farmerReported}</SelectItem>
                    <SelectItem value="PROVIDER_ENTERED">{dict.cattle.providerEntered}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{dict.common.notes}</Label>
                <Textarea value={vaccinationForm.notes} onChange={e => setVaccinationForm({ ...vaccinationForm, notes: e.target.value })} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowVaccinationDialog(false); setEditingVaccination(null); }}>
                {dict.common.cancel}
              </Button>
              <Button type="submit">{editingVaccination ? dict.common.update : dict.common.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Medical Record Dialog */}
      <Dialog open={showMedicalDialog} onOpenChange={setShowMedicalDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMedical ? dict.cattle.editMedicalRecord : dict.cattle.addMedicalRecord}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMedicalSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label>{dict.cattle.recordedOn}</Label>
                <Input type="date" value={medicalForm.recordedOn} onChange={e => setMedicalForm({ ...medicalForm, recordedOn: e.target.value })} required />
              </div>
              <div>
                <Label>{dict.cattle.recordType}</Label>
                <Select value={medicalForm.recordType ?? "FARMER_NOTE"} onValueChange={(v: string | null) => setMedicalForm({ ...medicalForm, recordType: v ?? "FARMER_NOTE" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FARMER_NOTE">{dict.cattle.farmerNote}</SelectItem>
                    <SelectItem value="PROVIDER_VISIT">{dict.cattle.providerVisit}</SelectItem>
                    <SelectItem value="FOLLOW_UP">{dict.cattle.followUp}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{dict.cattle.symptoms}</Label>
                <Input value={medicalForm.symptoms} onChange={e => setMedicalForm({ ...medicalForm, symptoms: e.target.value })} required />
              </div>
              <div>
                <Label>{dict.cattle.diagnosis}</Label>
                <Input value={medicalForm.diagnosis} onChange={e => setMedicalForm({ ...medicalForm, diagnosis: e.target.value })} />
              </div>
              <div>
                <Label>{dict.cattle.treatment}</Label>
                <Input value={medicalForm.treatment} onChange={e => setMedicalForm({ ...medicalForm, treatment: e.target.value })} />
              </div>
              <div>
                <Label>{dict.cattle.followUpDate}</Label>
                <Input type="date" value={medicalForm.followUpDate} onChange={e => setMedicalForm({ ...medicalForm, followUpDate: e.target.value })} />
              </div>
              <div>
                <Label>{dict.cattle.source}</Label>
                <Select value={medicalForm.source ?? "FARMER_REPORTED"} onValueChange={(v: string | null) => setMedicalForm({ ...medicalForm, source: v ?? "FARMER_REPORTED" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FARMER_REPORTED">{dict.cattle.farmerReported}</SelectItem>
                    <SelectItem value="PROVIDER_ENTERED">{dict.cattle.providerEntered}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{dict.common.notes}</Label>
                <Textarea value={medicalForm.notes} onChange={e => setMedicalForm({ ...medicalForm, notes: e.target.value })} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowMedicalDialog(false); setEditingMedical(null); }}>
                {dict.common.cancel}
              </Button>
              <Button type="submit">{editingMedical ? dict.common.update : dict.common.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}