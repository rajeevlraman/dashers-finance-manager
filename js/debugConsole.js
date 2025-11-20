// js/debugConsole.js
let debugVisible = false;
let panel, btn;

export function setupDebugConsole() {
  // --- Create hidden elements
  btn = document.createElement('button');
  btn.textContent = '🪵';
  btn.id = 'debugToggle';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: '9999',
    fontSize: '20px',
    borderRadius: '50%',
    border: 'none',
    background: '#3498db',
    color: '#fff',
    width: '44px',
    height: '44px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    display: 'none'
  });
  document.body.appendChild(btn);

  panel = document.createElement('div');
  panel.id = 'debugPanel';
  Object.assign(panel.style, {
    display: 'none',
    position: 'fixed',
    bottom: '60px',
    right: '10px',
    zIndex: '9998',
    width: '90%',
    maxHeight: '40%',
    overflowY: 'auto',
    background: 'rgba(0,0,0,0.85)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: '8px',
    borderRadius: '6px',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
  });
  document.body.appendChild(panel);

  // --- Toggle console visibility
  btn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  // --- Long-press on header to reveal/hide 🪵
  let pressTimer;
  document.addEventListener('touchstart', e => {
    if (e.target.closest('header')) {
      pressTimer = setTimeout(() => toggleButton(), 2000);
    }
  });
  document.addEventListener('touchend', () => clearTimeout(pressTimer));

  function toggleButton() {
    debugVisible = !debugVisible;
    btn.style.display = debugVisible ? 'block' : 'none';
  }

  // --- Extend console.log to also print to on-screen panel
  const oldLog = console.log;
  console.log = (...args) => {
    oldLog(...args);
    if (!panel) return;
    const msg = document.createElement('div');
    msg.textContent = args
      .map(a => (typeof a === 'object' ? JSON.stringify(a) : a))
      .join(' ');
    panel.appendChild(msg);
    if (panel.childNodes.length > 300) panel.removeChild(panel.firstChild);
    panel.scrollTop = panel.scrollHeight;
  };
}
