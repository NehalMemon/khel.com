"use client"

import { Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useCommissionRate } from "@/lib/app-config"

/**
 * Free accounts may hold a single slot per week; the `hold_slot` RPC raises
 * `freemium_limit_reached` when that budget is spent. There is no upgrade
 * checkout to link to yet, so this sheet explains the limit and stays honest
 * about that rather than faking a purchase flow.
 */
export function FreemiumLimitSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const commissionRate = useCommissionRate()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Crown className="size-5" />
          </span>
          <SheetTitle>You have already held a slot this week</SheetTitle>
          <SheetDescription>
            Free accounts can hold one court slot every seven days. The hold is
            released as soon as it expires, so nothing is charged for a hold that
            you do not complete.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 px-4">
          <div className="rounded-xl border border-dashed p-4">
            <p className="text-sm font-semibold">What a premium account changes</p>
            <ul className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
              <li>Unlimited concurrent holds within the hold window.</li>
              <li>
                Platform commission is currently{" "}
                {new Intl.NumberFormat("en-PK", {
                  style: "percent",
                  maximumFractionDigits: 1,
                }).format(commissionRate)}
                .
              </li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Upgrade checkout is not connected yet. Until the backend payment
            function ships, the button below just closes this panel.
          </p>
        </div>

        <SheetFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Choose another time
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
