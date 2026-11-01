// Interactive "volume, intensity, price" split for the AI cost case study.
// Bill = questions × calls per question × cost per call. A change in the bill is split
// into those three parts with the log-mean (LMDI) method, so the parts add up exactly.

const root = document.querySelector("[data-split]");

if (root) {
  const PRESETS = {
    rebuild: { q0: 29000, q1: 90000, i0: 5, i1: 2, p0: 9.6, p1: 2.5 },
    hike: { q0: 29000, q1: 29000, i0: 5, i1: 5, p0: 9.6, p1: 18.24 },
  };
  const FIELDS = ["q0", "q1", "i0", "i1", "p0", "p1"];
  const input = (k) => root.querySelector(`[data-k="${k}"]`);
  const last = {};

  const read = (k) => {
    const raw = input(k).value.trim().replace(/[,\s$]/g, "").toLowerCase();
    const m = /^(\d*\.?\d+)(k|m)?$/.exec(raw);
    const n = m ? Number(m[1]) * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1) : NaN;
    if (n > 0) last[k] = n;
    return last[k];
  };

  const usd = (v) => `$${Math.round(Math.abs(v)).toLocaleString("en-US")}`;
  const signed = (v) => `${v < 0 ? "−" : "+"}${usd(v)}`;
  const pct = (v) => `${Math.round(Math.abs(v) * 100)}%`;
  const fmt = (n) => (Number.isInteger(n) ? n.toLocaleString("en-US") : String(n));

  /** Splits S1 − S0 into effects of each factor; effects sum to the total exactly. */
  function split(before, after) {
    const s0 = before.reduce((a, b) => a * b, 1);
    const s1 = after.reduce((a, b) => a * b, 1);
    const w = s1 === s0 ? s0 : (s1 - s0) / (Math.log(s1) - Math.log(s0));
    return { s0, s1, effects: before.map((x, i) => w * Math.log(after[i] / x)) };
  }

  function render(animate) {
    const [q0, q1, i0, i1, p0, p1] = FIELDS.map(read);
    // Cost per call is entered per 1,000 calls.
    const { s0, s1, effects } = split([q0, i0, p0 / 1000], [q1, i1, p1 / 1000]);
    const total = s1 - s0;
    const [vol, inten, price] = effects;

    root.querySelector("[data-out=label]").textContent =
      total < 0 ? "The monthly bill fell by" : total > 0 ? "The monthly bill rose by" : "The monthly bill didn't change";
    root.querySelector("[data-out=total]").textContent = usd(total);

    const parts = [];
    if (q1 !== q0) parts.push(`${q1 > q0 ? "more" : "fewer"} questions ${vol > 0 ? "added" : "saved"} ${usd(vol)}`);
    if (i1 !== i0) parts.push(`going from ${fmt(i0)} to ${fmt(i1)} calls per question ${inten > 0 ? "added" : "saved"} ${usd(inten)}`);
    if (p1 !== p0) parts.push(`each call getting ${pct(p1 / p0 - 1)} ${p1 < p0 ? "cheaper" : "more expensive"} ${price > 0 ? "added" : "saved"} ${usd(price)}`);
    const sentence = parts.length ? parts.join(", ") : "nothing changed";
    root.querySelector("[data-out=sentence]").textContent = sentence[0].toUpperCase() + sentence.slice(1) + ".";

    // Waterfall: increases first, so the running total never dips below zero.
    const steps = [
      { name: q1 >= q0 ? "More questions" : "Fewer questions", d: vol },
      { name: i1 <= i0 ? "Fewer calls each" : "More calls each", d: inten },
      { name: p1 <= p0 ? "Cheaper calls" : "Pricier calls", d: price },
    ].sort((a, b) => b.d - a.d);
    const bars = [{ name: "Before", from: 0, to: s0, kind: "base", label: usd(s0) }];
    let run = s0;
    for (const s of steps) {
      bars.push({ name: s.name, from: run, to: run + s.d, kind: Math.abs(s.d) < 0.5 ? "flat" : s.d < 0 ? "down" : "up", label: Math.abs(s.d) < 0.5 ? "$0" : signed(s.d) });
      run += s.d;
    }
    bars.push({ name: "After", from: 0, to: s1, kind: "base", label: usd(s1) });

    const max = Math.max(...bars.flatMap((b) => [b.from, b.to]), 1);
    const host = root.querySelector("[data-out=bars]");
    host.classList.toggle("animate", animate);
    host.innerHTML = bars
      .map((b) => {
        const lo = Math.min(b.from, b.to) / max;
        const len = Math.max(Math.abs(b.to - b.from) / max, 0.003);
        return `<div class="sc-row"><span class="sc-name">${b.name}</span><span class="sc-track"><span class="sc-bar" data-kind="${b.kind}" style="transform:translateX(${lo * 100}%) scaleX(${len})"></span></span><span class="sc-value">${b.label}</span></div>`;
      })
      .join("");
  }

  function load(name) {
    const p = PRESETS[name];
    for (const k of FIELDS) {
      input(k).value = k.startsWith("p") ? p[k].toFixed(2) : fmt(p[k]);
      last[k] = p[k];
    }
    root.querySelectorAll("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.preset === name)));
    render(true);
  }

  root.addEventListener("input", () => {
    root.querySelectorAll("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", "false"));
    render(true);
  });
  root.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => load(b.dataset.preset)));
  load("rebuild");
  root.querySelector("[data-out=bars]").classList.remove("animate");
}
