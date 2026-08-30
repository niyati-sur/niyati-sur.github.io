const data = window.PORTFOLIO || {};

const emailLink = document.getElementById('emailLink');
if (emailLink && data.email) {
  emailLink.href = `mailto:${data.email}`;
}

const linkedinLink = document.getElementById('linkedinLink');
if (linkedinLink && data.linkedin) {
  linkedinLink.href = data.linkedin;
}

document.getElementById('year').textContent = new Date().getFullYear();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const orb = document.querySelector('.cursor-orb');
window.addEventListener('pointermove', (e) => {
  if (!orb) return;
  orb.style.left = `${e.clientX}px`;
  orb.style.top = `${e.clientY}px`;
});
