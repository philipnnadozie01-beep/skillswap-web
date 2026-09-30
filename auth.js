import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, db, doc, setDoc } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".auth-tab");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      if (tab.getAttribute("data-tab") === "login") {
        loginForm.style.display = "flex";
        registerForm.style.display = "none";
      } else {
        loginForm.style.display = "none";
        registerForm.style.display = "flex";
      }
    });
  });

  loginForm.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    const errorBox = document.getElementById("login-error");
    errorBox.textContent = "";

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        window.location.href = "perfil.html";
      })
      .catch((error) => {
        errorBox.textContent = "Email o contraseña incorrectos.";
        console.error(error);
      });
  });

  registerForm.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const nombre = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const errorBox = document.getElementById("register-error");
    errorBox.textContent = "";

    createUserWithEmailAndPassword(auth, email, password)
      .then((resultado) => {
        const usuario = resultado.user;
        return setDoc(doc(db, "perfiles", usuario.uid), {
          nombre: nombre,
          email: email,
          bio: "",
          habilidadesOfrezco: [],
          habilidadesBusco: [],
          creado: new Date().toISOString()
        });
      })
      .then(() => {
        window.location.href = "perfil.html";
      })
      .catch((error) => {
        if (error.code === "auth/email-already-in-use") {
          errorBox.textContent = "Ese email ya está registrado.";
        } else if (error.code === "auth/weak-password") {
          errorBox.textContent = "La contraseña debe tener al menos 6 caracteres.";
        } else {
          errorBox.textContent = "Error al crear la cuenta. Inténtalo de nuevo.";
        }
        console.error(error);
      });
  });
});