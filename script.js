const skills = ["Guitarra", "Excel", "Inglés", "Cocina", "Fotografía", "Piano", "Programación", "Yoga", "Diseño gráfico", "Francés", "Lectura activa", "Colaboración en equipo"];

function contarSkills(arr) {
  return arr.length;
}

console.log("Número de habilidades:", contarSkills(skills));

document.addEventListener("DOMContentLoaded", () => {
  const boton = document.querySelector("button");
  const input = document.querySelector("#buscar");
  const error = document.querySelector("#error");
  const tarjetas = document.querySelectorAll(".card");

  if (boton && input && error) {
    boton.addEventListener("click", (evento) => {
      evento.preventDefault();

      const texto = input.value.trim().toLowerCase();

      if (texto === "") {
        error.textContent = "Por favor, escribe algo para buscar.";
        tarjetas.forEach((tarjeta) => {
          tarjeta.style.display = "block";
        });
        return;
      }

      error.textContent = "";

      tarjetas.forEach((tarjeta) => {
        const nombreSkill = tarjeta.textContent.toLowerCase();
        if (nombreSkill.includes(texto)) {
          tarjeta.style.display = "block";
        } else {
          tarjeta.style.display = "none";
        }
      });
    });
  }

  const elementosReveal = document.querySelectorAll(".reveal");

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("visible");
      }
    });
  }, { threshold: 0.15 });

  elementosReveal.forEach((el) => observer.observe(el));
});