import type { RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

/** Animasi masuk laman auth; diulang saat `mode` berganti. */
export function useAuthMotion(scope: RefObject<HTMLElement | null>, mode: string) {
  useGSAP(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from("[data-m='form'] > *", { y: 20, opacity: 0, duration: 0.6, stagger: 0.07 })
        .from("[data-m='panel']", { x: 40, opacity: 0, duration: 0.8 }, 0)
        .from("[data-m='panel'] [data-m='task']", { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 }, 0.4)
        .from("[data-m='panel'] [data-slot='progress-indicator']", { scaleX: 0, transformOrigin: 'left', duration: 0.8, stagger: 0.1 }, 0.5)
    })
  }, { scope, dependencies: [mode], revertOnUpdate: true })
}
