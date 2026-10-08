import { auth, onAuthStateChanged, signOut } from "./firebase-config.js";
import { esc } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("auth-status");
  if (!contenedor) return;

  onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
      contenedor.innerHTML = `
        <span class="auth-user">${esc(usuario.email)}</span>
        <button id="logout-btn" class="auth-logout">Cerrar sesión</button>
      `;
      document.getElementById("logout-btn").addEventListener("click", () => {
        signOut(auth).then(() => {
          window.location.href = "index.html";
        });
      });
    } else {
      contenedor.innerHTML = `<a href="cuenta.html" class="auth-login-link">Iniciar sesión</a>`;
    }
  });
});