import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

let dialogCount = 0
let previousOverflow = ''

export default function Dialog({ title, onClose, children, className = '' }) {
  const element = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const dialog = element.current
    const cancel = (event) => {
      event.preventDefault()
      closeRef.current()
    }
    const keydown = (event) => {
      if (
        event.key === 'Escape' &&
        [...document.querySelectorAll('dialog[open]')].at(-1) === dialog
      ) {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
      }
    }
    if (dialogCount++ === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    dialog.showModal()
    dialog.addEventListener('cancel', cancel)
    window.addEventListener('keydown', keydown)
    return () => {
      dialog.removeEventListener('cancel', cancel)
      window.removeEventListener('keydown', keydown)
      dialog.close()
      if (--dialogCount === 0) document.body.style.overflow = previousOverflow
    }
  }, [])
  return (
    <dialog
      ref={element}
      className={`shared-dialog ${className}`}
      aria-label={title}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.target === event.currentTarget &&
          (event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom)
        )
          onClose()
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label={`Close ${title}`}
        title="Close"
        onClick={onClose}
      >
        <X size={22} />
      </button>
      {children}
    </dialog>
  )
}
