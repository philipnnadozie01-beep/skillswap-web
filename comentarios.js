document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("feedback-form");
  if (!form) return;

  const msg = document.getElementById("fb-msg");
  const boton = document.getElementById("fb-enviar");
  const campoPagina = document.getElementById("fb-pagina");

  function rellenarPagina() {
    campoPagina.value = (document.referrer || "directo").slice(0, 200);
  }
  rellenarPagina();

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    msg.style.color = "";
    msg.textContent = "";

    if (!form.action.startsWith("https://formspree.io/")) {
      msg.textContent = "El formulario todavía no está conectado (falta pegar la URL de Formspree).";
      return;
    }

    boton.disabled = true;
    boton.textContent = "Enviando...";

    try {
      const respuesta = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      });

      if (respuesta.ok) {
        form.reset();
        rellenarPagina();
        msg.style.color = "#27ae60";
        msg.textContent = "✅ ¡Gracias! Hemos recibido tu comentario.";
      } else {
        msg.textContent = "No se pudo enviar. Inténtalo de nuevo en un momento.";
      }
    } catch (error) {
      msg.textContent = "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.";
      console.error(error);
    }

    boton.disabled = false;
    boton.textContent = "Enviar comentario";
  });
});