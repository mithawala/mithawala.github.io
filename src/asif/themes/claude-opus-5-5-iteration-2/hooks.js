import { useEffect, useState } from 'react'

const REDUCED = '(prefers-reduced-motion: reduce)'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia(REDUCED).matches)
  useEffect(() => {
    const media = matchMedia(REDUCED)
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

export function useMedia(query) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const media = matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

export function useInView(
  ref,
  { threshold = 0, rootMargin = '0px', once = false } = {},
) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting && once) observer.disconnect()
      },
      { threshold, rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, threshold, rootMargin, once])
  return inView
}

// The section whose top has passed 35% of the viewport is the current stop.
export function useActiveSection(ids) {
  const [active, setActive] = useState(null)
  const key = ids.join(' ')
  useEffect(() => {
    const list = key.split(' ')
    let frame = 0
    const update = () => {
      frame = 0
      const line = innerHeight * 0.35
      let current = null
      for (const id of list) {
        const element = document.getElementById(id)
        if (element && element.getBoundingClientRect().top <= line) current = id
      }
      const root = document.documentElement
      if (current && scrollY + innerHeight >= root.scrollHeight - 4)
        current = list.at(-1)
      setActive(current)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', schedule)
      removeEventListener('resize', schedule)
    }
  }, [key])
  return active
}

const ZONES = { stockholm: 'Europe/Stockholm' }

// Local time at the canonical base when its zone is known, otherwise the
// visitor's own clock.
export function useClock(city) {
  const zone = ZONES[String(city).toLowerCase()]
  const read = () =>
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(zone ? { timeZone: zone } : {}),
    }).format(new Date())
  const [time, setTime] = useState(read)
  useEffect(() => {
    const timer = setInterval(() => setTime(read()), 10000)
    return () => clearInterval(timer)
  }, [zone])
  return { time, label: zone ? city : 'Local time' }
}
