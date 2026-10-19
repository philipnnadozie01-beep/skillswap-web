import { auth, db, collection, getDocs } from "./firebase-config.js";
import { esc, avatarMiniHtml } from "./utils.js";
import { estrellasHtml } from "./resenas.js";

function clave(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function textoMedia(media) {
  return media.toFixed(1).replace(".", ",");
}

document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.getElementById("cards-container");
  const suggestCard = document.getElementById("suggest-card");
  if (!contenedor) return;

  const panel = document.createElement("div");
  panel.id = "skill-people";
  panel.className = "skill-people";
  panel.style.display = "none";
  contenedor.insertAdjacentElement("afterend", panel);

  function cerrarPanel() {
    panel.style.display = "none";
    panel.innerHTML = "";
    document.querySelectorAll(".card.selected").forEach((c) => c.classList.remove("selected"));
  }

  function abrirPanel(item, personas, tarjeta) {
    document.querySelectorAll(".card.selected").forEach((c) => c.classList.remove("selected"));
    tarjeta.classList.add("selected");

    const miUid = auth.currentUser ? auth.currentUser.uid : null;
    const ordenadas = [...personas].sort((a, b) =>
      (b.media - a.media) || (b.total - a.total) || a.nombre.localeCompare(b.nombre, "es")
    );

    const filas = ordenadas.map((p) => {
      const esYo = p.uid === miUid;
      const enlace = esYo ? "perfil.html" : "perfil-publico.html?uid=" + encodeURIComponent(p.uid);
      const valoracion = p.total
        ? `${estrellasHtml(p.media)} <strong>${textoMedia(p.media)}</strong> (${p.total})`
        : `<span class="person-norating">Sin reseñas todavía</span>`;
      const bioRecortada = p.bio.length > 110 ? p.bio.slice(0, 110) + "…" : p.bio;

      return `
        <a class="person-item" href="${enlace}">
          ${avatarMiniHtml(p.nombre, p.foto)}
          <div class="person-body">
            <div class="person-name"><strong>${esc(p.nombre)}</strong>${esYo ? ' <span class="person-me">(tú)</span>' : ""}</div>
            <div class="person-rating">${valoracion}</div>
            ${bioRecortada ? `<div class="person-bio">${esc(bioRecortada)}</div>` : ""}
          </div>
          <span class="person-arrow">→</span>
        </a>
      `;
    }).join("");

    const titulo = personas.length === 1 ? "1 persona ofrece" : personas.length + " personas ofrecen";

    panel.innerHTML = `
      <div class="skill-people-header">
        <h3>${titulo} «${esc(item.nombre)}»</h3>
        <button type="button" class="skill-people-close" aria-label="Cerrar">✕</button>
      </div>
      <div class="skill-people-list">${filas}</div>
    `;
    panel.style.display = "block";
    panel.querySelector(".skill-people-close").addEventListener("click", cerrarPanel);
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  try {
    const [perfilesSnap, resenasSnap] = await Promise.all([
      getDocs(collection(db, "perfiles")),
      getDocs(collection(db, "resenas")).catch(() => null)
    ]);

    const valoraciones = {};
    if (resenasSnap) {
      resenasSnap.forEach((d) => {
        const r = d.data();
        if (!valoraciones[r.profesorId]) valoraciones[r.profesorId] = { suma: 0, total: 0 };
        valoraciones[r.profesorId].suma += Number(r.estrellas) || 0;
        valoraciones[r.profesorId].total += 1;
      });
    }

    const mapa = {};
    perfilesSnap.forEach((docSnap) => {
      const datos = docSnap.data();
      const uid = docSnap.id;
      (datos.habilidadesOfrezco || []).forEach((h) => {
        const k = clave(h);
        if (!k) return;
        if (!mapa[k]) mapa[k] = { nombre: String(h).trim(), personas: new Map() };
        if (!mapa[k].personas.has(uid)) {
          const v = valoraciones[uid];
          mapa[k].personas.set(uid, {
            uid: uid,
            nombre: datos.nombre || "Usuario",
            foto: datos.foto || "",
            bio: String(datos.bio || ""),
            media: v ? v.suma / v.total : 0,
            total: v ? v.total : 0
          });
        }
      });
    });

    const habilidades = Object.values(mapa).sort((a, b) =>
      (b.personas.size - a.personas.size) || a.nombre.localeCompare(b.nombre, "es")
    );

    if (habilidades.length === 0) {
      const vacio = document.createElement("p");
      vacio.className = "empty-msg";
      vacio.textContent = "Todavía no hay habilidades añadidas por usuarios. ¡Sé el primero desde tu perfil!";
      contenedor.insertBefore(vacio, suggestCard);
      return;
    }

    habilidades.forEach((item) => {
      const personas = Array.from(item.personas.values());
      const tarjeta = document.createElement("div");
      tarjeta.className = "card";
      tarjeta.setAttribute("role", "button");
      tarjeta.tabIndex = 0;
      tarjeta.style.cursor = "pointer";
      tarjeta.innerHTML = `<span class="card-icon">✨</span>${esc(item.nombre)}` +
        (personas.length > 1 ? `<span class="card-count">${personas.length}</span>` : "");

      tarjeta.addEventListener("click", () => abrirPanel(item, personas, tarjeta));
      tarjeta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrirPanel(item, personas, tarjeta);
        }
      });

      contenedor.insertBefore(tarjeta, suggestCard);
    });
  } catch (error) {
    console.error("Error cargando habilidades:", error);
  }
});