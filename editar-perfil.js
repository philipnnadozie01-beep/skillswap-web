import { auth, onAuthStateChanged, db, doc, getDoc, updateDoc, deleteField } from "./firebase-config.js";
import { esc, avatarHtml } from "./utils.js";

let habilidadesOfrezco = [];
let habilidadesBusco = [];
let usuarioActual = null;
let nombrePerfil = "";
let fotoActual = "";
let fotoNueva = null;
let quitarFoto = false;

function procesarImagen(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo.type.startsWith("image/") || archivo.size > 15 * 1024 * 1024) {
      reject(new Error("archivo no válido"));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("no se pudo leer"));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("no se pudo abrir la imagen"));
      img.onload = () => {
        const LADO = 256;
        const canvas = document.createElement("canvas");
        canvas.width = LADO;
        canvas.height = LADO;
        const ctx = canvas.getContext("2d");
        const lado = Math.min(img.width, img.height);
        const sx = (img.width - lado) / 2;
        const sy = (img.height - lado) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, LADO, LADO);
        ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO);

        let calidad = 0.8;
        let dataUrl = canvas.toDataURL("image/jpeg", calidad);
        while (dataUrl.length > 50000 && calidad > 0.3) {
          calidad -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", calidad);
        }
        resolve(dataUrl);
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

function actualizarPreview() {
  const preview = document.getElementById("photo-preview");
  const fotoMostrada = quitarFoto ? "" : (fotoNueva || fotoActual);
  preview.innerHTML = avatarHtml(nombrePerfil, fotoMostrada);
  document.getElementById("photo-remove").style.display = fotoMostrada ? "inline-block" : "none";
}

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
    nombrePerfil = datos.nombre || "";
    fotoActual = datos.foto || "";
    fotoNueva = null;
    quitarFoto = false;

    contenedor.innerHTML = `
      <h2>Editar mi perfil</h2>

      <label>Foto de perfil</label>
      <div class="photo-edit-row">
        <div id="photo-preview"></div>
        <div class="photo-edit-actions">
          <input type="file" id="photo-input" accept="image/*" style="display:none">
          <button type="button" id="photo-pick" class="photo-pick-btn">Elegir foto</button>
          <button type="button" id="photo-remove" class="photo-remove-btn">Quitar foto</button>
          <p class="photo-hint">Tu foto será pública: la verá cualquier visitante de Skillswap. Mejor una foto tuya con la cara visible, para generar confianza.</p>
          <p id="photo-msg" class="auth-error"></p>
        </div>
      </div>

      <label for="bio-input">Biografía</label>
      <textarea id="bio-input" rows="3" maxlength="500" class="edit-textarea">${esc(datos.bio)}</textarea>

      <div class="edit-skills-block">
        <label>Habilidades que ofrezco</label>
        <div id="ofrezco-list" class="skill-tags"></div>
        <div class="skill-add-row">
          <input type="text" id="ofrezco-input" maxlength="40" placeholder="Ej: Guitarra">
          <button type="button" id="ofrezco-add">Añadir</button>
        </div>
      </div>

      <div class="edit-skills-block">
        <label>Habilidades que busco aprender</label>
        <div id="busco-list" class="skill-tags"></div>
        <div class="skill-add-row">
          <input type="text" id="busco-input" maxlength="40" placeholder="Ej: Programación">
          <button type="button" id="busco-add">Añadir</button>
        </div>
      </div>

      <button id="save-btn" class="mentor-button" style="margin-top: 20px;">Guardar cambios</button>
      <p id="save-msg" class="auth-error"></p>
    `;

    renderizarListas();
    actualizarPreview();

    document.getElementById("photo-pick").addEventListener("click", () => {
      document.getElementById("photo-input").click();
    });

    document.getElementById("photo-input").addEventListener("change", async (e) => {
      const archivo = e.target.files[0];
      const msgFoto = document.getElementById("photo-msg");
      msgFoto.textContent = "";
      if (!archivo) return;
      try {
        fotoNueva = await procesarImagen(archivo);
        quitarFoto = false;
        actualizarPreview();
      } catch (err) {
        msgFoto.textContent = "No se pudo usar esa imagen. Prueba con una foto JPG o PNG.";
        console.error(err);
      }
      e.target.value = "";
    });

    document.getElementById("photo-remove").addEventListener("click", () => {
      fotoNueva = null;
      quitarFoto = true;
      actualizarPreview();
    });

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

  const cambios = {
    bio: bio,
    habilidadesOfrezco: habilidadesOfrezco,
    habilidadesBusco: habilidadesBusco
  };
  if (fotoNueva) {
    cambios.foto = fotoNueva;
  } else if (quitarFoto) {
    cambios.foto = deleteField();
  }

  try {
    await updateDoc(doc(db, "perfiles", usuarioActual.uid), cambios);
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