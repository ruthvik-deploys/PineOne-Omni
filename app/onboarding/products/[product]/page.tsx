import { notFound, redirect } from "next/navigation"

export default async function ProductOnboardingRoute({ params }: { params: Promise<{ product: string }> }) {
  const { product } = await params
  if (product !== "in-store" && product !== "payment-links" && product !== "checkout" && product !== "verify" && product !== "start" && product !== "start-catalog") notFound()
  redirect(`/onboarding-demo/setup/${product}`)
}
