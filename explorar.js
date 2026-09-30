import { db, collection, getDocs } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.getElementById("cards-container");
  const suggestCard = document.getElementById("suggest-card");
  if (!contenedor) return;

  try {
    const querySnapshot = await getDocs(collection(db, "perfiles"));
    const mapaHabilidades = {};

    querySnapshot.forEach((docSnap) => {
      const datos = docSnap.data();
      (datos.habilidadesOfrezco || []).forEach((h) => {
        const clave = h.trim().toLowerCase();
        if (!clave) return;
        if (!mapaHabilidades[clave]) {
          mapaHabilidades[clave] = { nombre: h.trim(), personas: [] };
        }
        mapaHabilidades[clave].personas.push(datos.nombre);
      });
    });

    const habilidades = Object.values(mapaHabilidades);

    if (habilidades.length === 0) {
      const vacio = document.createElement("p");
      vacio.className = "empty-msg";
      vacio.textContent = "Todavía no hay habilidades añadidas por usuarios. ¡Sé el primero desde tu perfil!";
      contenedor.insertBefore(vacio, suggestCard);
      return;
    }

    habilidades.forEach((item) => {
      const tarjeta = document.createElement("div");
      tarjeta.className = "card";
      tarjeta.title = "Ofrecido por: " + item.personas.join(", ");
      tarjeta.innerHTML = `<span class="card-icon">✨</span>${item.nombre}`;
      contenedor.insertBefore(tarjeta, suggestCard);
    });
  } catch (error) {
    console.error("Error cargando habilidades:", error);
  }
});