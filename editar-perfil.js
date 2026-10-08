import { auth, onAuthStateChanged, db, doc, getDoc, updateDoc } from "./firebase-config.js";
import { esc } from "./utils.js";

let habilidadesOfrezco = [];
let habilidadesBusco = [];
let usuarioActual = null;

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("edit-content");

  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
      contenedor.innerHTML = `
        <h2>Necesitas iniciar sesión</h2>
        <a href="cuenta.html" class="hero-button-dark">Iniciar sesión</a>
      `;
      return;
    }

    usuarioActual = usuario;
    const perfilRef = doc(db, "perfiles", usuario.uid);
    const perfilSnap = await getDoc(perfilRef);
    const datos = perfilSnap.data();

    habilidadesOfrezco = datos.habilidadesOfrezco || [];
    habilidadesBusco = datos.habilidadesBusco || [];

    contenedor.innerHTML = `
      <h2>Editar mi perfil</h2>

      <label for="bio-input">Biografía</label>
      <textarea id="bio-input" rows="3" class="edit-textarea">${esc(datos.bio)}</textarea>

      <div class="edit-skills-block">
        <label>Habilidades que ofrezco</label>
        <div id="ofrezco-list" class="skill-tags"></div>
        <div class="skill-add-row">
          <input type="text" id="ofrezco-input" placeholder="Ej: Guitarra">
          <button type="button" id="ofrezco-add">Añadir</button>
        </div>
      </div>

      <div class="edit-skills-block">
        <label>Habilidades que busco aprender</label>
        <div id="busco-list" class="skill-tags"></div>
        <div class="skill-add-row">
          <input type="text" id="busco-input" placeholder="Ej: Programación">
          <button type="button" id="busco-add">Añadir</button>
        </div>
      </div>

      <button id="save-btn" class="mentor-button" style="margin-top: 20px;">Guardar cambios</button>
      <p id="save-msg" class="auth-error"></p>
    `;

    renderizarListas();

    document.getElementById("ofrezco-add").addEventListener("click", () => {
      agregarHabilidad("ofrezco");
    });
    document.getElementById("busco-add").addEventListener("click", () => {
      agregarHabilidad("busco");
    });
    document.getElementById("save-btn").addEventListener("click", guardarPerfil);
  });
});

function renderizarListas() {
  const ofrezcoList = document.getElementById("ofrezco-list");
  const buscoList = document.getElementById("busco-list");

  ofrezcoList.innerHTML = habilidadesOfrezco.map((h, i) =>
    `<span class="skill-tag">${esc(h)} <button type="button" data-tipo="ofrezco" data-index="${i}" class="tag-remove">✕</button></span>`
  ).join("");

  buscoList.innerHTML = habilidadesBusco.map((h, i) =>
    `<span class="skill-tag">${esc(h)} <button type="button" data-tipo="busco" data-index="${i}" class="tag-remove">✕</button></span>`
  ).join("");

  document.querySelectorAll(".tag-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tipo = btn.getAttribute("data-tipo");
      const index = parseInt(btn.getAttribute("data-index"));
      if (tipo === "ofrezco") {
        habilidadesOfrezco.splice(index, 1);
      } else {
        habilidadesBusco.splice(index, 1);
      }
      renderizarListas();
    });
  });
}

function agregarHabilidad(tipo) {
  const input = document.getElementById(tipo + "-input");
  const valor = input.value.trim();
  if (valor === "") return;

  if (tipo === "ofrezco") {
    habilidadesOfrezco.push(valor);
  } else {
    habilidadesBusco.push(valor);
  }
  input.value = "";
  renderizarListas();
}

async function guardarPerfil() {
  const bio = document.getElementById("bio-input").value.trim();
  const mensaje = document.getElementById("save-msg");

  try {
    await updateDoc(doc(db, "perfiles", usuarioActual.uid), {
      bio: bio,
      habilidadesOfrezco: habilidadesOfrezco,
      habilidadesBusco: habilidadesBusco
    });
    mensaje.style.color = "#27ae60";
    mensaje.textContent = "Perfil guardado correctamente ✅";
    setTimeout(() => {
      window.location.href = "perfil.html";
    }, 1000);
  } catch (error) {
    mensaje.style.color = "#e74c3c";
    mensaje.textContent = "Error al guardar. Inténtalo de nuevo.";
    console.error(error);
  }
}