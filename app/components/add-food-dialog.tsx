"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { Camera, Check, Loader2, Lock, RotateCcw, Utensils } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string; // ISO YYYY-MM-DD
  isPaidUser: boolean;
}

interface AnalysisResult {
  foodName: string;
  description: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  confidence: "high" | "medium" | "low";
}

function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 20) return "dinner";
  return "snack";
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const maxSize = 1024;
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

export function AddFoodDialog({
  open,
  onOpenChange,
  date,
  isPaidUser,
}: AddFoodDialogProps) {
  const [step, setStep] = useState<"upload" | "analyzing" | "results" | "manual">(
    isPaidUser ? "upload" : "manual"
  );
  const [manualForm, setManualForm] = useState({
    foodName: "",
    servingSize: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
  });
  const [mealType, setMealType] = useState<MealType>(getDefaultMealType);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.nutrition.generateUploadUrl);
  const analyzeFoodImage = useAction(api.nutritionAi.analyzeFoodImage);
  const saveFoodEntry = useMutation(api.nutrition.saveFoodEntry);

  const resetState = useCallback(() => {
    setStep(isPaidUser ? "upload" : "manual");
    setMealType(getDefaultMealType());
    setImagePreview(null);
    setStorageId(null);
    setResult(null);
    setError(null);
    setSaving(false);
    setManualForm({
      foodName: "",
      servingSize: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
    });
  }, [isPaidUser]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setStep("analyzing");

    try {
      // Compress image
      const compressed = await compressImage(file);

      // Upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: compressed,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId: sid } = await uploadResult.json();
      setStorageId(sid);

      // Analyze with AI
      const analysis = await analyzeFoodImage({ storageId: sid });
      setResult(analysis as AnalysisResult);
      setStep("results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze image"
      );
      setStep("upload");
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setSaving(true);
    try {
      await saveFoodEntry({
        date,
        mealType,
        foodName: result.foodName,
        description: result.description,
        servingSize: result.servingSize,
        imageStorageId: storageId ?? undefined,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        fiber: result.fiber,
        sugar: result.sugar,
        aiAnalyzed: true,
      });
      onOpenChange(false);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => {
    setStep("upload");
    setImagePreview(null);
    setStorageId(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleManualSave = async () => {
    if (!manualForm.foodName.trim()) return;

    setSaving(true);
    try {
      await saveFoodEntry({
        date,
        mealType,
        foodName: manualForm.foodName.trim(),
        servingSize: manualForm.servingSize.trim() || undefined,
        calories: manualForm.calories,
        protein: manualForm.protein,
        carbs: manualForm.carbs,
        fat: manualForm.fat,
        fiber: manualForm.fiber,
        sugar: manualForm.sugar,
        aiAnalyzed: false,
      });
      onOpenChange(false);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) resetState();
  };

  const mealTypes: { value: MealType; label: string }[] = [
    { value: "breakfast", label: "Breakfast" },
    { value: "lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" },
    { value: "snack", label: "Snack" },
  ];

  const confidenceColors = {
    high: "bg-green-500/15 text-green-500 border-green-500/30",
    medium: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    low: "bg-red-500/15 text-red-500 border-red-500/30",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              {step === "manual" ? (
                <Utensils className="w-5 h-5 text-emerald-500" />
              ) : (
                <Camera className="w-5 h-5 text-emerald-500" />
              )}
            </div>
            <div>
              <DialogTitle>Add Food</DialogTitle>
              <DialogDescription>
                {step === "upload" && "Upload a photo of your food"}
                {step === "analyzing" && "Analyzing your food..."}
                {step === "results" && "Review nutrition estimates"}
                {step === "manual" && "Enter food details manually"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Meal Type Selector */}
          {(step === "upload" || step === "manual") && (
            <div className="flex gap-2">
              {mealTypes.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMealType(value)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    mealType === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Upload Area */}
          {step === "upload" && (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                <Camera className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                  Upload a photo of your food
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Take a photo or choose from files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          )}

          {/* Manual Entry (free users) */}
          {step === "manual" && (
            <div className="space-y-4">
              {!isPaidUser && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs font-medium">
                    Upgrade to Pro to scan food with AI
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">
                  Food Name
                </label>
                <Input
                  placeholder="e.g. Chicken Breast"
                  value={manualForm.foodName}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, foodName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Serving Size
                </label>
                <Input
                  placeholder="e.g. 200g"
                  value={manualForm.servingSize}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, servingSize: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "calories", label: "Calories", unit: "kcal" },
                  { key: "protein", label: "Protein", unit: "g" },
                  { key: "carbs", label: "Carbs", unit: "g" },
                  { key: "fat", label: "Fat", unit: "g" },
                  { key: "fiber", label: "Fiber", unit: "g" },
                  { key: "sugar", label: "Sugar", unit: "g" },
                ].map(({ key, label, unit }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground">
                      {label} ({unit})
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={manualForm[key as keyof typeof manualForm] as number}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          [key]: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analyzing State */}
          {step === "analyzing" && (
            <div className="space-y-4">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
              )}
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                <p className="text-sm font-medium">Analyzing your food...</p>
              </div>
            </div>
          )}

          {/* Results */}
          {step === "results" && result && (
            <div className="space-y-4">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full h-36 object-cover rounded-xl"
                />
              )}

              {/* Food Name & Confidence */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Input
                    value={result.foodName}
                    onChange={(e) =>
                      setResult({ ...result, foodName: e.target.value })
                    }
                    className="font-semibold text-lg"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.servingSize}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full border ${
                    confidenceColors[result.confidence]
                  }`}
                >
                  {result.confidence}
                </span>
              </div>

              {/* Macro Inputs */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "calories", label: "Calories", unit: "kcal" },
                  { key: "protein", label: "Protein", unit: "g" },
                  { key: "carbs", label: "Carbs", unit: "g" },
                  { key: "fat", label: "Fat", unit: "g" },
                  { key: "fiber", label: "Fiber", unit: "g" },
                  { key: "sugar", label: "Sugar", unit: "g" },
                ].map(({ key, label, unit }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground">
                      {label} ({unit})
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={result[key as keyof AnalysisResult] as number}
                      onChange={(e) =>
                        setResult({
                          ...result,
                          [key]: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              {result.description && (
                <p className="text-sm text-muted-foreground">
                  {result.description}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex gap-3">
          {step === "results" ? (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleRetake}
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save
                  </>
                )}
              </Button>
            </>
          ) : step === "manual" ? (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleManualSave}
                disabled={saving || !manualForm.foodName.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save
                  </>
                )}
              </Button>
            </>
          ) : step === "upload" ? (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
