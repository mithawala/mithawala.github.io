import { useId } from 'react'
import {
  BadgeCheck,
  Info,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Send,
} from 'lucide-react'
import { useAsif } from '../../core.jsx'
import { useContactForm } from '../../features.jsx'
import { contactValue } from './airside.mjs'
import { Barcode } from './Crew.jsx'

function infoIcon(icon) {
  if (/phone/.test(icon)) return Phone
  if (/map|marker|location/.test(icon)) return MapPin
  if (/envelope|mail/.test(icon)) return Mail
  if (/check/.test(icon)) return BadgeCheck
  return Info
}

const STAMPS = { success: 'Accepted', error: 'Returned', sending: 'Loading' }

export function Cargo() {
  const { profile } = useAsif()
  const { status, submit } = useContactForm(profile.contact.endpoint)
  const sending = status.type === 'sending'
  const id = useId()
  const field = (name) => `${id}-${name}`
  const place = contactValue(profile, 'map-marker')
  return (
    <div className="as-cargo">
      <div className="as-consignee">
        <h3 className="as-block-title">
          <span>Consignee</span>
          <span className="as-block-meta">Deliver to</span>
        </h3>
        <p className="as-consignee-name">{profile.name}</p>
        <ul className="as-contact-list">
          {profile.contact.info.map((info) => {
            const Icon = infoIcon(info.icon)
            return (
              <li key={info.value}>
                <span className="as-contact-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                {info.link ? (
                  <a href={info.link}>{info.value}</a>
                ) : (
                  <span>{info.value}</span>
                )}
              </li>
            )
          })}
        </ul>
        <div className="as-map">
          <iframe
            title={`Map of ${place || 'the base'}`}
            src={profile.contact.mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <span className="as-map-pin" aria-hidden="true">
            {place}
          </span>
        </div>
      </div>

      <form
        className="as-awb"
        onSubmit={submit}
        aria-label="Contact form"
        data-state={status.type}
      >
        <div className="as-awb-head">
          <div>
            <p className="as-awb-kind">Air waybill</p>
            <p className="as-awb-title">How can I help you?</p>
          </div>
          <div className="as-awb-code" aria-hidden="true">
            <Barcode text={`${profile.name} waybill`} />
            <span>AM · {new Date().getFullYear()}</span>
          </div>
        </div>
        <div className="as-awb-grid">
          <div className="as-box">
            <span className="as-box-no" aria-hidden="true">
              01
            </span>
            <label htmlFor={field('name')}>Your name</label>
            <input
              id={field('name')}
              name="name"
              autoComplete="name"
              required
              disabled={sending}
              placeholder="Full name"
            />
          </div>
          <div className="as-box">
            <span className="as-box-no" aria-hidden="true">
              02
            </span>
            <label htmlFor={field('email')}>Email address</label>
            <input
              id={field('email')}
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={sending}
              placeholder="you@example.com"
            />
          </div>
          <div className="as-box as-box--wide">
            <span className="as-box-no" aria-hidden="true">
              03
            </span>
            <label htmlFor={field('subject')}>Subject</label>
            <input
              id={field('subject')}
              name="subject"
              required
              disabled={sending}
              placeholder="Nature of goods"
            />
          </div>
          <div className="as-box as-box--wide as-box--message">
            <span className="as-box-no" aria-hidden="true">
              04
            </span>
            <label htmlFor={field('message')}>Message</label>
            <textarea
              id={field('message')}
              name="message"
              required
              rows="6"
              disabled={sending}
              placeholder="Let's make something happen."
            />
          </div>
        </div>
        <input
          type="text"
          name="_honey"
          tabIndex="-1"
          autoComplete="off"
          className="sr-only"
          aria-hidden="true"
        />
        <div className="as-awb-foot">
          <button className="as-awb-send" type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send message'}
            {sending ? (
              <LoaderCircle
                className="loading-spinner"
                size={19}
                aria-hidden="true"
              />
            ) : (
              <Send size={19} aria-hidden="true" />
            )}
          </button>
          <p
            className={`as-awb-status ${status.type}`}
            role={status.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {status.message}
          </p>
          {STAMPS[status.type] && (
            <span
              className={`as-stamp as-stamp--${status.type}`}
              aria-hidden="true"
            >
              {STAMPS[status.type]}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
