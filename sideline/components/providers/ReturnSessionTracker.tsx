"use client";

import { tryEmitReturnSession } from "@/lib/productAnalytics";
import { useEffect } from "react";

export function ReturnSessionTracker() {
  useEffect(() => {
    tryEmitReturnSession();
  }, []);
  return null;
}
