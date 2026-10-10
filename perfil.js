import { auth, onAuthStateChanged, db, doc, getDoc, updateDoc, collection, query, where, getDocs, runTransaction, serverTimestamp } from "./firebase-config.js";
import { esc, avatarHtml } from "./utils.js";

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

    const ofrezcoHtml = (datos.habilidadesOfrezco || []).map(h => `<div class="card">${esc(h)}</div>`).join("") || "<p class='empty-msg'>Aún no has añadido habilidades.</p>";
    const buscoHtml = (datos.habilidadesBusco || []).map(h => `<div class="card">${esc(h)}</div>`).join("") || "<p class='empty-msg'>Aún no has añadido habilidades.</p>";

    contenedor.innerHTML = `
      ${avatarHtml(datos.nombre, datos.foto)}
      <h2>${esc(datos.nombre)}</h2>
      <div class="credits-badge">💰 ${creditos} créditos</div>
      <p class="profile-bio">${esc(datos.bio) || "Todavía no has escrito una biografía."}</p>

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
      ? `${esc(nombreCreador)} dice que te enseñó durante ${esc(ses.horas)}h`
      : `${esc(nombreCreador)} dice que aprendió de ti durante ${esc(ses.horas)}h`;

    html += `
      <div class="session-pending-card" data-id="${esc(ses.id)}">
        <p>${descripcion}</p>
        <button class="confirm-session mentor-button">Confirmar</button>
        <button class="reject-session hero-button-dark">Rechazar</button>
      </div>
    `;
  }

  contenedor.innerHTML = html;

  document.querySelectorAll(".confirm-session").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      btn.disabled = true;
      const card = e.target.closest(".session-pending-card");
      confirmarSesion(card.getAttribute("data-id"));
    });
  });

  document.querySelectorAll(".reject-session").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      btn.disabled = true;
      const card = e.target.closest(".session-pending-card");
      rechazarSesion(card.getAttribute("data-id"));
    });
  });
}

async function confirmarSesion(sesionId) {
  const sesionRef = doc(db, "sesiones", sesionId);
  const CREDITOS_POR_HORA = 10;

  try {
    await runTransaction(db, async (t) => {
      const sesionSnap = await t.get(sesionRef);
      if (!sesionSnap.exists()) throw new Error("NO_EXISTE");
      const ses = sesionSnap.data();

      if (ses.estado !== "pendiente") throw new Error("YA_RESUELTA");
      if (typeof ses.horas !== "number" || !(ses.horas >= 0.5) || ses.horas > 10) throw new Error("HORAS_INVALIDAS");

      const monto = Math.round(ses.horas * CREDITOS_POR_HORA);
      const creadorRef = doc(db, "perfiles", ses.creadorId);
      const otroRef = doc(db, "perfiles", ses.otroId);
      const creadorSnap = await t.get(creadorRef);
      const otroSnap = await t.get(otroRef);
      if (!creadorSnap.exists() || !otroSnap.exists()) throw new Error("PERFIL_NO_EXISTE");

      const creditosCreador = creadorSnap.data().creditos || 0;
      const creditosOtro = otroSnap.data().creditos || 0;

      const creadorEnseno = ses.rolCreador === "ensene";
      const profesorRef = creadorEnseno ? creadorRef : otroRef;
      const alumnoRef = creadorEnseno ? otroRef : creadorRef;
      const profesorId = creadorEnseno ? ses.creadorId : ses.otroId;
      const alumnoId = creadorEnseno ? ses.otroId : ses.creadorId;
      const creditosProfesor = creadorEnseno ? creditosCreador : creditosOtro;
      const creditosAlumno = creadorEnseno ? creditosOtro : creditosCreador;

      if (creditosAlumno < monto) {
        const err = new Error("SIN_CREDITOS");
        err.necesarios = monto;
        err.disponibles = creditosAlumno;
        err.alumnoSoyYo = (alumnoId === auth.currentUser.uid);
        throw err;
      }

      t.update(profesorRef, { creditos: creditosProfesor + monto });
      t.update(alumnoRef, { creditos: creditosAlumno - monto });

      t.set(doc(collection(db, "transacciones")), {
        usuarioId: profesorId,
        tipo: "enseñanza",
        cantidad: monto,
        descripcion: "Sesión confirmada de " + ses.horas + "h",
        fecha: serverTimestamp()
      });
      t.set(doc(collection(db, "transacciones")), {
        usuarioId: alumnoId,
        tipo: "aprendizaje",
        cantidad: -monto,
        descripcion: "Sesión confirmada de " + ses.horas + "h",
        fecha: serverTimestamp()
      });

      t.update(sesionRef, { estado: "confirmada" });
    });
  } catch (error) {
    if (error.message === "SIN_CREDITOS") {
      if (error.alumnoSoyYo) {
        alert("No tienes créditos suficientes para confirmar esta sesión: necesitas " + error.necesarios + " y tienes " + error.disponibles + ".\n\nPuedes rechazarla, o enseñar una sesión para conseguir créditos.");
      } else {
        alert("La otra persona no tiene créditos suficientes (necesita " + error.necesarios + " y tiene " + error.disponibles + "), así que esta sesión no se puede confirmar todavía.");
      }
    } else if (error.message === "YA_RESUELTA") {
      alert("Esta sesión ya estaba resuelta.");
    } else if (error.message === "HORAS_INVALIDAS") {
      alert("Este registro tiene un número de horas no válido.");
    } else {
      alert("No se pudo confirmar la sesión. Inténtalo de nuevo.");
      console.error(error);
    }
  }

  window.location.reload();
}

async function rechazarSesion(sesionId) {
  try {
    await updateDoc(doc(db, "sesiones", sesionId), { estado: "rechazada" });
  } catch (error) {
    alert("No se pudo rechazar la sesión. Inténtalo de nuevo.");
    console.error(error);
  }
  window.location.reload();
}