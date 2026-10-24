(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Light/dark toggle. The head script applies the saved choice before paint.
  const root = document.documentElement;
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const resolved = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");
  const sync = () => {
    const now = resolved();
    root.dataset.themeResolved = now;
    const next = now === "dark" ? "light" : "dark";
    document.querySelectorAll(".theme-toggle").forEach((b) => b.setAttribute("aria-label", `Switch to ${next} mode`));
    document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute("content", getComputedStyle(root).getPropertyValue("--ground").trim());
  };
  document.querySelectorAll(".theme-toggle").forEach((btn) => btn.addEventListener("click", () => {
    root.dataset.theme = resolved() === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch {}
    sync();
  }));
  systemDark.addEventListener("change", sync);
  sync();

  // Highlight the section being read in the side nav.
  const links = [...document.querySelectorAll(".toc a")];
  if (links.length && "IntersectionObserver" in window) {
    const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a) => a.removeAttribute("aria-current"));
        byId.get(entry.target.id)?.setAttribute("aria-current", "true");
      }
    }, { rootMargin: "-35% 0px -60% 0px" });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // Gentle reveals. Content stays visible if this never runs.
  if (reduce || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js");

  document.querySelectorAll("[data-stagger]").forEach((group) => {
    group.querySelectorAll("[data-reveal]").forEach((el, i) => el.style.setProperty("--i", i));
  });

  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("in");
      reveal.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px 15% 0px" });

  document.querySelectorAll("[data-reveal]").forEach((el) => {
    // The first screen gets a quick entrance on load; the rest reveals as you scroll.
    if (el.getBoundingClientRect().top < innerHeight) {
      setTimeout(() => el.classList.add("in"), 16);
    } else {
      reveal.observe(el);
    }
  });

  // Section links jump instantly; show the target section without waiting for a fade.
  addEventListener("hashchange", () => {
    const target = location.hash.length > 1 ? document.querySelector(location.hash) : null;
    target?.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("in", "now"));
  });
})();
