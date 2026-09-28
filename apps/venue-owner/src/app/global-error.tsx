"use client"

import Link from "next/link"
import { Notice } from "@/components/app/notice"

export default function GlobalError() {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <main className="grid min-h-screen place-items-center px-4">
          <div className="w-full max-w-lg">
            <Notice tone="error" title="The partner portal could not load">
              Please refresh the page. If this keeps happening, check that the Supabase environment
              variables are configured.
            </Notice>
            <Link
              href="/sign-in"
              className="mt-4 inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Go to sign in
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
