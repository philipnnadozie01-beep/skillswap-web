import { auth, onAuthStateChanged, db, doc, getDoc, addDoc, collection, serverTimestamp } from "./firebase-config.js";
import { esc } from "./utils.js";

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

    const ofrezcoHtml = (datos.habilidadesOfrezco || []).map(h => `<div class="card">${esc(h)}</div>`).join("") || "<p class='empty-msg'>Sin habilidades añadidas.</p>";
    const buscoHtml = (datos.habilidadesBusco || []).map(h => `<div class="card">${esc(h)}</div>`).join("") || "<p class='empty-msg'>Sin habilidades añadidas.</p>";

    let accionesHtml = "";
    if (usuarioActual) {
      accionesHtml = `
        <button id="contact-btn" class="mentor-button" style="margin-top: 25px;">Enviar mensaje</button>
        <button id="session-btn" class="hero-button-dark" style="margin-top: 10px;">Registrar sesión con esta persona</button>
        <div id="session-form" style="display:none; margin-top:20px; text-align:left; max-width:350px; margin-left:auto; margin-right:auto;"></div>
      `;
    } else {
      accionesHtml = `<p style="margin-top: 20px;">Debes <a href="cuenta.html">iniciar sesión</a> para contactar o registrar una sesión.</p>`;
    }

    contenedor.innerHTML = `
      <div class="profile-avatar-placeholder">${esc(String(datos.nombre).charAt(0).toUpperCase())}</div>
      <h2>${esc(datos.nombre)}</h2>
      <p class="profile-bio">${esc(datos.bio) || "Esta persona todavía no ha escrito una biografía."}</p>

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

      ${accionesHtml}
    `;

    const btnMsg = document.getElementById("contact-btn");
    if (btnMsg) {
      btnMsg.addEventListener("click", () => {
        window.location.href = "mensajes.html?con=" + uidPerfil;
      });
    }

    const btnSesion = document.getElementById("session-btn");
    const formSesion = document.getElementById("session-form");
    if (btnSesion) {
      btnSesion.addEventListener("click", () => {
        formSesion.style.display = formSesion.style.display === "none" ? "block" : "none";
        formSesion.innerHTML = `
          <label>¿Qué hiciste?</label>
          <select id="rol-select" style="width:100%; padding:10px; margin:8px 0; border-radius:6px; border:1px solid #ccc;">
            <option value="ensene">Yo enseñé</option>
            <option value="aprendi">Yo aprendí</option>
          </select>
          <label>¿Cuántas horas?</label>
          <input type="number" id="horas-input" min="0.5" max="10" step="0.5" value="1" style="width:100%; padding:10px; margin:8px 0; border-radius:6px; border:1px solid #ccc;">
          <button id="submit-session" class="mentor-button" style="width:100%;">Enviar registro</button>
          <p id="session-msg" class="auth-error"></p>
        `;

        document.getElementById("submit-session").addEventListener("click", async () => {
          const rol = document.getElementById("rol-select").value;
          const horas = parseFloat(document.getElementById("horas-input").value);
          const msg = document.getElementById("session-msg");

          if (!horas || horas <= 0 || horas > 10) {
            msg.textContent = "Introduce un número de horas entre 0,5 y 10.";
            return;
          }

          try {
            await addDoc(collection(db, "sesiones"), {
              creadorId: usuarioActual.uid,
              otroId: uidPerfil,
              rolCreador: rol,
              horas: horas,
              estado: "pendiente",
              fecha: serverTimestamp()
            });
            msg.style.color = "#27ae60";
            msg.textContent = "✅ Registro enviado. Quedará pendiente hasta que " + datos.nombre + " lo confirme.";
          } catch (error) {
            msg.textContent = "Error al enviar. Inténtalo de nuevo.";
            console.error(error);
          }
        });
      });
    }
  });
});