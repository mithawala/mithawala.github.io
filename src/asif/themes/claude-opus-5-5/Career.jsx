import { parsePeriod, mostAtOnce } from './timeline.js'

export default function Career({ resume }) {
  const today = new Date()
  const now = today.getFullYear() + (today.getMonth() + 0.5) / 12
  const rows = [
    ...resume.experience.map((entry) => ({ entry, kind: 'work' })),
    ...resume.education.map((entry) => ({ entry, kind: 'study' })),
  ].map((row) => ({ ...row, span: parsePeriod(row.entry.period, now) }))
  const timed = rows.filter((row) => row.span)
  const first = Math.floor(Math.min(...timed.map((row) => row.span.start)))
  const last = Math.ceil(now)
  const width = last - first
  const ticks = []
  for (let year = Math.ceil(first / 5) * 5; year <= last; year += 5)
    ticks.push(year)
  const overlap = mostAtOnce(
    timed.filter((row) => row.kind === 'work').map((row) => row.span),
  )
  const years = today.getFullYear() - resume.startYear
  const skillGroups = [
    ['Functional', resume.functionalSkills],
    ['Code', resume.codingSkills],
  ]

  return (
    <section
      id="resume"
      className="op-section op-career"
      tabIndex={-1}
      aria-labelledby="op-career-title"
    >
      <header className="op-section-head">
        <h2 id="op-career-title">Career</h2>
        <p>
          {years} years of work, with as many as {overlap} roles running at the
          same time. Each line is a role or a school, drawn from its dates.
        </p>
      </header>

      <figure className="op-timeline" aria-hidden="true">
        <div className="op-timeline-rows">
          {timed.map(({ entry, kind, span }) => (
            <div
              className={`op-timeline-row is-${kind}`}
              key={`${entry.company}-${entry.period}`}
            >
              <span className="op-timeline-name">{entry.company}</span>
              <span className="op-timeline-track">
                <span
                  className={`op-timeline-bar${span.end >= now ? ' is-current' : ''}`}
                  style={{
                    left: `${((span.start - first) / width) * 100}%`,
                    width: `${Math.max(((span.end - span.start) / width) * 100, 0.8)}%`,
                  }}
                />
              </span>
            </div>
          ))}
        </div>
        <div className="op-timeline-axis">
          <span />
          <span className="op-timeline-ticks">
            {ticks.map((year) => (
              <span
                key={year}
                style={{ left: `${((year - first) / width) * 100}%` }}
              >
                {year}
              </span>
            ))}
          </span>
        </div>
      </figure>

      <div className="op-career-body">
        <div className="op-roles">
          <h3 className="op-subhead">Experience</h3>
          {resume.experience.map((job, index) => (
            <details
              className="op-role"
              key={`${job.company}-${job.period}`}
              open={index === 0}
            >
              <summary>
                <img src={job.logo} alt="" loading="lazy" />
                <span className="op-role-heading">
                  <span className="op-role-period">{job.period}</span>
                  <span className="op-role-title">{job.title}</span>
                  <span className="op-role-company">{job.company}</span>
                </span>
                <span className="op-role-toggle-icon" aria-hidden="true" />
              </summary>
              <p className="op-preserve">{job.description}</p>
            </details>
          ))}
        </div>
        <div className="op-career-side">
          <h3 className="op-subhead">Education</h3>
          <ul className="op-education">
            {resume.education.map((school) => (
              <li key={`${school.company}-${school.period}`}>
                <img src={school.logo} alt="" loading="lazy" />
                <div>
                  <p className="op-role-period">{school.period}</p>
                  <p className="op-education-title">{school.title}</p>
                  <p className="op-role-company">{school.company}</p>
                  <p className="op-education-note">{school.description}</p>
                </div>
              </li>
            ))}
          </ul>
          {skillGroups.map(([title, skills]) => (
            <div className="op-skills" key={title}>
              <h3 className="op-subhead">{title}</h3>
              <ul>
                {skills.map((skill) => (
                  <li key={skill.name}>
                    <span className="op-skill-name">{skill.name}</span>
                    <span className="op-skill-value">{skill.value}%</span>
                    <meter
                      min="0"
                      max="100"
                      value={skill.value}
                      aria-label={skill.name}
                      style={{ '--fill': Math.max(skill.value, 1) / 100 }}
                    >
                      {skill.value}%
                    </meter>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
