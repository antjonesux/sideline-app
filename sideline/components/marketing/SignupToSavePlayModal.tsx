"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { modalCtaFooterClass, responsiveOverlayDialogContentClass } from "@/lib/constants/designTokens";
import { buildLoginHref } from "@/lib/navigation/loginHref";

type SignupToSavePlayModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playName: string;
  returnPath: string;
};

export function SignupToSavePlayModal({
  open,
  onOpenChange,
  playName,
  returnPath,
}: SignupToSavePlayModalProps) {
  const getStartedHref = buildLoginHref({ register: true, next: returnPath });
  const signInHref = buildLoginHref({ next: returnPath });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={responsiveOverlayDialogContentClass("md")}>
        <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-3 text-left md:px-6">
          <DialogTitle className="font-heading text-lg font-bold uppercase tracking-[0.08em] text-white">
            Save this play
          </DialogTitle>
          <DialogDescription className="mt-2 font-body text-sm text-slate-400">
            Sign up to save {playName} to your call sheet.
          </DialogDescription>
        </DialogHeader>
        <div className={modalCtaFooterClass}>
          <Button asChild className="w-full">
            <Link href={getStartedHref}>Get Started</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href={signInHref}>Already have an account? Sign in</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
