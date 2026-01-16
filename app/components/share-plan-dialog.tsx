"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Link, Unlink, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SharePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: Id<"plans">;
  planName: string;
  existingToken?: string;
}

export function SharePlanDialog({
  open,
  onOpenChange,
  planId,
  planName,
  existingToken,
}: SharePlanDialogProps) {
  const [shareToken, setShareToken] = useState<string | null>(
    existingToken ?? null
  );
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const generateToken = useMutation(api.plans.generateShareToken);
  const revokeToken = useMutation(api.plans.revokeShareToken);

  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${shareToken}`
    : null;

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const result = await generateToken({ planId });
      setShareToken(result.shareToken);
      toast.success("Share link created!");
    } catch (error) {
      toast.error("Failed to generate share link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeLink = async () => {
    setIsRevoking(true);
    try {
      await revokeToken({ planId });
      setShareToken(null);
      toast.success("Share link revoked");
    } catch (error) {
      toast.error("Failed to revoke share link");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Plan</DialogTitle>
          <DialogDescription>
            Share &ldquo;{planName}&rdquo; with others. Anyone with the link can
            view and copy this plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!shareToken ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Generate a shareable link for this plan
              </p>
              <Button onClick={handleGenerateLink} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    Create Share Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={shareUrl ?? ""}
                  className="font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view and copy your plan
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevokeLink}
                  disabled={isRevoking}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {isRevoking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                  Revoke
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
