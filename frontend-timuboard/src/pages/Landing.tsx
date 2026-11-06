import { useRef } from 'react'
import { useSeo } from '@/hooks/useSeo'
import { useLandingMotion } from '@/hooks/useLandingMotion'
import Hero from '@/components/landing/Hero'
import IntegrationsRow from '@/components/landing/IntegrationsRow'
import StoriesStrip from '@/components/landing/StoriesStrip'
import FeatureCards from '@/components/landing/FeatureCards'
import FinalCta from '@/components/landing/FinalCta'
import SiteFooter from '@/components/landing/SiteFooter'

export default function Landing() {
  const root = useRef<HTMLDivElement>(null)
  useLandingMotion(root)
  useSeo({ path: '/' })
  return (
    <div ref={root} className="mx-auto max-w-[1200px]">
      <Hero />
      <IntegrationsRow />
      <StoriesStrip />
      <FeatureCards />
      <FinalCta />
      <SiteFooter />
    </div>
  )
}
