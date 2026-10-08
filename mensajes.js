import { auth, onAuthStateChanged, db, doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "./firebase-config.js";
import { esc } from "./utils.js";

const params = new URLSearchParams(window.location.search);
const otroUid = params.get("con");

function idConversacion(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("chat-content");

  if (!otroUid) {
    contenedor.innerHTML = `<p>No se especificó con quién chatear.</p>`;
    return;
  }

  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
      contenedor.innerHTML = `
        <h2>Necesitas iniciar sesión</h2>
        <a href="cuenta.html" class="hero-button-dark">Iniciar sesión</a>
      `;
      return;
    }

    const otroSnap = await getDoc(doc(db, "perfiles", otroUid));
    const nombreOtro = otroSnap.exists() ? otroSnap.data().nombre : "Usuario";

    contenedor.innerHTML = `
      <h2>Conversación con ${esc(nombreOtro)}</h2>
      <div id="messages-list" class="messages-list"></div>
      <div class="message-input-row">
        <input type="text" id="message-input" placeholder="Escribe un mensaje...">
        <button id="send-btn">Enviar</button>
      </div>
    `;

    const convId = idConversacion(usuario.uid, otroUid);
    const mensajesRef = collection(db, "conversaciones", convId, "mensajes");
    const q = query(mensajesRef, orderBy("fecha", "asc"));

    onSnapshot(q, (snapshot) => {
      const lista = document.getElementById("messages-list");
      lista.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        const esMio = msg.de === usuario.uid;
        const burbuja = document.createElement("div");
        burbuja.className = esMio ? "message-bubble mine" : "message-bubble theirs";
        burbuja.textContent = msg.texto;
        lista.appendChild(burbuja);
      });
      lista.scrollTop = lista.scrollHeight;
    });

    const inputMsg = document.getElementById("message-input");
    const botonEnviar = document.getElementById("send-btn");

    async function enviarMensaje() {
      const texto = inputMsg.value.trim();
      if (texto === "") return;

      await addDoc(mensajesRef, {
        de: usuario.uid,
        texto: texto,
        fecha: serverTimestamp()
      });
      inputMsg.value = "";
    }

    botonEnviar.addEventListener("click", enviarMensaje);
    inputMsg.addEventListener("keypress", (e) => {
      if (e.key === "Enter") enviarMensaje();
    });
  });
});