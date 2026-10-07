import { auth, onAuthStateChanged, db, collection, getDocs, doc, getDoc } from "./firebase-config.js";

const EMAIL_ADMIN = "TU-EMAIL-AQUI";

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("admin-content");

  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario || usuario.email !== EMAIL_ADMIN) {
      contenedor.innerHTML = `
        <h2>Acceso restringido</h2>
        <p>Esta página solo está disponible para el administrador de Skillswap.</p>
        <a href="index.html" class="hero-button-dark">Volver a Inicio</a>
      `;
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, "sugerencias"));

      if (snapshot.empty) {
        contenedor.innerHTML = `
          <h2>Sugerencias de habilidades</h2>
          <p>Todavía no hay ninguna sugerencia registrada.</p>
        `;
        return;
      }

      const sugerencias = [];
      for (const docSnap of snapshot.docs) {
        const datos = docSnap.data();
        let nombreUsuario = "Usuario desconocido";
        try {
          const perfilSnap = await getDoc(doc(db, "perfiles", datos.usuarioId));
          if (perfilSnap.exists()) nombreUsuario = perfilSnap.data().nombre;
        } catch (e) {}
        sugerencias.push({ ...datos, nombreUsuario });
      }

      sugerencias.sort((a, b) => {
        const fechaA = a.fecha ? a.fecha.toMillis() : 0;
        const fechaB = b.fecha ? b.fecha.toMillis() : 0;
        return fechaB - fechaA;
      });

      const filasHtml = sugerencias.map((s) => `
        <div class="session-pending-card">
          <strong>"${s.texto}"</strong>
          <p style="margin: 5px 0; color: var(--text-secondary); font-size: 14px;">Sugerido por: ${s.nombreUsuario}</p>
        </div>
      `).join("");

      contenedor.innerHTML = `
        <h2>Sugerencias de habilidades (${sugerencias.length})</h2>
        <p>Habilidades que los usuarios han pedido y que no encajaron con el catálogo existente.</p>
        <div style="margin-top: 20px;">${filasHtml}</div>
      `;
    } catch (error) {
      contenedor.innerHTML = `<p>Error al cargar las sugerencias. Revisa la consola.</p>`;
      console.error(error);
    }
  });
});