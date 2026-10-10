export function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function fotoSegura(valor) {
  const v = String(valor ?? "");
  return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v) ? v : "";
}

export function avatarHtml(nombre, foto) {
  const f = fotoSegura(foto);
  if (f) {
    return `<img src="${f}" alt="Foto de ${esc(nombre)}" class="profile-avatar-img">`;
  }
  return `<div class="profile-avatar-placeholder">${esc(String(nombre ?? "").charAt(0).toUpperCase())}</div>`;
}