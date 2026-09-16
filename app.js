/**
 * FinLearn - Belajar & Catat Keuangan
 * Minimalist Pure JS DOM Logic
 */

/* ===== 1. MATERI & KURIKULUM DATA SOURCE ===== */
const MODULES_DATA = (typeof window !== 'undefined' && window.FINLEARN_MODULES) 
  ? window.FINLEARN_MODULES 
  : [];

/* ===== 2. GLOBAL STATE & THEME ===== */
const appState = {
  theme: localStorage.getItem('finlearn_theme') || 'light',
  fontSize: localStorage.getItem('finlearn_font_size') || 'standard',
  currentModuleIndex: parseInt(localStorage.getItem('finlearn_active_mod') || '0', 10),
  completedModules: JSON.parse(localStorage.getItem('finlearn_completed_mods') || '[]'),
  transactions: JSON.parse(localStorage.getItem('finlearn_transactions') || '[]')
};

// Pastikan index modul valid
if (appState.currentModuleIndex < 0 || (MODULES_DATA.length > 0 && appState.currentModuleIndex >= MODULES_DATA.length)) {
  appState.currentModuleIndex = 0;
}

// Inisialisasi Tema
function initTheme() {
  document.documentElement.setAttribute('data-theme', appState.theme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.textContent = appState.theme === 'dark' ? '🌙' : '☀️';
  }
}

function toggleTheme() {
  appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('finlearn_theme', appState.theme);
  initTheme();
}

