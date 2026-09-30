import { auth, onAuthStateChanged, db, doc, getDoc } from "./firebase-config.js";

const params = new URLSearchParams(window.location.search);
const uidPerfil = params.get("uid");

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("public-profile-content");
  if (!contenedor) return;

  if (!uidPerfil) {
    contenedor.innerHTML = `<p>No se especificó ningún perfil.</p>`;
    return;
  }

  onAuthStateChanged(auth, async (usuarioActual) => {
    const perfilRef = doc(db, "perfiles", uidPerfil);
    const perfilSnap = await getDoc(perfilRef);

    if (!perfilSnap.exists()) {
      contenedor.innerHTML = `<p>Este perfil no existe.</p>`;
      return;
    }

    const datos = perfilSnap.data();

    if (usuarioActual && usuarioActual.uid === uidPerfil) {
      window.location.href = "perfil.html";
      return;
    }

    const ofrezcoHtml = (datos.habilidadesOfrezco || []).map(h => `<div class="card">${h}</div>`).join("") || "<p class='empty-msg'>Sin habilidades añadidas.</p>";
    const buscoHtml = (datos.habilidadesBusco || []).map(h => `<div class="card">${h}</div>`).join("") || "<p class='empty-msg'>Sin habilidades añadidas.</p>";

    let botonContacto = "";
    if (usuarioActual) {
      botonContacto = `<button id="contact-btn" class="mentor-button" style="margin-top: 25px;">Enviar mensaje</button>`;
    } else {
      botonContacto = `<p style="margin-top: 20px;">Debes <a href="cuenta.html">iniciar sesión</a> para enviar un mensaje.</p>`;
    }

    contenedor.innerHTML = `
      <div class="profile-avatar-placeholder">${datos.nombre.charAt(0).toUpperCase()}</div>
      <h2>${datos.nombre}</h2>
      <p class="profile-bio">${datos.bio || "Esta persona todavía no ha escrito una biografía."}</p>

      <div class="profile-skills">
        <div class="profile-column">
          <h3>Habilidades que ofrece</h3>
          <div class="cards-container">${ofrezcoHtml}</div>
        </div>
        <div class="profile-column">
          <h3>Habilidades que busca aprender</h3>
          <div class="cards-container">${buscoHtml}</div>
        </div>
      </div>

      ${botonContacto}
    `;

    const btn = document.getElementById("contact-btn");
    if (btn) {
      btn.addEventListener("click", () => {
        window.location.href = "mensajes.html?con=" + uidPerfil;
      });
    }
  });
});