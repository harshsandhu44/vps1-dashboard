"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useTransition } from "react";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <Button
      aria-label="Refresh metrics"
      className="gap-2"
      disabled={pending}
      onClick={refresh}
      size="sm"
      variant="outline"
    >
      <RotateCw className={pending ? "size-4 animate-spin" : "size-4"} />
      Refresh
    </Button>
  );
}
