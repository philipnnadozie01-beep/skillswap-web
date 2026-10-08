import { auth, onAuthStateChanged, db, collection, getDocs, doc, getDoc } from "./firebase-config.js";

function esc(texto) {
  const d = document.createElement("div");
  d.textContent = texto;
  return d.innerHTML;
}

function mostrarRestringido(contenedor, conLogin) {
  contenedor.innerHTML = `
    <h2>Acceso restringido</h2>
    <p>Esta página solo está disponible para el administrador de Skillswap.</p>
    ${conLogin ? '<a href="cuenta.html" class="hero-button-dark">Iniciar sesión</a>' : '<a href="index.html" class="hero-button-dark">Volver a Inicio</a>'}
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("admin-content");

  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
      mostrarRestringido(contenedor, true);
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

      const grupos = {};
      const nombresCache = {};

      for (const docSnap of snapshot.docs) {
        const datos = docSnap.data();
        const clave = String(datos.texto || "").trim().toLowerCase();
        if (!clave) continue;

        if (!(datos.usuarioId in nombresCache)) {
          let nombre = "Usuario desconocido";
          try {
            const perfilSnap = await getDoc(doc(db, "perfiles", datos.usuarioId));
            if (perfilSnap.exists()) nombre = perfilSnap.data().nombre;
          } catch (e) {}
          nombresCache[datos.usuarioId] = nombre;
        }

        if (!grupos[clave]) {
          grupos[clave] = { texto: String(datos.texto).trim(), veces: 0, usuarios: new Set() };
        }
        grupos[clave].veces += 1;
        grupos[clave].usuarios.add(nombresCache[datos.usuarioId]);
      }

      const lista = Object.values(grupos).sort((a, b) => b.veces - a.veces);

      const filasHtml = lista.map((g) => `
        <div class="session-pending-card">
          <strong>"${esc(g.texto)}"</strong> × ${g.veces}
          <p style="margin: 5px 0; color: var(--text-secondary); font-size: 14px;">Pedido por: ${esc(Array.from(g.usuarios).join(", "))}</p>
        </div>
      `).join("");

      contenedor.innerHTML = `
        <h2>Sugerencias de habilidades (${lista.length} distintas)</h2>
        <p>Habilidades que los usuarios han pedido y que no encajaron con el catálogo existente, de la más pedida a la menos.</p>
        <div style="margin-top: 20px;">${filasHtml}</div>
      `;
    } catch (error) {
      console.error(error);
      if (error.code === "permission-denied") {
        mostrarRestringido(contenedor, false);
      } else {
        contenedor.innerHTML = `<p>Error al cargar las sugerencias. Revisa la consola.</p>`;
      }
    }
  });
});