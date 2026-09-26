/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { SiteShell } from '../../src/components/site-shell';
import { exampleSessions } from '../../src/generated/site-data';
export default function Examples() {
  return <SiteShell title="Example sessions" active="Examples"><section class="page-intro"><p class="eyebrow">FROM REFERENCE TO PROJECT</p><h1>Diagrams in context.</h1><p>One complete exploration and five application examples. Each project example has its own brief; they explain different features.</p></section><div class="example-grid">{exampleSessions.map(s=><a class="example-tile" href={s.href}><div class="example-art"><img src={s.preview} alt={s.title} width="720" height="400"/></div><div class="example-copy"><span class="eyebrow">{s.candidates} {s.candidates===1?'CANDIDATE':'CANDIDATES'} · {s.rounds} {s.rounds===1?'ROUND':'ROUNDS'}</span><h2>{s.title}</h2><p>{s.description}</p><span class="open-example">Open session ↗</span></div></a>)}</div></SiteShell>;
}
