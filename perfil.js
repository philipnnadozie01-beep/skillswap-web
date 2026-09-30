import { auth, onAuthStateChanged, db, doc, getDoc } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("profile-content");
  if (!contenedor) return;

  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
      contenedor.innerHTML = `
        <h2>Necesitas iniciar sesión</h2>
        <p>Crea una cuenta o inicia sesión para ver y editar tu perfil.</p>
        <a href="cuenta.html" class="hero-button-dark">Iniciar sesión</a>
      `;
      return;
    }

    const perfilRef = doc(db, "perfiles", usuario.uid);
    const perfilSnap = await getDoc(perfilRef);

    if (!perfilSnap.exists()) {
      contenedor.innerHTML = `<p>No se encontró tu perfil.</p>`;
      return;
    }

    const datos = perfilSnap.data();

    const ofrezcoHtml = (datos.habilidadesOfrezco || []).map(h => `<div class="card">${h}</div>`).join("") || "<p class='empty-msg'>Aún no has añadido habilidades.</p>";
    const buscoHtml = (datos.habilidadesBusco || []).map(h => `<div class="card">${h}</div>`).join("") || "<p class='empty-msg'>Aún no has añadido habilidades.</p>";

    contenedor.innerHTML = `
      <div class="profile-avatar-placeholder">${datos.nombre.charAt(0).toUpperCase()}</div>
      <h2>${datos.nombre}</h2>
      <p class="profile-bio">${datos.bio || "Todavía no has escrito una biografía."}</p>

      <div class="profile-skills">
        <div class="profile-column">
          <h3>Habilidades que ofrezco</h3>
          <div class="cards-container">${ofrezcoHtml}</div>
        </div>
        <div class="profile-column">
          <h3>Habilidades que busco aprender</h3>
          <div class="cards-container">${buscoHtml}</div>
        </div>
      </div>

      <a href="editar-perfil.html" class="mentor-button" style="margin-top: 25px;">Editar mi perfil</a>
    `;
  });
});