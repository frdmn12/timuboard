/* eslint-disable react-refresh/only-export-components */
import { useCallback } from 'react'
import {
  Link as RLink, NavLink as RNavLink, Navigate as RNavigate, useNavigate as useRNavigate,
  type LinkProps, type NavLinkProps, type NavigateOptions, type NavigateProps, type To,
} from 'react-router'
import { localizePath, type Lang } from '@/lib/i18n'
import { useI18n } from '@/hooks/useI18n'

/**
 * Pengganti Link/NavLink/Navigate/useNavigate dari react-router yang otomatis menambahkan prefix bahasa
 * (/en) pada path absolut. Impor dari sini, bukan dari 'react-router', untuk semua navigasi di dalam aplikasi.
 */
const loc = (to: To, l: Lang): To =>
  typeof to === 'string' ? localizePath(to, l) : to.pathname ? { ...to, pathname: localizePath(to.pathname, l) } : to

export function Link(props: LinkProps) {
  return <RLink {...props} to={loc(props.to, useI18n().lang)} />
}
export function NavLink(props: NavLinkProps) {
  return <RNavLink {...props} to={loc(props.to, useI18n().lang)} />
}
export function Navigate(props: NavigateProps) {
  return <RNavigate {...props} to={loc(props.to, useI18n().lang)} />
}
export function useNavigate() {
  const nav = useRNavigate()
  const { lang } = useI18n()
  return useCallback((to: To, opts?: NavigateOptions) => nav(loc(to, lang), opts), [nav, lang])
}
