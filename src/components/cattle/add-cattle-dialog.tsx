"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createCattleRecord } from "@/actions/cattle-actions";

export function AddCattleDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isMilking, setIsMilking] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    if (isMilking) {
      formData.set("isMilking", "on");
    }

    startTransition(async () => {
      const result = await createCattleRecord(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to add cattle.");
      } else {
        setOpen(false);
        setIsMilking(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 px-4 py-5 h-auto">
            <Plus className="mr-2 h-5 w-5" />
            Add New Cattle
          </Button>
        } 
      />
      <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Cattle</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a digital health passport for your animal.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="tagNumber" className="text-slate-300">Tag ID / Number *</Label>
            <Input id="tagNumber" name="tagNumber" required placeholder="e.g. IN-123456789" className="bg-slate-900 border-slate-700" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cattleType" className="text-slate-300">Animal Type *</Label>
              <select
                id="cattleType"
                name="cattleType"
                required
                className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              >
                <option value="COW">Cow</option>
                <option value="BUFFALO">Buffalo</option>
                <option value="GOAT">Goat</option>
                <option value="SHEEP">Sheep</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ageMonths" className="text-slate-300">Age (Months)</Label>
              <Input id="ageMonths" name="ageMonths" type="number" min="0" placeholder="e.g. 24" className="bg-slate-900 border-slate-700" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breedName" className="text-slate-300">Breed (Optional)</Label>
            <Input id="breedName" name="breedName" placeholder="e.g. Sahiwal, Murrah" className="bg-slate-900 border-slate-700" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="space-y-0.5">
              <Label className="text-slate-300">Milking Status</Label>
              <p className="text-xs text-slate-500">Is this animal currently producing milk?</p>
            </div>
            <Switch checked={isMilking} onCheckedChange={setIsMilking} className="data-[state=checked]:bg-emerald-500" />
          </div>

          {isMilking && (
            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <Label htmlFor="dailyMilkYieldLiters" className="text-slate-300">Daily Milk Yield (Liters)</Label>
              <Input id="dailyMilkYieldLiters" name="dailyMilkYieldLiters" type="number" step="0.1" min="0" placeholder="e.g. 12.5" className="bg-slate-900 border-slate-700" />
            </div>
          )}

          <Button type="submit" disabled={isPending} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white mt-2">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Cattle Record
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
