import { auth, onAuthStateChanged, signOut, db, collection, query, where, onSnapshot } from "./firebase-config.js";
import { esc } from "./utils.js";

let cancelarEscucha = null;

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("auth-status");
  if (!contenedor) return;

  onAuthStateChanged(auth, (usuario) => {
    if (cancelarEscucha) {
      cancelarEscucha();
      cancelarEscucha = null;
    }

    if (usuario) {
      contenedor.innerHTML = `
        <a href="mensajes.html" class="auth-messages">✉️ Mensajes <span class="messages-badge" id="messages-badge" style="display: none;">0</span></a>
        <span class="auth-user">${esc(usuario.email)}</span>
        <button id="logout-btn" class="auth-logout">Cerrar sesión</button>
      `;

      document.getElementById("logout-btn").addEventListener("click", () => {
        signOut(auth).then(() => {
          window.location.href = "index.html";
        });
      });

      const q = query(collection(db, "conversaciones"), where("participantes", "array-contains", usuario.uid));
      cancelarEscucha = onSnapshot(q, (snapshot) => {
        let sinLeer = 0;
        snapshot.forEach((d) => {
          if (d.data().noLeidoPara === usuario.uid) sinLeer++;
        });
        const badge = document.getElementById("messages-badge");
        if (!badge) return;
        badge.textContent = sinLeer;
        badge.style.display = sinLeer > 0 ? "inline-block" : "none";
      }, (error) => {
        console.error(error);
      });
    } else {
      contenedor.innerHTML = `<a href="cuenta.html" class="auth-login-link">Iniciar sesión</a>`;
    }
  });
});