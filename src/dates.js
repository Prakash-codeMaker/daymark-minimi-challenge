const DAY_MS = 86400000;
const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function partsAt(date, timezone) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit', weekday:'long' }).formatToParts(date);
  const o = Object.fromEntries(p.map(x => [x.type, x.value]));
  return { year:+o.year, month:+o.month, day:+o.day, weekday:o.weekday.toLowerCase(), weekdayIndex:weekdays.indexOf(o.weekday.toLowerCase()) };
}
function isoDay({year,month,day}) { return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
function shiftDay(iso, delta) { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+delta); return d.toISOString().slice(0,10); }
function dayBounds(iso, timezone) {
  const start = new Date(`${iso}T00:00:00`);
  // Find local midnight's UTC instant without relying on host timezone.
  const toUtc = (dateString) => {
    let guess = new Date(`${dateString}T00:00:00Z`);
    for (let i=0;i<3;i++) {
      const shown = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(guess);
      const v=Object.fromEntries(shown.map(x=>[x.type,x.value]));
      const represented=Date.UTC(+v.year,+v.month-1,+v.day,+v.hour,+v.minute,+v.second);
      guess = new Date(guess.getTime() + (Date.UTC(+dateString.slice(0,4),+dateString.slice(5,7)-1,+dateString.slice(8,10))-represented));
    }
    return guess.toISOString();
  };
  return { start:toUtc(iso), end:toUtc(shiftDay(iso,1)) };
}

export function resolveDateReferences(text, { now = new Date(), timezone = 'Asia/Kolkata' } = {}) {
  const local = partsAt(now, timezone);
  const today = isoDay(local);
  const found = [];
  const add = (phrase, iso, confidence='exact') => { if (iso) found.push({ phrase, date:iso, ...dayBounds(iso,timezone), confidence }); };
  const lower = text.toLowerCase();
  for (const phrase of ['today','yesterday','day before yesterday']) {
    if (new RegExp(`\\b${phrase.replaceAll(' ','\\s+')}\\b`).test(lower)) add(phrase, shiftDay(today, phrase==='today'?0:phrase==='yesterday'?-1:-2));
  }
  const rel = lower.match(/\b(\d+)\s+(day|days|week|weeks)\s+ago\b/);
  if (rel) add(rel[0], shiftDay(today, -(Number(rel[1])*(rel[2].startsWith('week')?7:1))));
  for (let i=0;i<7;i++) {
    const name=weekdays[i];
    if (!new RegExp(`\\b${name}\\b`).test(lower)) continue;
    const back=((local.weekdayIndex-i+7)%7)||7;
    const last= new RegExp(`\\blast\\s+${name}\\b`).test(lower);
    if (last) {
      // "last Tuesday" is genuinely ambiguous near a week boundary. Preserve both readings.
      add(`last ${name} (nearest previous)`, shiftDay(today,-back), 'ambiguous-weekday');
      add(`last ${name} (previous calendar week)`, shiftDay(today,-(back+7)), 'ambiguous-weekday');
    } else add(name, shiftDay(today,-back), 'weekday-past');
  }
  const monthNames='january february march april may june july august september october november december'.split(' ');
  const dateRe=/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?\b/g;
  let m;
  while((m=dateRe.exec(lower))) {
    const month=monthNames.indexOf(m[2])+1, day=Number(m[1]);
    let year=m[3]?Number(m[3]):local.year;
    let iso=isoDay({year,month,day});
    if (!m[3] && iso>today) { year--; iso=isoDay({year,month,day}); }
    if (new Date(`${iso}T00:00:00Z`).getUTCDate()===day) add(m[0],iso);
  }
  const numeric=/\b(20\d{2})-(\d{2})-(\d{2})\b/g;
  while((m=numeric.exec(lower))) add(m[0],m[0]);
  // Deduplicate multiple phrase matches resolving to the same local day.
  const seen=new Set();
  return found.filter(x=>{if(seen.has(x.date))return false;seen.add(x.date);return true;});
}

export function localDayRange(iso, timezone) { return dayBounds(iso, timezone); }
