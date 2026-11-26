/* ============================================================
   SEMNASTI 2026 – pengaturan acara (ubah di sini saja)
   ============================================================ */
const CONFIG = {
  eventName: 'SEMNASTI 2026',
  eventDate: '2026-11-30T08:00:00+07:00',      // Senin, 30 November 2026
  regDeadline: '2026-11-28T23:59:59+07:00',    // Registrasi terakhir 28 November 2026
  venue: 'Universitas Dian Nuswantoro, Semarang',
  packages: {
    single:   { label: 'Single',   price: 125000, seats: 1 },
    bundling: { label: 'Bundling', price: 330000, seats: 3 }
  },
  storageKey: 'semnasti2026_registrations'
};

/* ---------- Helper ---------- */
const $ = (id) => document.getElementById(id);
const rupiah = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
const longDate = (d) =>
  new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Untuk uji coba: tambahkan ?now=2026-11-29T10:00:00%2B07:00 di URL untuk mensimulasikan waktu.
function currentTime() {
  const p = new URLSearchParams(location.search).get('now');
  const d = p ? new Date(p) : null;
  return d && !isNaN(d) ? d : new Date();
}
const isOpen = () => currentTime() <= new Date(CONFIG.regDeadline);

/* ---------- Penyimpanan (localStorage) ---------- */
function loadRegs() {
  try { return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]'); }
  catch (e) { return []; }
}
function saveReg(reg) {
  try {
    const all = loadRegs();
    all.push(reg);
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(all));
    return true;
  } catch (e) { return false; }
}

/* ---------- Status pendaftaran & hitung mundur ---------- */
function applyStatus() {
  const open = isOpen();
  const deadlineText = longDate(CONFIG.regDeadline);

  const badge = $('statusBadge');
  badge.className = 'badge ' + (open ? 'open' : 'closed');
  badge.textContent = open ? 'Pendaftaran dibuka · masih tersedia' : 'Pendaftaran ditutup';

  const fs = $('formStatus');
  fs.className = 'form-status ' + (open ? 'open' : 'closed');
  fs.textContent = open
    ? 'Pendaftaran masih tersedia sampai ' + deadlineText + '.'
    : 'Pendaftaran sudah ditutup pada ' + deadlineText + '. Jika sudah mendaftar, lihat tiket Anda di bagian Cek tiket.';

  $('formFields').disabled = !open;
  document.querySelectorAll('.pick').forEach((b) => (b.disabled = !open));

  const cta = $('heroCta');
  cta.textContent = open ? 'Daftar sekarang' : 'Cek tiket saya';
  cta.setAttribute('href', open ? '#daftar' : '#cek');

  document.querySelector('.stub').classList.toggle('closed', !open);
  $('countLabel').textContent = open ? 'Registrasi ditutup dalam' : 'Registrasi sudah ditutup';

  if (open) {
    const ms = new Date(CONFIG.regDeadline) - currentTime();
    $('cd').textContent = Math.floor(ms / 864e5);
    $('ch').textContent = Math.floor((ms % 864e5) / 36e5);
    $('cm').textContent = Math.floor((ms % 36e5) / 6e4);
  }
}

/* ---------- Form: paket, kolom peserta, total ---------- */
function selectedPackage() {
  return document.querySelector('input[name="paket"]:checked').value;
}

function renderSeats() {
  const pkg = CONFIG.packages[selectedPackage()];
  const wrap = $('seatsWrap');
  const old = [...wrap.querySelectorAll('input')].map((i) => i.value);
  wrap.innerHTML = '';
  for (let i = 0; i < pkg.seats; i++) {
    const label = document.createElement('label');
    label.className = 'field';
    label.innerHTML =
      (pkg.seats === 1 ? 'Nama lengkap' : 'Nama peserta ' + (i + 1)) +
      '<input type="text" class="seat" autocomplete="name" required placeholder="Sesuai untuk e-sertifikat">';
    label.querySelector('input').value = old[i] || '';
    wrap.appendChild(label);
  }
  $('totalText').textContent = rupiah(pkg.price);
}

document.querySelectorAll('input[name="paket"]').forEach((r) => r.addEventListener('change', renderSeats));

document.querySelectorAll('.pick').forEach((btn) =>
  btn.addEventListener('click', () => {
    document.querySelector('input[name="paket"][value="' + btn.dataset.pkg + '"]').checked = true;
    renderSeats();
    $('daftar').scrollIntoView({ behavior: 'smooth' });
  })
);

