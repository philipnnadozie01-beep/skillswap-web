import { auth, onAuthStateChanged, db, doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "./firebase-config.js";

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
    const creditos = typeof datos.creditos === "number" ? datos.creditos : 0;

    const ofrezcoHtml = (datos.habilidadesOfrezco || []).map(h => `<div class="card">${h}</div>`).join("") || "<p class='empty-msg'>Aún no has añadido habilidades.</p>";
    const buscoHtml = (datos.habilidadesBusco || []).map(h => `<div class="card">${h}</div>`).join("") || "<p class='empty-msg'>Aún no has añadido habilidades.</p>";

    contenedor.innerHTML = `
      <div class="profile-avatar-placeholder">${datos.nombre.charAt(0).toUpperCase()}</div>
      <h2>${datos.nombre}</h2>
      <div class="credits-badge">💰 ${creditos} créditos</div>
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

      <div id="pending-sessions" style="margin-top: 35px; text-align:left;"></div>
    `;

    cargarSesionesPendientes(usuario.uid);
  });
});

async function cargarSesionesPendientes(miUid) {
  const contenedor = document.getElementById("pending-sessions");
  const q = query(collection(db, "sesiones"), where("otroId", "==", miUid), where("estado", "==", "pendiente"));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    contenedor.innerHTML = "";
    return;
  }

  let html = "<h3>Sesiones pendientes de confirmar</h3>";
  const sesiones = [];
  snapshot.forEach((docSnap) => {
    sesiones.push({ id: docSnap.id, ...docSnap.data() });
  });

  for (const ses of sesiones) {
    const creadorSnap = await getDoc(doc(db, "perfiles", ses.creadorId));
    const nombreCreador = creadorSnap.exists() ? creadorSnap.data().nombre : "Alguien";
    const descripcion = ses.rolCreador === "ensene"
      ? `${nombreCreador} dice que te enseñó durante ${ses.horas}h`
      : `${nombreCreador} dice que aprendió de ti durante ${ses.horas}h`;

    html += `
      <div class="session-pending-card" data-id="${ses.id}">
        <p>${descripcion}</p>
        <button class="confirm-session mentor-button">Confirmar</button>
        <button class="reject-session hero-button-dark">Rechazar</button>
      </div>
    `;
  }

  contenedor.innerHTML = html;

  document.querySelectorAll(".confirm-session").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".session-pending-card");
      confirmarSesion(card.getAttribute("data-id"), miUid);
    });
  });

  document.querySelectorAll(".reject-session").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".session-pending-card");
      rechazarSesion(card.getAttribute("data-id"));
    });
  });
}

async function confirmarSesion(sesionId, miUid) {
  const sesionRef = doc(db, "sesiones", sesionId);
  const sesionSnap = await getDoc(sesionRef);
  const ses = sesionSnap.data();

  const CREDITOS_POR_HORA = 10;
  const montoCreditos = Math.round(ses.horas * CREDITOS_POR_HORA);

  const creadorRef = doc(db, "perfiles", ses.creadorId);
  const otroRef = doc(db, "perfiles", ses.otroId);
  const creadorSnap = await getDoc(creadorRef);
  const otroSnap = await getDoc(otroRef);

  const creditosCreadorActual = creadorSnap.data().creditos || 0;
  const creditosOtroActual = otroSnap.data().creditos || 0;

  if (ses.rolCreador === "ensene") {
    await updateDoc(creadorRef, { creditos: creditosCreadorActual + montoCreditos });
    await updateDoc(otroRef, { creditos: Math.max(0, creditosOtroActual - montoCreditos) });
  } else {
    await updateDoc(otroRef, { creditos: creditosOtroActual + montoCreditos });
    await updateDoc(creadorRef, { creditos: Math.max(0, creditosCreadorActual - montoCreditos) });
  }

  await addDoc(collection(db, "transacciones"), {
    usuarioId: ses.creadorId,
    tipo: ses.rolCreador === "ensene" ? "enseñanza" : "aprendizaje",
    cantidad: ses.rolCreador === "ensene" ? montoCreditos : -montoCreditos,
    descripcion: "Sesión confirmada de " + ses.horas + "h",
    fecha: serverTimestamp()
  });

  await addDoc(collection(db, "transacciones"), {
    usuarioId: ses.otroId,
    tipo: ses.rolCreador === "ensene" ? "aprendizaje" : "enseñanza",
    cantidad: ses.rolCreador === "ensene" ? -montoCreditos : montoCreditos,
    descripcion: "Sesión confirmada de " + ses.horas + "h",
    fecha: serverTimestamp()
  });

  await updateDoc(sesionRef, { estado: "confirmada" });

  window.location.reload();
}

async function rechazarSesion(sesionId) {
  const sesionRef = doc(db, "sesiones", sesionId);
  await updateDoc(sesionRef, { estado: "rechazada" });
  window.location.reload();
}