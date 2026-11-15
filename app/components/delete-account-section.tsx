"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useClerk, useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Must match DELETE_CONFIRMATION_PHRASE in convex/account.ts
const CONFIRM_PHRASE = "DELETE";

export function DeleteAccountSection() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const requestAccountDeletion = useMutation(api.account.requestAccountDeletion);
  const deleteClerkUser = useAction(api.account.deleteClerkUser);

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText.trim() !== CONFIRM_PHRASE) return;
    setDeleting(true);
    try {
      // 1. Schedule deletion of all GymForge data (runs in batches server-side).
      //    Must happen while the Clerk session/JWT is still valid.
      await requestAccountDeletion({ confirmation: confirmText.trim() });
    } catch (err) {
      console.error("Account deletion failed:", err);
      toast.error("Could not delete your account. Please try again.");
      setDeleting(false);
      return;
    }

    // 2. Delete the Clerk user: frontend API first, server-side fallback second.
    let clerkDeleted = false;
    try {
      await user?.delete();
      clerkDeleted = true;
    } catch (frontendErr) {
      console.warn("Clerk user.delete() failed, trying server-side:", frontendErr);
      try {
        await deleteClerkUser({});
        clerkDeleted = true;
      } catch (backendErr) {
        console.error("Server-side Clerk deletion failed:", backendErr);
      }
    }

    if (clerkDeleted) {
      toast.success("Your account and data have been deleted.");
    } else {
      toast.error(
        "Your workout data was deleted, but your sign-in account could not be removed. Please contact support."
      );
    }

    // 3. Sign out (no-op if Clerk already ended the session).
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      window.location.href = "/";
    }
  };

  return (
    <div className="card border-danger/30">
      <h3 className="font-semibold text-danger mb-4">Delete Account</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Permanently delete your account and everything in it: plans, workouts, records,
        body weight and nutrition logs. This cannot be undone. Consider exporting your
        data first.
      </p>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-danger">
        <Trash2 className="w-4 h-4" />
        Delete account
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (deleting) return;
          setOpen(next);
          if (!next) setConfirmText("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              All of your GymForge data will be permanently deleted and you will be signed
              out. Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to
              confirm.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            className="input"
            aria-label={`Type ${CONFIRM_PHRASE} to confirm`}
            disabled={deleting}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={confirmText.trim() !== CONFIRM_PHRASE || deleting}
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Permanently delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