/* ---------- Kirim formulir ---------- */
function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'SMN26-' + s;
}

$('regForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('formError');
  err.textContent = '';

  if (!isOpen()) { err.textContent = 'Pendaftaran sudah ditutup.'; return; }

  const names = [...document.querySelectorAll('.seat')].map((i) => i.value.trim());
  const email = $('email').value.trim().toLowerCase();
  const wa = $('wa').value.replace(/[\s-]/g, '');
  const instansi = $('instansi').value.trim();

  if (names.some((n) => n.length < 3)) { err.textContent = 'Isi semua nama peserta (minimal 3 huruf).'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Format email belum benar. Contoh: nama@email.com'; return; }
  if (!/^(\+62|62|0)8\d{7,12}$/.test(wa)) { err.textContent = 'Nomor WhatsApp belum benar. Contoh: 08123456789'; return; }
  if (instansi.length < 2) { err.textContent = 'Isi nama instansi atau kampus Anda.'; return; }

  const key = selectedPackage();
  const reg = {
    code: makeCode(),
    package: key,
    total: CONFIG.packages[key].price,
    names, email, wa, instansi,
    createdAt: new Date().toISOString()
  };

  if (!saveReg(reg)) {
    err.textContent = 'Data tidak bisa disimpan di browser ini. Nonaktifkan mode privat lalu coba lagi.';
    return;
  }
  $('regForm').reset();
  renderSeats();
  showTicket(reg);
});

/* ---------- Tampilkan tiket ---------- */
function showTicket(reg) {
  const pkg = CONFIG.packages[reg.package];
  const people = reg.names.length === 1
    ? '<dd>' + esc(reg.names[0]) + '</dd>'
    : '<dd><ol>' + reg.names.map((n) => '<li>' + esc(n) + '</li>').join('') + '</ol></dd>';

  $('ticketResult').innerHTML =
    '<article class="ticket">' +
      '<div class="ticket-head"><h3>' + esc(CONFIG.eventName) + '</h3>' +
      '<p>Seminar Nasional Teknologi Informasi · HMTI UDINUS</p></div>' +
      '<div class="ticket-body">' +
        '<dl>' +
          '<div><dt>' + (reg.names.length === 1 ? 'Peserta' : 'Peserta (' + reg.names.length + ' orang)') + '</dt>' + people + '</div>' +
          '<div><dt>Paket</dt><dd>' + esc(pkg.label) + ' · ' + rupiah(reg.total) + '</dd></div>' +
          '<div><dt>Waktu</dt><dd>' + longDate(CONFIG.eventDate) + ', 08.00 WIB</dd></div>' +
          '<div><dt>Lokasi</dt><dd>' + esc(CONFIG.venue) + '</dd></div>' +
        '</dl>' +
        '<div class="qr"><div class="qrbox" id="qrbox"></div><code>' + esc(reg.code) + '</code></div>' +
      '</div>' +
      '<div class="ticket-foot"><span>Tunjukkan QR ini saat presensi di hari acara.</span>' +
      '<button class="btn btn-ghost" type="button" onclick="window.print()">Cetak tiket</button></div>' +
    '</article>';

  if (window.QRCode) {
    new QRCode($('qrbox'), { text: reg.code, width: 140, height: 140, colorDark: '#14213d', colorLight: '#ffffff' });
  } else {
    $('qrbox').textContent = 'QR tidak termuat. Tunjukkan kode di bawah ini.';
  }

  const sec = $('tiket');
  sec.hidden = false;
  sec.scrollIntoView({ behavior: 'smooth' });
}

/* ---------- Cek tiket ---------- */
$('lookupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('lookupInput').value.trim();
  const msg = $('lookupMsg');
  msg.textContent = '';
  if (!q) { msg.textContent = 'Isi kode registrasi atau email.'; return; }

  const found = loadRegs().filter((r) => r.code === q.toUpperCase() || r.email === q.toLowerCase());
  if (!found.length) {
    msg.textContent = 'Tiket tidak ditemukan di browser ini. Periksa kode atau email, atau gunakan browser yang dipakai saat mendaftar.';
    return;
  }
  showTicket(found[found.length - 1]);
});

/* ---------- Mulai ---------- */
$('venueText').textContent = CONFIG.venue;
renderSeats();
applyStatus();
setInterval(applyStatus, 30000);
