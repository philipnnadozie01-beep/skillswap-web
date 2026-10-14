import { db, doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp } from "./firebase-config.js";
import { esc } from "./utils.js";

function millis(ts) {
  return ts && typeof ts.toMillis === "function" ? ts.toMillis() : Date.now();
}

export function estrellasHtml(valor) {
  const llenas = Math.max(0, Math.min(5, Math.round(Number(valor) || 0)));
  return `<span class="stars" aria-label="${llenas} de 5 estrellas">${"★".repeat(llenas)}<span class="stars-empty">${"★".repeat(5 - llenas)}</span></span>`;
}

export function resumenResenasHtml(media, total) {
  if (!total) {
    return `<p class="reviews-summary reviews-summary-empty">Todavía sin reseñas</p>`;
  }
  const mediaTxt = media.toFixed(1).replace(".", ",");
  return `<p class="reviews-summary">${estrellasHtml(media)} <strong>${mediaTxt}</strong> · ${total} ${total === 1 ? "reseña" : "reseñas"}</p>`;
}

export async function cargarResenas(profesorId) {
  const snap = await getDocs(query(collection(db, "resenas"), where("profesorId", "==", profesorId)));
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => millis(b.fecha) - millis(a.fecha));
  const total = lista.length;
  const media = total ? lista.reduce((suma, r) => suma + (Number(r.estrellas) || 0), 0) / total : 0;
  return { lista, total, media };
}

export async function nombresDeAutores(lista) {
  const nombres = {};
  const ids = [...new Set(lista.map((r) => r.autorId))];
  await Promise.all(ids.map(async (id) => {
    try {
      const snap = await getDoc(doc(db, "perfiles", id));
      nombres[id] = snap.exists() ? (snap.data().nombre || "Usuario") : "Usuario";
    } catch (error) {
      nombres[id] = "Usuario";
    }
  }));
  return nombres;
}

export function listaResenasHtml(lista, nombres) {
  return lista.map((r) => {
    const fecha = r.fecha && typeof r.fecha.toDate === "function"
      ? r.fecha.toDate().toLocaleDateString("es-ES", { month: "long", year: "numeric" })
      : "";
    return `
      <div class="review-card">
        <div class="review-top">
          <strong>${esc(nombres[r.autorId] || "Usuario")}</strong>
          <span class="review-date">${esc(fecha)}</span>
        </div>
        ${estrellasHtml(r.estrellas)}
        <p class="review-text">${esc(r.texto)}</p>
      </div>
    `;
  }).join("");
}

export async function sesionesPorValorar(miUid) {
  const [comoCreador, comoOtro] = await Promise.all([
    getDocs(query(collection(db, "sesiones"), where("creadorId", "==", miUid), where("estado", "==", "confirmada"))),
    getDocs(query(collection(db, "sesiones"), where("otroId", "==", miUid), where("estado", "==", "confirmada")))
  ]);

  const candidatas = [];
  comoCreador.forEach((d) => {
    const s = d.data();
    if (s.rolCreador === "aprendi") candidatas.push({ sesionId: d.id, profesorId: s.otroId, horas: s.horas });
  });
  comoOtro.forEach((d) => {
    const s = d.data();
    if (s.rolCreador === "ensene") candidatas.push({ sesionId: d.id, profesorId: s.creadorId, horas: s.horas });
  });

  const pendientes = [];
  for (const c of candidatas) {
    try {
      const existente = await getDoc(doc(db, "resenas", c.sesionId));
      if (!existente.exists()) pendientes.push(c);
    } catch (error) {
      console.error(error);
    }
  }
  return pendientes;
}

export function formularioResenaHtml(nombreProfesor, horas) {
  const estrellas = [5, 4, 3, 2, 1].map((n) =>
    `<input type="radio" id="rv-star${n}" name="rv-estrellas" value="${n}"><label for="rv-star${n}" title="${n} ${n === 1 ? "estrella" : "estrellas"}">★</label>`
  ).join("");

  return `
    <div class="review-form">
      <h3>Cuéntanos cómo fue tu sesión con ${esc(nombreProfesor)}</h3>
      <p class="review-form-hint">Sesión de ${esc(horas)}h · Tu reseña será pública y llevará tu nombre.</p>
      <div class="star-input" role="radiogroup" aria-label="Valoración">${estrellas}</div>
      <textarea id="rv-texto" rows="4" maxlength="600" placeholder="¿Qué aprendiste? ¿Cómo fue la experiencia? (mínimo 10 caracteres)"></textarea>
      <button type="button" id="rv-enviar" class="mentor-button">Publicar reseña</button>
      <p id="rv-msg" class="auth-error"></p>
    </div>
  `;
}

export function activarFormularioResena(sesion, miUid, alTerminar) {
  const boton = document.getElementById("rv-enviar");
  const msg = document.getElementById("rv-msg");
  if (!boton) return;

  boton.addEventListener("click", async () => {
    msg.style.color = "";
    msg.textContent = "";

    const marcada = document.querySelector('input[name="rv-estrellas"]:checked');
    const texto = document.getElementById("rv-texto").value.trim();

    if (!marcada) {
      msg.textContent = "Elige una puntuación de 1 a 5 estrellas.";
      return;
    }
    if (texto.length < 10) {
      msg.textContent = "Escribe al menos 10 caracteres sobre tu experiencia.";
      return;
    }

    boton.disabled = true;
    try {
      await setDoc(doc(db, "resenas", sesion.sesionId), {
        profesorId: sesion.profesorId,
        autorId: miUid,
        sesionId: sesion.sesionId,
        estrellas: parseInt(marcada.value, 10),
        texto: texto,
        fecha: serverTimestamp()
      });
      msg.style.color = "#27ae60";
      msg.textContent = "✅ ¡Gracias! Tu reseña ya es pública.";
      setTimeout(alTerminar, 900);
    } catch (error) {
      msg.textContent = "No se pudo publicar la reseña. Inténtalo de nuevo.";
      boton.disabled = false;
      console.error(error);
    }
  });
}