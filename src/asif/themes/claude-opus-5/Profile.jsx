import { Download, Github, Instagram, Linkedin, Youtube } from 'lucide-react'
import { ResponsiveImage } from '../../features.jsx'

const ICONS = {
  linkedin: Linkedin,
  github: Github,
  youtube: Youtube,
  instagram: Instagram,
}

function Paragraphs({ text, className = '' }) {
  return text.split('\n\n').map((block, index) => (
    <p key={index} className={className}>
      {block}
    </p>
  ))
}

export function About({ profile }) {
  return (
    <section className="o5-section o5-plate o5-pad" id="about">
      <div className="o5-frame o5-about">
        <header className="o5-head o5-about-head">
          <p className="o5-rule o5-mono">
            <span>§ 02 — Person</span>
            <span className="o5-num">{profile.about.skills.length} fields</span>
          </p>
          <h2>The engineer behind the points.</h2>
        </header>

        <figure className="o5-portrait">
          <ResponsiveImage
            src={profile.photo}
            alt={`${profile.name}, photographed in black and white`}
            sizes="(max-width: 900px) 84vw, 30vw"
          />
          <figcaption className="o5-mono o5-dim">
            {profile.name} — {profile.subtitle}
          </figcaption>
        </figure>

        <div className="o5-about-text o5-prose">
          <Paragraphs text={profile.about.intro} />
          <Paragraphs text={profile.about.experience} />
          <div className="o5-about-actions">
            <a className="o5-button" href={profile.about.cvLink} download>
              <Download size={15} aria-hidden="true" /> Download CV
            </a>
            <ul className="o5-socials">
              {Object.entries(profile.social).map(([name, url]) => {
                const Icon = ICONS[name]
                return (
                  <li key={name}>
                    <a
                      className="o5-icon o5-social"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${profile.name} on ${name[0].toUpperCase()}${name.slice(1)}`}
                    >
                      {Icon ? <Icon size={18} /> : name}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="o5-expertise">
          <h3 className="o5-mono o5-dim">Expertise</h3>
          <ol>
            {profile.about.skills.map((skill, index) => (
              <li key={skill}>
                <span className="o5-num o5-dim" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {skill}
              </li>
            ))}
          </ol>
        </div>

        <div className="o5-services">
          <h3 className="o5-mono o5-dim">What he takes on</h3>
          <ul>
            {profile.services.map((service, index) => (
              <li key={service.title}>
                <span className="o5-num o5-dim" aria-hidden="true">
                  0{index + 1}
                </span>
                <h4>{service.title}</h4>
                <p>{service.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Meters({ title, skills }) {
  return (
    <div className="o5-meters">
      <h4 className="o5-mono o5-dim">{title}</h4>
      <ul>
        {skills.map((skill) => (
          <li key={skill.name}>
            <span className="o5-meter-name">{skill.name}</span>
            <span className="o5-meter-value o5-num o5-dim" aria-hidden="true">
              {skill.value}
            </span>
            <meter
              aria-label={skill.name}
              min="0"
              max="100"
              value={skill.value}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Record({ entry, index }) {
  return (
    <li className="o5-record">
      <div className="o5-record-side">
        <span className="o5-num o5-dim o5-record-index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        {entry.logo && <img src={entry.logo} alt="" loading="lazy" />}
        <p className="o5-mono o5-num">{entry.period}</p>
      </div>
      <div className="o5-record-main">
        <h4>{entry.title}</h4>
        <p className="o5-record-company">{entry.company}</p>
        <p className="o5-record-body">{entry.description}</p>
      </div>
    </li>
  )
}

export function Resume({ profile }) {
  const { experience, education, functionalSkills, codingSkills } =
    profile.resume
  return (
    <section className="o5-section o5-plate o5-pad" id="resume">
      <div className="o5-frame o5-resume">
        <header className="o5-head">
          <p className="o5-rule o5-mono">
            <span>§ 03 — Record</span>
            <span className="o5-num">
              {experience.length + education.length} positions &amp; degrees
            </span>
          </p>
          <h2>Eighteen years, kept in order.</h2>
          <p>
            Trucks at night, an IT department at the Red Cross, a cloud practice
            at Accenture, architecture at AWS, and now leading solution
            engineering for Cloud &amp; AI at Microsoft.
          </p>
        </header>

        <h3 className="o5-mono o5-dim o5-column-head o5-resume-title">
          Experience
        </h3>
        <ol className="o5-records o5-records-split">
          {experience.map((entry, index) => (
            <Record
              key={`${entry.company}-${entry.period}`}
              entry={entry}
              index={index}
            />
          ))}
        </ol>

        <div className="o5-resume-aside">
          <div>
            <h3 className="o5-mono o5-dim o5-column-head">Education</h3>
            <ol className="o5-records">
              {education.map((entry, index) => (
                <Record
                  key={`${entry.company}-${entry.period}`}
                  entry={entry}
                  index={index}
                />
              ))}
            </ol>
          </div>
          <Meters title="Functional" skills={functionalSkills} />
          <Meters title="Coding" skills={codingSkills} />
        </div>
      </div>
    </section>
  )
}