/* ===== 3. ROBUST MARKDOWN PARSER ===== */
function parseSimpleMarkdown(md) {
  if (!md) return '';

  const lines = md.split('\n');
  const out = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeBuffer = [];
  let paraBuffer = [];

  function flushPara() {
    if (paraBuffer.length > 0) {
      const text = paraBuffer.join(' ').trim();
      if (text) {
        out.push('<p>' + inlineFormat(text) + '</p>');
      }
      paraBuffer = [];
    }
  }

  function flushLists() {
    if (inUl) {
      out.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      out.push('</ol>');
      inOl = false;
    }
  }

  function inlineFormat(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // Code block toggle ```
    if (line.startsWith('```')) {
      flushPara();
      flushLists();
      if (inCode) {
        inCode = false;
        out.push('<pre><code>' + codeBuffer.map(escapeHtml).join('\n') + '</code></pre>');
        codeBuffer = [];
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(raw);
      continue;
    }

    // Blank line
    if (!line) {
      flushPara();
      flushLists();
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      flushPara();
      flushLists();
      out.push('<h1>' + inlineFormat(line.substring(2)) + '</h1>');
    } else if (line.startsWith('## ')) {
      flushPara();
      flushLists();
      out.push('<h2>' + inlineFormat(line.substring(3)) + '</h2>');
    } else if (line.startsWith('### ')) {
      flushPara();
      flushLists();
      out.push('<h3>' + inlineFormat(line.substring(4)) + '</h3>');
    } else if (line.startsWith('> ')) {
      flushPara();
      flushLists();
      out.push('<blockquote>' + inlineFormat(line.substring(2)) + '</blockquote>');
    } else if (line.startsWith('- ')) {
      flushPara();
      if (inOl) {
        out.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul>');
        inUl = true;
      }
      out.push('<li>' + inlineFormat(line.substring(2)) + '</li>');
    } else if (/^\d+\.\s/.test(line)) {
      flushPara();
      if (inUl) {
        out.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol>');
        inOl = true;
      }
      const itemText = line.replace(/^\d+\.\s*/, '');
      out.push('<li>' + inlineFormat(itemText) + '</li>');
    } else {
      flushLists();
      paraBuffer.push(line);
    }
  }

  flushPara();
  flushLists();
  return out.join('\n');
}

/* ===== 4. LOGIKA HALAMAN MATERI ===== */
function initMateriPage() {
  renderModuleListSidebar();
  loadModule(appState.currentModuleIndex);
  initScrollTopButton();
  applyFontSize(appState.fontSize);
}

function renderModuleListSidebar() {
  const container = document.getElementById('moduleList');
  if (!container) return;

  container.innerHTML = '';
  const total = MODULES_DATA.length;
  const completedCount = appState.completedModules.length;

  const counterEl = document.getElementById('moduleCounter');
  if (counterEl) counterEl.textContent = `${total} Modul`;

  const summaryEl = document.getElementById('progressSummary');
  if (summaryEl) summaryEl.textContent = `${completedCount} / ${total} Modul`;

  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const pctEl = document.getElementById('progressPercent');
  if (pctEl) pctEl.textContent = `${pct}%`;

  const barEl = document.getElementById('progressBar');
  if (barEl) barEl.style.width = `${pct}%`;

  MODULES_DATA.forEach((mod, idx) => {
    const isCurrent = idx === appState.currentModuleIndex;
    const isDone = appState.completedModules.includes(mod.id);

    const item = document.createElement('div');
    item.className = `module-item ${isCurrent ? 'active' : ''}`;
    item.onclick = () => loadModule(idx);

    item.innerHTML = `
      <div class="module-icon-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div class="module-info">
        <div class="module-tag">${mod.tag}</div>
        <div class="module-name">${mod.title}</div>
      </div>
      ${isDone ? `
        <div class="module-badge-done" title="Selesai dibaca">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>` : ''}
    `;
    container.appendChild(item);
  });
}

function loadModule(idx) {
  if (!MODULES_DATA || MODULES_DATA.length === 0) return;
  if (idx < 0 || idx >= MODULES_DATA.length) return;
  appState.currentModuleIndex = idx;
  localStorage.setItem('finlearn_active_mod', idx);

  const mod = MODULES_DATA[idx];

  // Tandai selesai jika belum
  if (!appState.completedModules.includes(mod.id)) {
    appState.completedModules.push(mod.id);
    localStorage.setItem('finlearn_completed_mods', JSON.stringify(appState.completedModules));
  }

  // Update headers & content
  const tagEl = document.getElementById('currentModuleTag');
  if (tagEl) tagEl.textContent = mod.tag;

  const titleEl = document.getElementById('currentModuleTitle');
  if (titleEl) titleEl.textContent = mod.fullTitle || mod.title;

  const articleEl = document.getElementById('articleBody');
  if (articleEl) articleEl.innerHTML = parseSimpleMarkdown(mod.content);

  // Update tombol prev / next
  const prevBtn = document.getElementById('btnPrevMod');
  if (prevBtn) prevBtn.disabled = idx === 0;

  const nextBtn = document.getElementById('btnNextMod');
  if (nextBtn) nextBtn.disabled = idx === MODULES_DATA.length - 1;

  renderModuleListSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changeModule(step) {
  loadModule(appState.currentModuleIndex + step);
}

function setFontSize(size) {
  appState.fontSize = size;
  localStorage.setItem('finlearn_font_size', size);
  applyFontSize(size);
}

function applyFontSize(size) {
  const article = document.getElementById('articleBody');
  if (!article) return;
  article.classList.remove('text-small', 'text-standard', 'text-large');
  article.classList.add(`text-${size}`);

  const btns = document.querySelectorAll('.font-size-btn');
  btns.forEach((btn, idx) => {
    btn.classList.remove('active');
    if (size === 'small' && idx === 0) btn.classList.add('active');
    if (size === 'standard' && idx === 1) btn.classList.add('active');
    if (size === 'large' && idx === 2) btn.classList.add('active');
  });
}

function initScrollTopButton() {
  const btn = document.getElementById('btnScrollTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ===== 5. LOGIKA HALAMAN LAPORAN KEUANGAN ===== */
function initKeuanganPage() {
  setDefaultDateInput();
  initMonthFilter();
  updateSummaryCards();
  renderTransactionsList();
}

function setDefaultDateInput() {
  const dateInput = document.getElementById('inputTxDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

function initMonthFilter() {
  const filterMonth = document.getElementById('filterMonth');
  if (filterMonth) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    filterMonth.value = `${y}-${m}`;
  }
}

function handleAddTransaction() {
  const type = document.getElementById('inputTxType').value;
  const date = document.getElementById('inputTxDate').value;
  const category = document.getElementById('inputTxCategory').value;
  const desc = document.getElementById('inputTxDesc').value.trim();
  const amount = parseFloat(document.getElementById('inputTxAmount').value);

  if (!date) {
    showToastNotification('Harap pilih tanggal transaksi.');
    return;
  }
  if (!desc) {
    showToastNotification('Keterangan transaksi tidak boleh kosong.');
    return;
  }
  if (!amount || amount <= 0) {
    showToastNotification('Jumlah nominal harus lebih dari 0.');
    return;
  }

  const newTx = {
    id: Date.now(),
    type,
    date,
    category,
    desc,
    amount
  };

  appState.transactions.unshift(newTx);
  localStorage.setItem('finlearn_transactions', JSON.stringify(appState.transactions));

  // Reset form
  document.getElementById('inputTxDesc').value = '';
  document.getElementById('inputTxAmount').value = '';
  setDefaultDateInput();

  updateSummaryCards();
  renderTransactionsList();
  showToastNotification('Catatan transaksi berhasil disimpan.');
}

function deleteTransactionItem(id) {
  appState.transactions = appState.transactions.filter(t => t.id !== id);
  localStorage.setItem('finlearn_transactions', JSON.stringify(appState.transactions));
  updateSummaryCards();
  renderTransactionsList();
  showToastNotification('Catatan transaksi telah dihapus.');
}

function updateSummaryCards() {
  const statBalance = document.getElementById('statBalance');
  const statIncome = document.getElementById('statIncome');
  const statExpense = document.getElementById('statExpense');

  if (!statBalance || !statIncome || !statExpense) return;

  const totalIncome = appState.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = appState.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  statIncome.textContent = formatRupiah(totalIncome);
  statExpense.textContent = formatRupiah(totalExpense);
  statBalance.textContent = formatRupiah(balance);
}

function renderTransactionsList() {
  const tbody = document.getElementById('txTableBody');
  const emptyState = document.getElementById('tableEmptyState');
  if (!tbody) return;

  const filterType = document.getElementById('filterType').value;
  const filterMonth = document.getElementById('filterMonth').value;

  let list = [...appState.transactions];

  if (filterType !== 'all') {
    list = list.filter(t => t.type === filterType);
  }
  if (filterMonth) {
    list = list.filter(t => t.date.startsWith(filterMonth));
  }

  // Urutkan tanggal terbaru di atas
  list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  tbody.innerHTML = '';

  if (list.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';

  list.forEach(item => {
    const tr = document.createElement('tr');
    const isIncome = item.type === 'income';

    tr.innerHTML = `
      <td style="color: var(--text-secondary); white-space: nowrap;">${formatDisplayDate(item.date)}</td>
      <td><strong>${escapeHtml(item.desc)}</strong></td>
      <td style="color: var(--text-muted); font-size: 12px;">${item.category}</td>
      <td>
        <span class="badge-tag ${isIncome ? 'badge-income' : 'badge-expense'}">
          ${isIncome ? 'Pemasukan' : 'Pengeluaran'}
        </span>
      </td>
      <td class="${isIncome ? 'amount-income' : 'amount-expense'}" style="white-space: nowrap;">
        ${isIncome ? '+' : '−'} ${formatRupiah(item.amount)}
      </td>
      <td style="text-align: center;">
        <button class="btn-delete-row" onclick="deleteTransactionItem(${item.id})" title="Hapus Catatan">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function handleExportCSV() {
  if (appState.transactions.length === 0) {
    showToastNotification('Tidak ada data transaksi untuk diekspor.');
    return;
  }

  const headers = ['ID', 'Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah_Rp'];
  const rows = appState.transactions.map(t => [
    t.id,
    t.date,
    t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    `"${(t.category || '').replace(/"/g, '""')}"`,
    `"${(t.desc || '').replace(/"/g, '""')}"`,
    t.amount
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Laporan_Keuangan_FinLearn_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link);

  showToastNotification('Laporan CSV berhasil diunduh.');
}

/* ===== 6. UTILITY FUNCTIONS ===== */
function formatRupiah(val) {
  return 'Rp ' + Math.abs(val).toLocaleString('id-ID');
}

function formatDisplayDate(dateString) {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToastNotification(msg) {
  let box = document.querySelector('.toast-box');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toast-box';
    document.body.appendChild(box);
  }
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.textContent = msg;
  box.appendChild(item);

  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transition = 'opacity 0.25s ease';
    setTimeout(() => item.remove(), 250);
  }, 2500);
}

/* ===== 7. APPLICATION ENTRYPOINT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const pageType = document.body.dataset.page;
  if (pageType === 'materi') {
    initMateriPage();
  } else if (pageType === 'keuangan') {
    initKeuanganPage();
  }
});
