
// Apex SPA using hash routing. Persists settings. Uses Ultraviolet to proxy.
(function() {
  const el = (tag, attrs={}, children=[]) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "style") e.style.cssText = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    }
    for (const c of (Array.isArray(children) ? children : [children])) {
      if (c == null) continue;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return e;
  };

  const DEFAULTS = {
    theme: "apex",
    engine: "google",
    cloaker: true
  };

  const ENGINES = {
    google: { label: "Google", q: q => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    bing:   { label: "Bing",   q: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
    ddg:    { label: "DuckDuckGo", q: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` }
  };

  const GAMES = [
    { name: "Slope", desc: "Endless runner", url: "https://your-slope.vercel.app" },
    { name: "Retro Bowl", desc: "Football sim", url: "https://your-retro-bowl.vercel.app" },
    { name: "2048", desc: "Classic puzzle", url: "https://your-2048.vercel.app" },
  ];
  const APPS = [
    { name: "YouTube", desc: "Video", url: "https://youtube.com" },
    { name: "Reddit", desc: "Communities", url: "https://www.reddit.com" },
    { name: "SoundCloud", desc: "Music", url: "https://soundcloud.com" },
    { name: "GeForce NOW", desc: "Cloud gaming", url: "https://play.geforcenow.com" },
  ];

  const storeKey = "apex.settings";
  const load = () => {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(storeKey)||"{}")); }
    catch { return { ...DEFAULTS }; }
  };
  const save = (s) => localStorage.setItem(storeKey, JSON.stringify(s));

  let settings = load();
  document.body.setAttribute("data-theme", settings.theme);

  // NAV active highlight
  function setActive() {
    const id = location.hash || "#/";
    for (const link of ["home","games","apps","settings"]) {
      const a = document.getElementById(`nav-${link}`);
      if (!a) continue;
      a.classList.toggle("active", a.getAttribute("href") === id);
    }
  }
  addEventListener("hashchange", () => { setActive(); render(); });

  // about:blank cloaker
  function openCloaked(target) {
    const w = window.open("about:blank", "_blank");
    if (!w) return;
    const proxied = __uv$config.prefix + __uv$config.encodeUrl(target);
    w.document.write(`<!doctype html><html><head><title>about:blank</title><meta name="referrer" content="no-referrer"><style>html,body,iframe{height:100%;width:100%;margin:0;background:#000}</style></head><body><iframe src="${proxied}" frameborder="0" allow="fullscreen"></iframe></body></html>`);
    w.document.close();
  }

  function toProxyUrl(url) {
    // If no protocol and looks like a domain, add https.
    try {
      if (!/^https?:\/\//i.test(url) && /\./.test(url)) url = "https://" + url;
    } catch {}
    // If no dot, treat as search query.
    if (!/\./.test(url)) {
      const build = ENGINES[settings.engine]?.q || ENGINES.google.q;
      url = build(url);
    }
    return __uv$config.prefix + __uv$config.encodeUrl(url);
  }

  function searchBar({ autofocus=false }={}) {
    const input = el("input", { placeholder: "Search or enter URL", ...(autofocus?{autofocus:true}:{}) });
    const select = el("select", {}, Object.entries(ENGINES).map(([k,v]) => el("option", { value:k, selected: settings.engine===k }, v.label)));
    select.addEventListener("change", () => { settings.engine = select.value; save(settings); });
    const go = () => {
      const raw = input.value.trim();
      if (!raw) return;
      const target = toProxyUrl(raw);
      const iframe = document.querySelector("iframe.viewer");
      if (settings.cloaker) openCloaked(raw);
      else if (iframe) iframe.src = target;
    };
    const btn = el("button", { class:"btn primary", onclick: go }, "Go");
    input.addEventListener("keydown", (e)=>{ if (e.key === "Enter") go(); });
    return el("div", { class:"search" }, [ select, input, btn ]);
  }

  function home() {
    return el("div", { class:"grid", style:"gap:1rem" }, [
      el("div", { class:"card" }, [
        el("h2", {}, "Apex"),
        el("p", { class:"muted" }, "Red and black by default. Ultraviolet under the hood."),
        searchBar({ autofocus:true }),
        el("div", { style:"height:.75rem" }),
        el("iframe", { class:"viewer" })
      ]),
      el("div", { class:"card" }, [
        el("div", { class:"row" }, [
          el("span", { class:"pill" }, "Quick launch"),
          el("span", { class:"muted" }, "opens via proxy")
        ]),
        el("div", { class:"grid apps", style:"margin-top:.75rem" }, APPS.map(app => quickItem(app)))
      ])
    ]);
  }

  function quickItem({ name, desc, url }) {
    const open = () => {
      if (settings.cloaker) openCloaked(url);
      else {
        const iframe = document.querySelector("iframe.viewer");
        if (iframe) iframe.src = __uv$config.prefix + __uv$config.encodeUrl(url);
        else window.location.hash = "#/";
      }
    };
    return el("div", { class:"item" }, [
      el("h4", {}, name),
      el("p", { class:"muted" }, desc),
      el("div", { class:"actions" }, [
        el("button", { class:"btn primary", onclick: open }, "Open")
      ])
    ]);
  }

  function games() {
    return el("div", { class:"grid" }, [
      el("div", { class:"card" }, [
        el("h2", {}, "Games"),
        el("p", { class:"muted" }, "These load through the proxy. Replace URLs in spa.js → GAMES."),
        el("div", { class:"grid apps", style:"margin-top:.75rem" }, GAMES.map(g => {
          const open = () => settings.cloaker ? openCloaked(g.url) : (document.querySelector("iframe.viewer")?.setAttribute("src", toProxyUrl(g.url)));
          return el("div", { class:"item" }, [
            el("h4", {}, g.name),
            el("p", { class:"muted" }, g.desc || ""),
            el("div", { class:"actions" }, [
              el("button", { class:"btn primary", onclick: open }, "Play")
            ])
          ]);
        }))
      }),
      el("div", { class:"card" }, [
        el("h3", {}, "Viewer"),
        el("iframe", { class:"viewer" })
      ])
    ]);
  }

  function apps() {
    return el("div", { class:"grid" }, [
      el("div", { class:"card" }, [
        el("h2", {}, "Apps"),
        el("div", { class:"grid apps", style:"margin-top:.75rem" }, APPS.map(quickItem))
      ])
    ]);
  }

  function settingsView() {
    const themeSelect = el("select", {}, [
      el("option", { value:"apex", selected: settings.theme==="apex" }, "Apex (Red/Black)"),
      el("option", { value:"midnight", selected: settings.theme==="midnight" }, "Midnight"),
      el("option", { value:"forest", selected: settings.theme==="forest" }, "Forest"),
      el("option", { value:"violet", selected: settings.theme==="violet" }, "Violet")
    ]);
    themeSelect.addEventListener("change", ()=>{
      settings.theme = themeSelect.value; save(settings);
      document.body.setAttribute("data-theme", settings.theme);
    });

    const cloakerSwitch = el("div", { class:`switch ${settings.cloaker?'on':''}` });
    const knob = el("div", { class:"knob" });
    cloakerSwitch.appendChild(knob);
    const toggle = ()=>{ settings.cloaker = !settings.cloaker; cloakerSwitch.classList.toggle("on", settings.cloaker); save(settings); };
    cloakerSwitch.addEventListener("click", toggle);

    const engineSelect = el("select", {}, Object.entries(ENGINES).map(([k,v]) => el("option", { value:k, selected: settings.engine===k }, v.label)));
    engineSelect.addEventListener("change", ()=>{ settings.engine = engineSelect.value; save(settings); });

    const resetBtn = el("button", { class:"btn neutral", onclick: ()=>{ settings = { ...DEFAULTS }; save(settings); location.reload(); } }, "Reset");

    return el("div", { class:"grid" }, [
      el("div", { class:"card" }, [
        el("h2", {}, "Settings"),
        el("div", { class:"row" }, [ el("div", { class:"pill" }, "Theme"), themeSelect ]),
        el("div", { class:"row" }, [ el("div", { class:"pill" }, "Cloaker"), cloakerSwitch, el("span", { class:"muted" }, "Open in about:blank") ]),
        el("div", { class:"row" }, [ el("div", { class:"pill" }, "Search"), engineSelect ]),
        el("div", { style:"margin-top:1rem" }, [ resetBtn ]),
        el("p", { class:"muted", style:"margin-top:.5rem" }, "Settings persist per device in localStorage.")
      ])
    ]);
  }

  function render() {
    const root = document.getElementById("app");
    root.innerHTML = "";
    const hash = location.hash || "#/";
    if (hash.startsWith("#/games")) root.appendChild(games());
    else if (hash.startsWith("#/apps")) root.appendChild(apps());
    else if (hash.startsWith("#/settings")) root.appendChild(settingsView());
    else root.appendChild(home());
  }

  document.getElementById("open-blank").addEventListener("click", ()=>{
    const url = prompt("Enter URL or search");
    if (!url) return;
    if (settings.cloaker) openCloaked(url);
    else {
      const prox = toProxyUrl(url);
      const iframe = document.querySelector("iframe.viewer");
      if (iframe) iframe.src = prox;
    }
  });

  setActive();
  render();
})();