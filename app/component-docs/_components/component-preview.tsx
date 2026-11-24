"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type PreviewMode = "card" | "page"

const STORYBOOK_URL = "https://pine-one-storybook.vercel.app"

export function ComponentPreviewHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="space-y-2">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="max-w-3xl text-base text-muted-foreground">{description}</p>
    </div>
  )
}

export function ComponentPreview({
  slug,
  mode = "card",
  previewStyle,
}: {
  slug: string
  mode?: PreviewMode
  previewStyle?: React.CSSProperties
  previewConfig?: Record<string, unknown>
}) {
  const frameClass =
    mode === "card"
      ? "rounded-xl border border-border/60 bg-background p-3 text-foreground"
      : "rounded-2xl border border-border/60 bg-background p-5 text-foreground"

  return (
    <div className={cn(frameClass)} style={previewStyle}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{slug}</p>
        {/* Live previews live in Storybook (pnpm storybook / pine-one-storybook.vercel.app), not in this page. */}
        <a
          href={STORYBOOK_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          See it live in Storybook
        </a>
      </div>
    </div>
  )
}
