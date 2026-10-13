import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, db, doc, setDoc, collection, addDoc, serverTimestamp } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".auth-tab");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const resetForm = document.getElementById("reset-form");

  function mostrarVista(vista) {
    loginForm.style.display = vista === "login" ? "flex" : "none";
    registerForm.style.display = vista === "register" ? "flex" : "none";
    resetForm.style.display = vista === "reset" ? "flex" : "none";
    tabs.forEach((t) => {
      t.classList.toggle("active", t.getAttribute("data-tab") === vista);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      mostrarVista(tab.getAttribute("data-tab"));
    });
  });

  document.getElementById("forgot-link").addEventListener("click", (evento) => {
    evento.preventDefault();
    document.getElementById("reset-email").value = document.getElementById("login-email").value;
    document.getElementById("reset-msg").textContent = "";
    mostrarVista("reset");
  });

  document.getElementById("back-to-login").addEventListener("click", (evento) => {
    evento.preventDefault();
    mostrarVista("login");
  });

  resetForm.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const email = document.getElementById("reset-email").value.trim();
    const mensaje = document.getElementById("reset-msg");
    const boton = document.getElementById("reset-btn");
    mensaje.style.color = "";
    mensaje.textContent = "";
    boton.disabled = true;

    try {
      await sendPasswordResetEmail(auth, email);
      mensaje.style.color = "#27ae60";
      mensaje.textContent = "Si ese email tiene una cuenta en Skillswap, te hemos enviado un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.";
    } catch (error) {
      if (error.code === "auth/invalid-email") {
        mensaje.textContent = "Escribe un email válido.";
      } else if (error.code === "auth/too-many-requests") {
        mensaje.textContent = "Demasiados intentos. Espera unos minutos y vuelve a probar.";
      } else {
        mensaje.textContent = "No se pudo enviar el enlace. Inténtalo de nuevo.";
      }
      console.error(error);
    }

    boton.disabled = false;
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
    const nombre = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const errorBox = document.getElementById("register-error");
    errorBox.textContent = "";

    const CREDITOS_BIENVENIDA = 10;

    createUserWithEmailAndPassword(auth, email, password)
      .then((resultado) => {
        const usuario = resultado.user;
        return setDoc(doc(db, "perfiles", usuario.uid), {
          nombre: nombre,
          bio: "",
          habilidadesOfrezco: [],
          habilidadesBusco: [],
          creditos: CREDITOS_BIENVENIDA,
          creado: new Date().toISOString()
        }).then(() => {
          return addDoc(collection(db, "transacciones"), {
            usuarioId: usuario.uid,
            tipo: "bienvenida",
            cantidad: CREDITOS_BIENVENIDA,
            descripcion: "Créditos de bienvenida al registrarte",
            fecha: serverTimestamp()
          });
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