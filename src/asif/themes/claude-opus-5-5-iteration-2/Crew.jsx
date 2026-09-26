import {
  BadgeCheck,
  Cloud,
  Code,
  Download,
  Dumbbell,
  Github,
  GraduationCap,
  Instagram,
  Link as LinkIcon,
  Linkedin,
  Sparkles,
  Youtube,
} from 'lucide-react'
import { useAsif } from '../../core.jsx'
import { ResponsiveImage } from '../../features.jsx'
import { barcode, contactValue, machineLine } from './airside.mjs'

const SOCIAL = {
  linkedin: ['LinkedIn', Linkedin],
  github: ['GitHub', Github],
  youtube: ['YouTube', Youtube],
  instagram: ['Instagram', Instagram],
}

export function socialLinks(profile) {
  return Object.entries(profile.social).map(([key, url]) => {
    const [label, Icon] = SOCIAL[key] || [
      key[0].toUpperCase() + key.slice(1),
      LinkIcon,
    ]
    return { key, url, label, Icon }
  })
}

function serviceIcon(icon) {
  if (/cloud/.test(icon)) return Cloud
  if (/graduation|hat|school/.test(icon)) return GraduationCap
  if (/code/.test(icon)) return Code
  if (/gym|fitness/.test(icon)) return Dumbbell
  return Sparkles
}

export function Barcode({ text, className = '' }) {
  const bars = barcode(text, 96)
  return (
    <svg
      className={`as-barcode ${className}`}
      viewBox="0 0 96 24"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y="0" width={bar.width} height="24" />
      ))}
    </svg>
  )
}

export function Crew() {
  const { profile, contract } = useAsif()
  const about = profile.about
  const base = contactValue(profile, 'map-marker')
  const status = contactValue(profile, 'checkmark')
  return (
    <div className="as-crew">
      <div className="as-badge-holder">
        <article className="as-badge" aria-label="Crew identification card">
          <span className="as-badge-slot" aria-hidden="true" />
          <div className="as-badge-band" aria-hidden="true">
            <span>Airside</span>
            <span>
              {contract.sections.map((section) => (
                <b key={section.id}>{section.id[0].toUpperCase()}</b>
              ))}
            </span>
          </div>
          <div className="as-badge-body">
            <ResponsiveImage
              className="as-badge-photo"
              src={profile.photo}
              alt={profile.name}
              sizes="(max-width: 700px) 38vw, 190px"
            />
            <dl className="as-badge-fields">
              <div>
                <dt>Name</dt>
                <dd className="as-badge-name">{profile.name}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{profile.subtitle}</dd>
              </div>
              {base && (
                <div>
                  <dt>Base</dt>
                  <dd>{base}</dd>
                </div>
              )}
              {profile.resume.startYear && (
                <div>
                  <dt>Since</dt>
                  <dd>{profile.resume.startYear}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="as-badge-ratings">
            <p>Ratings</p>
            <ul>
              {profile.roles.map((role) => (
                <li key={role}>{role}</li>
              ))}
            </ul>
          </div>
          {status && (
            <p className="as-badge-status">
              <BadgeCheck size={17} aria-hidden="true" />
              {status}
            </p>
          )}
          <div className="as-badge-foot" aria-hidden="true">
            <Barcode text={profile.name} />
            <span className="as-mrz">{machineLine(profile.name)}</span>
          </div>
        </article>
      </div>

      <div className="as-crew-text">
        <p className="as-crew-headline">{about.headline}</p>
        <div className="as-crew-copy">
          {about.intro.split('\n\n').map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {about.experience.split('\n\n').map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="as-crew-actions">
          <a
            className="as-sign as-sign--mandatory as-cv"
            href={about.cvLink}
            download
          >
            <Download size={19} aria-hidden="true" />
            Download CV
            <span className="as-cv-kind" aria-hidden="true">
              PDF
            </span>
          </a>
          <ul className="as-social" aria-label="Social profiles">
            {socialLinks(profile).map(({ key, url, label, Icon }) => (
              <li key={key}>
                <a href={url} target="_blank" rel="noreferrer">
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="as-checklist-block">
        <h3 className="as-block-title">
          <span>Pre-flight checklist</span>
          <span className="as-block-meta">
            Expertise · {about.skills.length} items
          </span>
        </h3>
        <ol className="as-checklist">
          {about.skills.map((skill, index) => (
            <li key={skill}>
              <span className="as-check-no" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="as-check-item">{skill}</span>
              <span className="as-check-lead" aria-hidden="true" />
              <span className="as-check-state" aria-hidden="true">
                Check
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="as-services-block">
        <h3 className="as-block-title">
          <span>Services</span>
          <span className="as-block-meta">
            {profile.services.length} counters open
          </span>
        </h3>
        <ul className="as-services">
          {profile.services.map((service) => {
            const Icon = serviceIcon(service.icon)
            return (
              <li className="as-service" key={service.title}>
                <span className="as-service-sign" aria-hidden="true">
                  <Icon size={34} strokeWidth={2.2} />
                </span>
                <h4>{service.title}</h4>
                <p>{service.description}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
