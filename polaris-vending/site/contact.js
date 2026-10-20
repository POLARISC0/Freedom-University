// The contact form has no server behind it yet. Sending opens the visitor's email app with their details
// filled in, addressed to the email shown on the page (id="contact-email" in index.html).

/** A mailto: link carrying the form's fields. Line breaks are CRLF, as email links expect. */
function emailLink(to, { name, business, phone, message }) {
  const body = [`Name: ${name}`, `Business: ${business}`, `Phone: ${phone}`, "", message].join("\n").trim().replace(/\r?\n/g, "\r\n");
  return `mailto:${to}?subject=${encodeURIComponent(`Machine request: ${business}`)}&body=${encodeURIComponent(body)}`;
}

const form = document.getElementById("contact-form");
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const to = document.getElementById("contact-email").getAttribute("href").replace(/^mailto:/, "");
  window.location.href = emailLink(to, Object.fromEntries(new FormData(form)));
  document.getElementById("form-status").textContent = `Your email app should open with your message ready to send. If it doesn't, email us at ${to}.`;
});
