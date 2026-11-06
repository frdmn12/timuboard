import type { RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export function useDashboardMotion(scope: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from("[data-m='head'] > *", { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 })
        .from("[data-m='stat']", { y: 24, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.2')
        .from("[data-m='col']", { y: 32, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.3')
        .from("[data-m='panel']", { y: 24, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.3')
    })
  }, { scope })
}
