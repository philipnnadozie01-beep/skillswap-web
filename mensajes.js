import { auth, onAuthStateChanged, db, doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot, writeBatch, serverTimestamp } from "./firebase-config.js";
import { esc, avatarMiniHtml } from "./utils.js";

const params = new URLSearchParams(window.location.search);
const otroUid = params.get("con");

function idConversacion(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function formatearFecha(ts) {
  if (!ts || typeof ts.toDate !== "function") return "";
  const fecha = ts.toDate();
  if (fecha.toDateString() === new Date().toDateString()) {
    return fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function milis(ts) {
  return ts && typeof ts.toMillis === "function" ? ts.toMillis() : Date.now();
}

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("chat-content");
  if (!contenedor) return;

  onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
      contenedor.innerHTML = `
        <h2>Necesitas iniciar sesión</h2>
        <a href="cuenta.html" class="hero-button-dark">Iniciar sesión</a>
      `;
      return;
    }

    if (otroUid) {
      mostrarChat(contenedor, usuario);
    } else {
      mostrarBandeja(contenedor, usuario);
    }
  });
});

function mostrarBandeja(contenedor, usuario) {
  contenedor.innerHTML = `
    <h2>Mis mensajes</h2>
    <div id="inbox-list" class="inbox-list"><p class="empty-msg">Cargando...</p></div>
    <p class="inbox-hint">Para empezar una conversación, entra al perfil de otra persona (desde "Explorar") y pulsa "Enviar mensaje".</p>
  `;

  const perfiles = {};
  async function perfilDe(uid) {
    if (!(uid in perfiles)) {
      try {
        const snap = await getDoc(doc(db, "perfiles", uid));
        perfiles[uid] = snap.exists()
          ? { nombre: snap.data().nombre || "Usuario", foto: snap.data().foto || "" }
          : { nombre: "Usuario", foto: "" };
      } catch (error) {
        perfiles[uid] = { nombre: "Usuario", foto: "" };
      }
    }
    return perfiles[uid];
  }

  let version = 0;
  const q = query(collection(db, "conversaciones"), where("participantes", "array-contains", usuario.uid));

  onSnapshot(q, async (snapshot) => {
    const miVersion = ++version;
    const lista = document.getElementById("inbox-list");
    if (!lista) return;

    if (snapshot.empty) {
      lista.innerHTML = `<p class="empty-msg">Todavía no tienes conversaciones.</p>`;
      return;
    }

    const conversaciones = snapshot.docs.map((d) => d.data());
    conversaciones.sort((a, b) => milis(b.ultimaFecha) - milis(a.ultimaFecha));

    const items = await Promise.all(conversaciones.map(async (c) => {
      const otro = c.participantes.find((p) => p !== usuario.uid);
      const perfil = await perfilDe(otro);
      const sinLeer = c.noLeidoPara === usuario.uid;
      const prefijo = c.ultimoDe === usuario.uid ? "Tú: " : "";
      return `
        <a class="inbox-item ${sinLeer ? "unread" : ""}" href="mensajes.html?con=${esc(encodeURIComponent(otro))}">
          ${avatarMiniHtml(perfil.nombre, perfil.foto)}
          <div class="inbox-body">
            <div class="inbox-top">
              <strong>${esc(perfil.nombre)}</strong>
              <span class="inbox-date">${esc(formatearFecha(c.ultimaFecha))}</span>
            </div>
            <div class="inbox-last">${esc(prefijo + (c.ultimoTexto || ""))}</div>
          </div>
          ${sinLeer ? '<span class="inbox-dot" aria-label="Mensaje nuevo"></span>' : ""}
        </a>
      `;
    }));

    if (miVersion !== version) return;
    lista.innerHTML = items.join("");
  }, (error) => {
    console.error(error);
    const lista = document.getElementById("inbox-list");
    if (lista) lista.innerHTML = `<p class="empty-msg">No se pudieron cargar tus mensajes.</p>`;
  });
}

async function mostrarChat(contenedor, usuario) {
  if (otroUid === usuario.uid) {
    contenedor.innerHTML = `
      <p>No puedes escribirte a ti mismo.</p>
      <a href="mensajes.html" class="chat-back">← Mis mensajes</a>
    `;
    return;
  }

  const otroSnap = await getDoc(doc(db, "perfiles", otroUid));
  if (!otroSnap.exists()) {
    contenedor.innerHTML = `
      <p>No hemos encontrado a esa persona.</p>
      <a href="mensajes.html" class="chat-back">← Mis mensajes</a>
    `;
    return;
  }
  const nombreOtro = otroSnap.data().nombre || "Usuario";

  contenedor.innerHTML = `
    <a href="mensajes.html" class="chat-back">← Mis mensajes</a>
    <h2>Conversación con ${esc(nombreOtro)}</h2>
    <div id="messages-list" class="messages-list"></div>
    <div class="message-input-row">
      <input type="text" id="message-input" maxlength="1000" placeholder="Escribe un mensaje...">
      <button id="send-btn">Enviar</button>
    </div>
    <p id="chat-error" class="auth-error"></p>
  `;

  const convId = idConversacion(usuario.uid, otroUid);
  const convRef = doc(db, "conversaciones", convId);
  const mensajesRef = collection(db, "conversaciones", convId, "mensajes");

  onSnapshot(convRef, (snap) => {
    if (snap.exists() && snap.data().noLeidoPara === usuario.uid) {
      updateDoc(convRef, { noLeidoPara: null }).catch((e) => console.error(e));
    }
  }, (error) => console.error(error));

  onSnapshot(query(mensajesRef, orderBy("fecha", "asc")), (snapshot) => {
    const lista = document.getElementById("messages-list");
    if (!lista) return;
    lista.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const burbuja = document.createElement("div");
      burbuja.className = msg.de === usuario.uid ? "message-bubble mine" : "message-bubble theirs";
      burbuja.textContent = msg.texto;
      lista.appendChild(burbuja);
    });
    lista.scrollTop = lista.scrollHeight;
  }, (error) => console.error(error));

  const inputMsg = document.getElementById("message-input");
  const botonEnviar = document.getElementById("send-btn");
  const errorBox = document.getElementById("chat-error");

  async function enviarMensaje() {
    const texto = inputMsg.value.trim();
    if (texto === "") return;

    botonEnviar.disabled = true;
    errorBox.textContent = "";

    try {
      const batch = writeBatch(db);
      batch.set(doc(mensajesRef), {
        de: usuario.uid,
        texto: texto,
        fecha: serverTimestamp()
      });
      batch.set(convRef, {
        participantes: [usuario.uid, otroUid].sort(),
        ultimoTexto: texto.slice(0, 100),
        ultimoDe: usuario.uid,
        ultimaFecha: serverTimestamp(),
        noLeidoPara: otroUid
      }, { merge: true });
      await batch.commit();
      inputMsg.value = "";
    } catch (error) {
      errorBox.textContent = "No se pudo enviar el mensaje. Inténtalo de nuevo.";
      console.error(error);
    }

    botonEnviar.disabled = false;
    inputMsg.focus();
  }

  botonEnviar.addEventListener("click", enviarMensaje);
  inputMsg.addEventListener("keydown", (e) => {
    if (e.key === "Enter") enviarMensaje();
  });
}