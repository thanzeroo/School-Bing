/**
 * FinLearn - Personal Finance & Accounting Learning Platform
 * Minimalist Pure JS DOM Logic
 */

/* ===== 1. COURSE & CURRICULUM DATA SOURCE ===== */
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

// Ensure active module index is valid
if (appState.currentModuleIndex < 0 || (MODULES_DATA.length > 0 && appState.currentModuleIndex >= MODULES_DATA.length)) {
  appState.currentModuleIndex = 0;
}

// Theme Initialization & Switcher
function initTheme() {
  document.documentElement.setAttribute('data-theme', appState.theme);
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (icon) {
    icon.textContent = appState.theme === 'dark' ? '🌙' : '☀️';
  }
  if (label) {
    label.textContent = appState.theme === 'dark' ? 'Dark' : 'Light';
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

/* ===== 4. COURSE MODULES LOGIC ===== */
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
  if (counterEl) counterEl.textContent = `${total} Modules`;

  const summaryEl = document.getElementById('progressSummary');
  if (summaryEl) summaryEl.textContent = `${completedCount} / ${total} Completed`;

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
        <div class="module-badge-done" title="Completed">
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

  // NOTE: Module is NOT auto-completed upon opening!
  // User must explicitly click "Mark as Completed" to track true reading progress.

  // Update headers & content
  const tagEl = document.getElementById('currentModuleTag');
  if (tagEl) tagEl.textContent = mod.tag;

  const titleEl = document.getElementById('currentModuleTitle');
  if (titleEl) titleEl.textContent = mod.fullTitle || mod.title;

  const articleEl = document.getElementById('articleBody');
  if (articleEl) articleEl.innerHTML = parseSimpleMarkdown(mod.content);

  // Update prev / next buttons
  const prevBtn = document.getElementById('btnPrevMod');
  if (prevBtn) prevBtn.disabled = idx === 0;

  const nextBtn = document.getElementById('btnNextMod');
  if (nextBtn) nextBtn.disabled = idx === MODULES_DATA.length - 1;

  // Update Module Completion Card UI
  updateModuleCompletionUI();

  renderModuleListSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateModuleCompletionUI() {
  const mod = MODULES_DATA[appState.currentModuleIndex];
  if (!mod) return;

  const card = document.getElementById('moduleCompletionCard');
  const btn = document.getElementById('btnToggleComplete');
  const btnText = document.getElementById('btnToggleCompleteText');
  const icon = document.getElementById('completionStatusIcon');
  const title = document.getElementById('completionStatusTitle');
  const sub = document.getElementById('completionStatusSub');

  const isDone = appState.completedModules.includes(mod.id);

  if (card) {
    if (isDone) {
      card.classList.add('completed');
    } else {
      card.classList.remove('completed');
    }
  }

  if (btn) {
    if (isDone) {
      btn.classList.add('is-done');
    } else {
      btn.classList.remove('is-done');
    }
  }

  if (btnText) {
    btnText.textContent = isDone ? 'Mark as Incomplete' : 'Mark as Completed';
  }

  if (icon) {
    icon.innerHTML = isDone 
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' 
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
  }

  if (title) {
    title.textContent = isDone ? 'Module Completed!' : 'Finished reading this module?';
  }

  if (sub) {
    sub.textContent = isDone 
      ? 'Great job! You have understood this topic. You can review it anytime.' 
      : 'Click the button once you have understood the concepts to update your progress.';
  }
}

function toggleCurrentModuleComplete() {
  const mod = MODULES_DATA[appState.currentModuleIndex];
  if (!mod) return;

  const idx = appState.completedModules.indexOf(mod.id);
  if (idx > -1) {
    appState.completedModules.splice(idx, 1);
    showToastNotification(`Module ${mod.id} marked as incomplete.`);
  } else {
    appState.completedModules.push(mod.id);
    showToastNotification(`Module ${mod.id} marked as completed.`);
  }

  localStorage.setItem('finlearn_completed_mods', JSON.stringify(appState.completedModules));
  updateModuleCompletionUI();
  renderModuleListSidebar();
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

/* ===== 5. FINANCE TRACKER LOGIC ===== */
function initKeuanganPage() {
  setDefaultDateInput();
  initMonthFilter();
  updateSummaryCards();
  renderTransactionsList();

  const amountInput = document.getElementById('inputTxAmount');
  if (amountInput) {
    amountInput.addEventListener('input', (e) => {
      const raw = e.target.value.replace(/\D/g, '');
      if (raw) {
        e.target.value = parseInt(raw, 10).toLocaleString('en-US');
      } else {
        e.target.value = '';
      }
    });
  }
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
  const rawAmount = document.getElementById('inputTxAmount').value.trim();
  
  const cleanDigits = rawAmount.replace(/\D/g, '');
  const amount = parseInt(cleanDigits, 10);

  if (!date) {
    showToastNotification('Please select a transaction date.');
    return;
  }
  if (!desc) {
    showToastNotification('Description cannot be empty.');
    return;
  }
  if (!amount || amount <= 0) {
    showToastNotification('Amount must be greater than 0.');
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
  showToastNotification('Transaction record saved successfully.');
}

function deleteTransactionItem(id) {
  appState.transactions = appState.transactions.filter(t => t.id !== id);
  localStorage.setItem('finlearn_transactions', JSON.stringify(appState.transactions));
  updateSummaryCards();
  renderTransactionsList();
  showToastNotification('Transaction removed.');
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
  statBalance.textContent = (balance < 0 ? '− ' : '') + formatRupiah(balance);
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

  // Sort latest date first
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
      <td style="color: var(--text-muted); font-size: 12px;">${escapeHtml(item.category)}</td>
      <td>
        <span class="badge-tag ${isIncome ? 'badge-income' : 'badge-expense'}">
          ${isIncome ? 'Income' : 'Expense'}
        </span>
      </td>
      <td class="${isIncome ? 'amount-income' : 'amount-expense'}" style="white-space: nowrap; font-weight: 600;">
        ${isIncome ? '+' : '−'} ${formatRupiah(item.amount)}
      </td>
      <td style="text-align: center;">
        <button class="btn-delete-row" onclick="deleteTransactionItem(${item.id})" title="Delete Transaction">
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
    showToastNotification('No transaction data to export.');
    return;
  }

  const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Amount_Rp'];
  const rows = appState.transactions.map(t => [
    t.id,
    t.date,
    t.type === 'income' ? 'Income' : 'Expense',
    `"${(t.category || '').replace(/"/g, '""')}"`,
    `"${(t.desc || '').replace(/"/g, '""')}"`,
    t.amount
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `FinLearn_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link);

  showToastNotification('CSV report downloaded successfully.');
}

/* ===== 6. UTILITY FUNCTIONS ===== */
function formatRupiah(val) {
  return 'Rp ' + Math.abs(val).toLocaleString('en-US');
}

function formatDisplayDate(dateString) {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

/* ===== 6.5. DASHBOARD CONTROLLER ===== */
const CATEGORY_COLORS = [
  '#2563eb', // blue
  '#059669', // emerald
  '#d97706', // amber
  '#dc2626', // red
  '#7c3aed', // purple
  '#0891b2', // cyan
  '#ea580c', // orange
  '#db2777', // pink
  '#4b5563', // gray
  '#65a30d'  // lime
];

function initDashboardPage() {
  updateDashboardGreetingAndDate();
  const metrics = updateDashboardStats();
  renderCashflowChart(metrics.income, metrics.expense);
  renderCategoryBreakdown(appState.transactions);
  renderDashboardLearningProgress();
  renderDashboardRecentTx();
}

function updateDashboardGreetingAndDate() {
  const greetingEl = document.getElementById('dashGreeting');
  const dateStrEl = document.getElementById('currentDateStr');
  const now = new Date();

  // Dynamic Greeting
  const hour = now.getHours();
  let greeting = 'Welcome';
  if (hour >= 4 && hour < 12) greeting = 'Good morning 🌅';
  else if (hour >= 12 && hour < 17) greeting = 'Good afternoon ☀️';
  else if (hour >= 17 && hour < 22) greeting = 'Good evening 🌇';
  else greeting = 'Good night 🌙';

  if (greetingEl) {
    greetingEl.textContent = `${greeting}, to FinLearn`;
  }

  // English Date Format
  if (dateStrEl) {
    const formattedDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    dateStrEl.textContent = formattedDate;
  }
}

function updateDashboardStats() {
  const income = appState.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = appState.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expense;
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const incomeTxCount = appState.transactions.filter(t => t.type === 'income').length;
  const expenseTxCount = appState.transactions.filter(t => t.type === 'expense').length;

  // Stat elements
  const balEl = document.getElementById('dashStatBalance');
  const incEl = document.getElementById('dashStatIncome');
  const expEl = document.getElementById('dashStatExpense');
  const savEl = document.getElementById('dashStatSavings');

  if (balEl) balEl.textContent = (balance < 0 ? '− ' : '') + formatRupiah(balance);
  if (incEl) incEl.textContent = formatRupiah(income);
  if (expEl) expEl.textContent = formatRupiah(expense);
  if (savEl) savEl.textContent = (savingsRate < 0 ? '0%' : `${savingsRate}%`);

  // Subtext
  const balSub = document.getElementById('dashStatBalanceSub');
  const incSub = document.getElementById('dashStatIncomeCount');
  const expSub = document.getElementById('dashStatExpenseCount');
  const savSub = document.getElementById('dashStatSavingsSub');

  if (incSub) incSub.textContent = `${incomeTxCount} income transaction${incomeTxCount === 1 ? '' : 's'}`;
  if (expSub) expSub.textContent = `${expenseTxCount} expense transaction${expenseTxCount === 1 ? '' : 's'}`;

  if (balSub) {
    if (balance > 0) balSub.textContent = 'Positive surplus cashflow';
    else if (balance < 0) balSub.textContent = 'Deficit, spending exceeds income';
    else balSub.textContent = 'Balanced cashflow / no activity';
  }

  if (savSub) {
    if (savingsRate >= 20) savSub.textContent = '✅ Exceeds 50/30/20 target (min. 20%)';
    else if (savingsRate > 0) savSub.textContent = '⚠️ Below recommended 20% target';
    else savSub.textContent = 'Target: min. 20% of net income';
  }

  // Health Status Chip
  const healthChip = document.getElementById('healthChip');
  const healthChipText = document.getElementById('healthChipText');
  if (healthChip && healthChipText) {
    healthChip.classList.remove('status-good', 'status-warning', 'status-danger');
    if (appState.transactions.length === 0) {
      healthChip.classList.add('status-warning');
      healthChipText.textContent = 'New Account';
    } else if (balance < 0) {
      healthChip.classList.add('status-danger');
      healthChipText.textContent = 'Cashflow Deficit';
    } else if (savingsRate >= 20) {
      healthChip.classList.add('status-good');
      healthChipText.textContent = 'Very Healthy';
    } else {
      healthChip.classList.add('status-warning');
      healthChipText.textContent = 'Stable Cashflow';
    }
  }

  // Top spending category
  const expenseMap = {};
  appState.transactions.filter(t => t.type === 'expense').forEach(t => {
    expenseMap[t.category] = (expenseMap[t.category] || 0) + t.amount;
  });
  let topCategory = '-';
  let topAmount = 0;
  for (const [cat, amt] of Object.entries(expenseMap)) {
    if (amt > topAmount) {
      topAmount = amt;
      topCategory = cat;
    }
  }

  return { income, expense, balance, savingsRate, topCategory };
}

function renderCashflowChart(income, expense) {
  const container = document.getElementById('cashflowChartContainer');
  const statusBadge = document.getElementById('cashflowStatusBadge');
  if (!container) return;

  const total = income + expense;
  if (statusBadge) {
    if (income > expense) {
      statusBadge.textContent = 'Net Surplus';
      statusBadge.className = 'badge-pill pill-success';
    } else if (expense > income) {
      statusBadge.textContent = 'Net Deficit';
      statusBadge.className = 'badge-pill pill-danger';
    } else {
      statusBadge.textContent = 'Neutral';
      statusBadge.className = 'badge-pill';
    }
  }

  if (total === 0) {
    container.innerHTML = `
      <div class="chart-empty-state">
        <p>No income & expense records found yet.</p>
        <button class="btn-outline-sm" onclick="handleLoadSampleData()">Load Demo Data</button>
      </div>
    `;
    return;
  }

  const incomePct = Math.round((income / total) * 100);
  const expensePct = Math.round((expense / total) * 100);
  const netAmount = income - expense;

  container.innerHTML = `
    <div class="cashflow-visual-wrapper">
      <!-- Comparative Progress Bar -->
      <div class="cashflow-bar-track">
        <div class="cashflow-bar-income" style="width: ${incomePct}%;" title="Income: ${incomePct}%"></div>
        <div class="cashflow-bar-expense" style="width: ${expensePct}%;" title="Expenses: ${expensePct}%"></div>
      </div>

      <!-- Detail Box Grid -->
      <div class="cashflow-details-grid">
        <div class="cashflow-col inc">
          <div class="cf-badge-row">
            <span class="cf-indicator inc"></span>
            <span class="cf-label">Total Income</span>
          </div>
          <div class="cf-val inc">${formatRupiah(income)}</div>
          <div class="cf-pct">${incomePct}% of total flow</div>
        </div>

        <div class="cashflow-col exp">
          <div class="cf-badge-row">
            <span class="cf-indicator exp"></span>
            <span class="cf-label">Total Expenses</span>
          </div>
          <div class="cf-val exp">${formatRupiah(expense)}</div>
          <div class="cf-pct">${expensePct}% of total flow</div>
        </div>
      </div>

      <!-- Net Result Callout -->
      <div class="cashflow-net-card ${netAmount >= 0 ? 'net-positive' : 'net-negative'}">
        <div class="net-left">
          <span class="net-title">Net Difference:</span>
          <strong>${netAmount >= 0 ? '+' : '−'} ${formatRupiah(netAmount)}</strong>
        </div>
        <div class="net-right">
          ${netAmount >= 0 
            ? '<span>🛡️ Positive cashflow safely secured for savings and investments.</span>' 
            : '<span>⚠️ Expenses exceed income in this recording period.</span>'}
        </div>
      </div>
    </div>
  `;
}

function renderCategoryBreakdown(transactions) {
  const container = document.getElementById('categoryBreakdownContainer');
  const topBadge = document.getElementById('topCategoryBadge');
  if (!container) return;

  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) {
    if (topBadge) topBadge.textContent = 'None';
    container.innerHTML = `
      <div class="chart-empty-state">
        <p>No expense transactions recorded yet.</p>
        <a href="keuangan.html" class="btn-outline-sm">+ Record Expense</a>
      </div>
    `;
    return;
  }

  const categoryMap = {};
  let totalExpense = 0;

  expenses.forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    totalExpense += t.amount;
  });

  const sortedCategories = Object.keys(categoryMap)
    .map((name, idx) => ({
      name,
      amount: categoryMap[name],
      pct: totalExpense > 0 ? (categoryMap[name] / totalExpense) * 100 : 0,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
    }))
    .sort((a, b) => b.amount - a.amount);

  if (topBadge && sortedCategories.length > 0) {
    topBadge.textContent = `Top: ${sortedCategories[0].name} (${Math.round(sortedCategories[0].pct)}%)`;
  }

  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  let currentOffset = 0;

  const svgCircles = sortedCategories.map(cat => {
    const dashLength = (cat.pct / 100) * circumference;
    const circle = `
      <circle
        cx="50" cy="50" r="${radius}"
        fill="transparent"
        stroke="${cat.color}"
        stroke-width="14"
        stroke-dasharray="${dashLength.toFixed(2)} ${circumference.toFixed(2)}"
        stroke-dashoffset="${(-currentOffset).toFixed(2)}"
        class="donut-segment"
      >
        <title>${cat.name}: ${formatRupiah(cat.amount)} (${Math.round(cat.pct)}%)</title>
      </circle>
    `;
    currentOffset += dashLength;
    return circle;
  }).join('');

  const listItems = sortedCategories.map(cat => `
    <div class="category-row-item">
      <div class="category-row-header">
        <div class="cat-left">
          <span class="cat-color-dot" style="background-color: ${cat.color};"></span>
          <span class="cat-name">${escapeHtml(cat.name)}</span>
        </div>
        <div class="cat-right">
          <span class="cat-amount">${formatRupiah(cat.amount)}</span>
          <span class="cat-pct-label">${Math.round(cat.pct)}%</span>
        </div>
      </div>
      <div class="cat-bar-bg">
        <div class="cat-bar-fill" style="width: ${cat.pct}%; background-color: ${cat.color};"></div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="donut-and-list-grid">
      <!-- SVG Donut Chart -->
      <div class="donut-chart-box">
        <svg viewBox="0 0 100 100" class="donut-svg">
          <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="var(--border-soft)" stroke-width="14" />
          ${svgCircles}
        </svg>
        <div class="donut-center-info">
          <span class="donut-center-sub">Total Spent</span>
          <strong class="donut-center-val">${formatRupiah(totalExpense)}</strong>
        </div>
      </div>

      <!-- Categories Ranked List -->
      <div class="category-ranked-list">
        ${listItems}
      </div>
    </div>
  `;
}

function renderDashboardLearningProgress() {
  const total = MODULES_DATA.length;
  const completed = appState.completedModules.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const progressText = document.getElementById('dashLearnProgressText');
  const progressBar = document.getElementById('dashLearnProgressBar');

  if (progressText) progressText.textContent = `${completed} / ${total} Modules Completed (${pct}%)`;
  if (progressBar) progressBar.style.width = `${pct}%`;

  // Find next uncompleted module
  let nextModIndex = 0;
  for (let i = 0; i < total; i++) {
    if (!appState.completedModules.includes(MODULES_DATA[i].id)) {
      nextModIndex = i;
      break;
    }
  }

  const nextMod = MODULES_DATA[nextModIndex] || MODULES_DATA[0];
  const tagEl = document.getElementById('dashNextModTag');
  const titleEl = document.getElementById('dashNextModTitle');
  const descEl = document.getElementById('dashNextModDesc');
  const btnEl = document.getElementById('dashBtnContinueLearn');

  if (tagEl && nextMod) tagEl.textContent = nextMod.tag;
  if (titleEl && nextMod) titleEl.textContent = nextMod.title;
  if (descEl && nextMod) {
    if (completed === total) {
      descEl.textContent = 'Congratulations! You have completed all 12 modules of financial literacy. You can review them anytime.';
    } else {
      descEl.textContent = nextMod.fullTitle || nextMod.title;
    }
  }

  if (btnEl) {
    btnEl.onclick = (e) => {
      e.preventDefault();
      localStorage.setItem('finlearn_active_mod', nextModIndex);
      window.location.href = 'materi.html';
    };
  }

  // Quick Roadmap Chips
  const roadmapContainer = document.getElementById('dashModQuickRoadmap');
  if (roadmapContainer && MODULES_DATA.length > 0) {
    roadmapContainer.innerHTML = MODULES_DATA.slice(0, 6).map((m, idx) => {
      const isDone = appState.completedModules.includes(m.id);
      return `
        <div class="roadmap-chip ${isDone ? 'done' : ''}" onclick="jumpToModule(${idx})" title="${escapeHtml(m.title)}">
          <span class="chip-num">${m.id}</span>
          <span class="chip-name">${escapeHtml(m.title)}</span>
          ${isDone ? '<span class="chip-check">✓</span>' : ''}
        </div>
      `;
    }).join('');
  }
}

function jumpToModule(index) {
  localStorage.setItem('finlearn_active_mod', index);
  window.location.href = 'materi.html';
}

function renderDashboardRecentTx() {
  const tbody = document.getElementById('dashTxTableBody');
  const emptyState = document.getElementById('dashTableEmptyState');
  if (!tbody) return;

  const sorted = [...appState.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const recent = sorted.slice(0, 5);

  tbody.innerHTML = '';
  if (recent.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  recent.forEach(tx => {
    const tr = document.createElement('tr');
    const isIncome = tx.type === 'income';

    tr.innerHTML = `
      <td style="color: var(--text-secondary); white-space: nowrap;">${formatDisplayDate(tx.date)}</td>
      <td><strong>${escapeHtml(tx.desc)}</strong></td>
      <td style="color: var(--text-muted); font-size: 12px;">${escapeHtml(tx.category)}</td>
      <td>
        <span class="badge-tag ${isIncome ? 'badge-income' : 'badge-expense'}">
          ${isIncome ? 'Income' : 'Expense'}
        </span>
      </td>
      <td class="${isIncome ? 'amount-income' : 'amount-expense'}" style="white-space: nowrap; font-weight: 600;">
        ${isIncome ? '+' : '−'} ${formatRupiah(tx.amount)}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function handleResetData() {
  appState.transactions = [];
  appState.completedModules = [];
  localStorage.removeItem('finlearn_transactions');
  localStorage.removeItem('finlearn_completed_mods');
  initDashboardPage();
  showToastNotification('All demo and transaction data has been reset.');
}

function handleLoadSampleData() {
  const sampleTransactions = [
    { id: 101, type: 'income', date: '2026-09-01', category: 'Salary & Wages', desc: 'Primary Monthly Salary', amount: 8500000 },
    { id: 102, type: 'income', date: '2026-09-12', category: 'Business & Freelance', desc: 'Freelance Design & Development Project', amount: 2200000 },
    { id: 103, type: 'expense', date: '2026-09-03', category: 'Bills & Utilities', desc: 'Electricity & High-Speed Internet', amount: 650000 },
    { id: 104, type: 'expense', date: '2026-09-05', category: 'Housing & Supplies', desc: 'Monthly Grocery & Household Supplies', amount: 1850000 },
    { id: 105, type: 'expense', date: '2026-09-08', category: 'Food & Dining', desc: 'Lunch & Weekly Dining Out', amount: 720000 },
    { id: 106, type: 'expense', date: '2026-09-10', category: 'Transportation', desc: 'Fuel & Public Transit Card Reload', amount: 450000 },
    { id: 107, type: 'expense', date: '2026-09-15', category: 'Investasi', desc: 'Mutual Funds & Stock Portfolio', amount: 1500000 },
    { id: 108, type: 'expense', date: '2026-09-18', category: 'Entertainment & Leisure', desc: 'Streaming Subscriptions & Movies', amount: 280000 }
  ];

  appState.transactions = sampleTransactions;
  localStorage.setItem('finlearn_transactions', JSON.stringify(sampleTransactions));

  // Pre-complete 2 sample modules if empty
  if (appState.completedModules.length === 0) {
    appState.completedModules = [1, 2];
    localStorage.setItem('finlearn_completed_mods', JSON.stringify(appState.completedModules));
  }

  initDashboardPage();
  showToastNotification('Demo data loaded successfully! You can explore the visual dashboard.');
}

/* ===== 7. APPLICATION ENTRYPOINT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const pageType = document.body.dataset.page;
  if (pageType === 'dashboard') {
    initDashboardPage();
  } else if (pageType === 'materi') {
    initMateriPage();
  } else if (pageType === 'keuangan') {
    initKeuanganPage();
  }
});
