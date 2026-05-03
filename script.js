(() => {
  const q = (s, p = document) => p.querySelector(s);
  const qa = (s, p = document) => [...p.querySelectorAll(s)];

  const WA_BASE = "https://wa.me/60143597478";
  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1TPV9qC2rwZbZCxZVWZjXmBsPI7BoR1VHBvmK3E1SBDQ/export?format=csv&gid=0";

  const ui = {
    header: q(".site-header"),
    hamburger: q("#hamburger-btn"),
    popup: q("#scroll-popup"),
    popupClose: q("#popup-close"),
    listingGrid: q("#listing-grid"),
    listingLoading: q("#listing-loading"),
    listingFallback: q("#listing-fallback"),
    lightbox: q("#listing-lightbox"),
    lightboxImg: q("#lightbox-image"),
    lightboxClose: q("#lightbox-close"),
    lightboxPrev: q("#lightbox-prev"),
    lightboxNext: q("#lightbox-next")
  };

  const lightboxState = {
    images: [],
    index: 0,
    touchStartX: 0,
    touchEndX: 0
  };

  const closeMenu = () => {
    if (!ui.header || !ui.hamburger) return;
    ui.header.classList.remove("menu-open");
    ui.hamburger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };

  const openMenu = () => {
    if (!ui.header || !ui.hamburger) return;
    ui.header.classList.add("menu-open");
    ui.hamburger.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  };

  const initMenu = () => {
    ui.hamburger?.addEventListener("click", () => {
      ui.header?.classList.contains("menu-open") ? closeMenu() : openMenu();
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth >= 768) return;
      if (!ui.header?.classList.contains("menu-open")) return;
      if (!ui.header.contains(e.target)) closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) closeMenu();
    });
  };

  const initFaq = () => {
    const faqItems = qa(".faq-item");
    faqItems.forEach((item) => {
      const btn = q(".faq-q", item);
      const panel = q(".faq-a", item);
      if (!btn || !panel) return;
      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        faqItems.forEach((it) => {
          it.classList.remove("is-open");
          const b = q(".faq-q", it);
          const p = q(".faq-a", it);
          b?.setAttribute("aria-expanded", "false");
          if (p) p.style.maxHeight = "0px";
        });
        if (!isOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
          panel.style.maxHeight = `${panel.scrollHeight}px`;
        }
      });
    });
  };

  const initPopup = () => {
    const seenKey = "khai-popup-closed";

    const onScroll = () => {
      if (!ui.popup || sessionStorage.getItem(seenKey) === "1") return;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      if (range <= 0) return;
      const threshold = window.innerWidth < 768 ? 45 : 35;
      const percent = (window.scrollY / range) * 100;
      if (percent > threshold) {
        ui.popup.classList.add("show");
        window.removeEventListener("scroll", onScroll);
      }
    };

    if (ui.popup) window.addEventListener("scroll", onScroll, { passive: true });

    ui.popupClose?.addEventListener("click", () => {
      ui.popup?.classList.remove("show");
      sessionStorage.setItem(seenKey, "1");
    });
  };

  const initSmoothAnchors = () => {
    qa('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id === "#") return;
        const el = q(id);
        if (!el) return;
        e.preventDefault();
        closeMenu();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const initReveal = () => {
    const items = qa(".reveal");
    const io =
      "IntersectionObserver" in window && window.innerWidth >= 768
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) entry.target.classList.add("is-visible");
              });
            },
            { threshold: 0.12 }
          )
        : null;

    items.forEach((el) => (io ? io.observe(el) : el.classList.add("is-visible")));
  };

  const parseCsv = (text) => {
    const src = (text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      const next = src[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cell += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && next === "\n") i++;
        row.push(cell);
        const hasValue = row.some((v) => String(v).trim() !== "");
        if (hasValue) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }

    if (cell.length || row.length) {
      row.push(cell);
      const hasValue = row.some((v) => String(v).trim() !== "");
      if (hasValue) rows.push(row);
    }

    return rows;
  };

  const parseSheetRows = (csvText) => {
    const rows = parseCsv(csvText);
    if (!rows.length) return [];

    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const out = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const rec = {};
      headers.forEach((h, idx) => {
        if (!h) return;
        rec[h] = String(r[idx] || "").trim();
      });
      const hasValue = Object.values(rec).some((v) => String(v).trim() !== "");
      if (hasValue) out.push(rec);
    }

    return out;
  };

  const normalizeImageUrl = (rawUrl) => {
    const src = String(rawUrl || "").trim();
    if (!src) return "";
    if (!/^https?:\/\//i.test(src)) return src;

    try {
      const u = new URL(src);
      if (u.hostname.includes("drive.google.com")) {
        const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)/i);
        const idFromPath = fileMatch ? fileMatch[1] : "";
        const idFromQuery = u.searchParams.get("id") || "";
        const id = idFromPath || idFromQuery;
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;
      }
      return src;
    } catch (_err) {
      return src;
    }
  };

  const parseImages = (value) =>
    String(value || "")
      .split(",")
      .map((s) => normalizeImageUrl(s))
      .map((s) => s.trim())
      .filter(Boolean);

  const buildWhatsAppUrl = (listing) => {
    const title = listing.title || "rumah ini";
    const location = listing.location || "Sarawak";
    const custom = String(listing.whatsapp_text || "").trim();
    const msg = custom || `Hi Team Khai Ina Ella, saya berminat dengan ${title} di ${location}. Boleh saya dapatkan maklumat lanjut?`;
    return `${WA_BASE}?text=${encodeURIComponent(msg)}`;
  };

  const truncate = (text, n = 150) => {
    const src = String(text || "").trim();
    if (src.length <= n) return src;
    return `${src.slice(0, n - 1).trimEnd()}…`;
  };

  const createDots = (count, index) => {
    const wrap = document.createElement("div");
    wrap.className = "listing-dots";
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      dot.className = `listing-dot${i === index ? " active" : ""}`;
      wrap.append(dot);
    }
    return wrap;
  };

  const openLightbox = (images, startIndex) => {
    if (!ui.lightbox || !ui.lightboxImg || !images.length) return;
    lightboxState.images = images;
    lightboxState.index = Math.max(0, Math.min(startIndex, images.length - 1));
    ui.lightbox.hidden = false;
    ui.lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-open");
    updateLightbox();
  };

  const closeLightbox = () => {
    if (!ui.lightbox) return;
    ui.lightbox.hidden = true;
    ui.lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-open");
  };

  const updateLightbox = () => {
    if (!ui.lightboxImg || !lightboxState.images.length) return;
    ui.lightboxImg.src = lightboxState.images[lightboxState.index];
  };

  const shiftLightbox = (dir) => {
    if (!lightboxState.images.length) return;
    lightboxState.index = (lightboxState.index + dir + lightboxState.images.length) % lightboxState.images.length;
    updateLightbox();
  };

  const initLightbox = () => {
    ui.lightboxClose?.addEventListener("click", closeLightbox);
    ui.lightboxPrev?.addEventListener("click", (e) => {
      e.stopPropagation();
      shiftLightbox(-1);
    });
    ui.lightboxNext?.addEventListener("click", (e) => {
      e.stopPropagation();
      shiftLightbox(1);
    });

    ui.lightbox?.addEventListener("click", (e) => {
      if (e.target === ui.lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (ui.lightbox?.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") shiftLightbox(-1);
      if (e.key === "ArrowRight") shiftLightbox(1);
    });

    ui.lightbox?.addEventListener("touchstart", (e) => {
      lightboxState.touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    ui.lightbox?.addEventListener("touchend", (e) => {
      lightboxState.touchEndX = e.changedTouches[0].clientX;
      const delta = lightboxState.touchStartX - lightboxState.touchEndX;
      if (Math.abs(delta) < 35) return;
      shiftLightbox(delta > 0 ? 1 : -1);
    }, { passive: true });
  };

  const createListingCard = (listing, cardIndex) => {
    const article = document.createElement("article");
    article.className = "listing-card";
    article.setAttribute("role", "listitem");

    const media = document.createElement("div");
    media.className = "listing-media";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "listing-open";
    openBtn.setAttribute("aria-label", `Buka gambar ${listing.title}`);

    const img = document.createElement("img");
    img.alt = listing.title;
    openBtn.appendChild(img);
    media.appendChild(openBtn);

    let index = 0;
    let dotsWrap = null;

    const updateSlide = () => {
      img.src = listing.images[index];
      if (dotsWrap) {
        qa(".listing-dot", dotsWrap).forEach((dot, i) => {
          dot.classList.toggle("active", i === index);
        });
      }
    };

    const shift = (dir) => {
      index = (index + dir + listing.images.length) % listing.images.length;
      updateSlide();
    };

    if (listing.images.length > 1) {
      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "listing-nav prev";
      prev.setAttribute("aria-label", "Gambar sebelum");
      prev.innerHTML = "&#10094;";

      const next = document.createElement("button");
      next.type = "button";
      next.className = "listing-nav next";
      next.setAttribute("aria-label", "Gambar seterusnya");
      next.innerHTML = "&#10095;";

      prev.addEventListener("click", (e) => {
        e.stopPropagation();
        shift(-1);
      });

      next.addEventListener("click", (e) => {
        e.stopPropagation();
        shift(1);
      });

      media.append(prev, next);

      dotsWrap = createDots(listing.images.length, index);
      media.appendChild(dotsWrap);

      let startX = 0;
      let endX = 0;
      media.addEventListener("touchstart", (e) => {
        startX = e.changedTouches[0].clientX;
      }, { passive: true });
      media.addEventListener("touchend", (e) => {
        endX = e.changedTouches[0].clientX;
        const delta = startX - endX;
        if (Math.abs(delta) < 35) return;
        shift(delta > 0 ? 1 : -1);
      }, { passive: true });
    }

    openBtn.addEventListener("click", () => openLightbox(listing.images, index));

    updateSlide();

    const title = document.createElement("h3");
    title.textContent = listing.title;

    const meta = document.createElement("div");
    meta.className = "listing-meta";

    const location = document.createElement("span");
    location.className = "listing-location";
    location.textContent = listing.location || "Sarawak";

    const price = document.createElement("span");
    price.className = "listing-price";
    price.textContent = listing.price || "Harga atas permintaan";

    meta.append(location, price);

    const status = document.createElement("span");
    status.className = "listing-status";
    status.textContent = String(listing.status || "").trim() || "Status belum dikemaskini";

    const desc = document.createElement("p");
    desc.className = "listing-desc";
    desc.textContent = truncate(listing.description || "Listing ini tersedia untuk semakan lanjut bersama team kami.");

    const cta = document.createElement("a");
    cta.className = "btn btn-cta";
    cta.target = "_blank";
    cta.rel = "noopener noreferrer";
    cta.href = buildWhatsAppUrl(listing);
    cta.textContent = "Minat Listing Ini";

    article.append(media, title, meta, status, desc, cta);
    article.dataset.index = String(cardIndex);

    return article;
  };

  const initListing = async () => {
    if (!ui.listingGrid || !ui.listingLoading || !ui.listingFallback) return;

    ui.listingLoading.hidden = false;
    ui.listingLoading.textContent = "Memuatkan listing...";
    ui.listingGrid.innerHTML = "";
    ui.listingFallback.hidden = true;

    try {
      const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal ambil data sheet");

      const csvText = await response.text();
      const rows = parseSheetRows(csvText);

      const listings = rows
        .map((r) => ({
          title: r.title,
          description: r.description,
          location: r.location,
          price: r.price,
          status: r.status,
          image_url: r.image_url,
          whatsapp_text: r.whatsapp_text
        }))
        .map((r) => ({ ...r, images: parseImages(r.image_url) }))
        .filter((r) => String(r.title || "").trim() && r.images.length > 0);

      if (!listings.length) {
        ui.listingLoading.hidden = true;
        ui.listingFallback.hidden = false;
        return;
      }

      listings.forEach((listing, idx) => {
        ui.listingGrid.appendChild(createListingCard(listing, idx));
      });

      ui.listingLoading.hidden = true;
      ui.listingFallback.hidden = true;
    } catch (_err) {
      ui.listingLoading.textContent = "Listing belum tersedia. Klik butang di bawah untuk semak rumah terkini.";
      ui.listingFallback.hidden = false;
    }
  };

  initMenu();
  initFaq();
  initPopup();
  initSmoothAnchors();
  initReveal();
  initLightbox();
  initListing();
})();
