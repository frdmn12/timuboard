import type { RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const q = <T extends HTMLElement = HTMLElement>(sel: string) => gsap.utils.toArray<T>(`[data-m='${sel}']`)
const once = (trigger: gsap.DOMTarget, start = 'top 85%') => ({ trigger, start, once: true })

/** Animasi landing: intro hero, kursor kolaborator, reveal saat scroll, parallax tile. */
export function useLandingMotion(scope: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from("[data-m='nav']", { y: -24, opacity: 0, duration: 0.6 })
        .from("[data-m='title']", { y: 32, opacity: 0, duration: 0.8 }, '-=0.3')
        .from("[data-m='hero-item']", { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.4')
        .from("[data-m='board']", { y: 80, opacity: 0, duration: 0.9 }, '-=0.4')
        .from("[data-m='board'] [data-m='task']", { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 }, '-=0.4')
        .from("[data-m='board'] [data-slot='progress-indicator']", { scaleX: 0, transformOrigin: 'left', duration: 0.8, stagger: 0.08 }, '<')

      q('cursor').forEach((el, i) => {
        gsap.set(el, { x: 80 + i * 260, y: 120 + i * 40 })
        gsap.to(el, {
          keyframes: [{ x: 160 + i * 220, y: 200 }, { x: 60 + i * 280, y: 260 }, { x: 220 + i * 200, y: 150 }],
          duration: 9, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 1.6 + i * 0.4,
        })
      })

      q('reveal').forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: once(el) }))
      gsap.from(q('logo'), { y: 16, opacity: 0, duration: 0.5, stagger: 0.07, scrollTrigger: once("[data-m='logos']", 'top 90%') })
      gsap.from(q('tile'), { x: 80, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', scrollTrigger: once("[data-m='strip']") })
      gsap.from(q('card'), { y: 60, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out', scrollTrigger: once("[data-m='cards']") })
      gsap.from("[data-m='final']", { scale: 0.96, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: once("[data-m='final']", 'top 90%') })

      // Tile parallax: foto bergeser di dalam bingkai, tile ganjil/genap berlawanan arah
      q('tile').forEach((tile, i) => {
        const trigger = { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: true }
        const img = tile.querySelector('img')
        if (img) gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: trigger })
        gsap.fromTo(tile, { y: i % 2 ? 24 : -24 }, { y: i % 2 ? -24 : 24, ease: 'none', scrollTrigger: trigger })
      })

      // Cincin progres: isi dan hitung naik
      q('ring').forEach((ring) => {
        const target = Number(ring.dataset.ring)
        const label = ring.querySelector('em')!
        const state = { p: 0 }
        ring.style.setProperty('--p', '0'); label.textContent = '0%'
        gsap.to(state, {
          p: target, duration: 1.4, ease: 'power2.out', scrollTrigger: once(ring, 'top 90%'),
          onUpdate: () => { ring.style.setProperty('--p', String(state.p)); label.textContent = `${Math.round(state.p)}%` },
        })
      })
    })
  }, { scope })
}
