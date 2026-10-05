import { auth, onAuthStateChanged, db, collection, getDocs, addDoc, serverTimestamp } from "./firebase-config.js";

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function distanciaEdicion(a, b) {
  const matriz = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matriz[i][0] = i;
  for (let j = 0; j <= b.length; j++) matriz[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + costo
      );
    }
  }
  return matriz[a.length][b.length];
}

function encontrarCoincidencia(consulta, catalogo) {
  const consultaNorm = normalizar(consulta);
  let mejor = null;
  let mejorDistancia = Infinity;

  catalogo.forEach((original) => {
    const candidatoNorm = normalizar(original);

    if (candidatoNorm.includes(consultaNorm) || consultaNorm.includes(candidatoNorm)) {
      if (0 < mejorDistancia) {
        mejor = original;
        mejorDistancia = 0;
      }
      return;
    }

    const dist = distanciaEdicion(consultaNorm, candidatoNorm);
    const umbral = Math.max(2, Math.floor(candidatoNorm.length * 0.34));
    if (dist <= umbral && dist < mejorDistancia) {
      mejor = original;
      mejorDistancia = dist;
    }
  });

  return mejor;
}

document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("suggest-content");

  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
      contenedor.innerHTML = `
        <h2>Necesitas iniciar sesión</h2>
        <p>Para sugerir una habilidad, primero crea una cuenta o inicia sesión.</p>
        <a href="cuenta.html" class="hero-button-dark">Iniciar sesión</a>
      `;
      return;
    }

    contenedor.innerHTML = `
      <h2>¿Qué habilidad buscas o quieres enseñar?</h2>
      <p>Escríbelo con tus propias palabras, nosotros comprobamos si ya existe algo parecido en Skillswap.</p>
      <input type="text" id="skill-query" placeholder="Ej: arreglar bicicletas" class="search-input" style="width: 100%; margin: 15px 0;">
      <button id="check-btn" class="mentor-button">Comprobar</button>
      <div id="suggest-result" style="margin-top: 20px;"></div>
    `;

    const querySnapshot = await getDocs(collection(db, "perfiles"));
    const catalogoSet = new Set();
    querySnapshot.forEach((docSnap) => {
      const datos = docSnap.data();
      (datos.habilidadesOfrezco || []).forEach((h) => catalogoSet.add(h.trim()));
      (datos.habilidadesBusco || []).forEach((h) => catalogoSet.add(h.trim()));
    });
    const catalogo = Array.from(catalogoSet);

    document.getElementById("check-btn").addEventListener("click", async () => {
      const input = document.getElementById("skill-query");
      const texto = input.value.trim();
      const resultado = document.getElementById("suggest-result");

      if (texto === "") return;

      const coincidencia = encontrarCoincidencia(texto, catalogo);

      if (coincidencia) {
        resultado.innerHTML = `
          <p>¿Quizás te refieres a <strong>"${coincidencia}"</strong>? Ya existe en Skillswap.</p>
          <a href="editar-perfil.html" class="mentor-button">Añadirla a mi perfil</a>
        `;
      } else {
        await addDoc(collection(db, "sugerencias"), {
          usuarioId: usuario.uid,
          texto: texto,
          fecha: serverTimestamp()
        });
        resultado.innerHTML = `
          <p>✅ No encontramos nada parecido todavía — hemos guardado <strong>"${texto}"</strong> como sugerencia nueva. ¡Gracias por ayudarnos a crecer el catálogo!</p>
        `;
      }
    });
  });
});