// dashboard.js - FIXED VERSION with robust wallet config handling
// Requirements:
//  - Make sure Firebase is initialized and exposes `window.db` (Firestore) and `window.auth` (Auth)
//  - Load this file as a module and after Firebase initialization (or use defer and initialize firebase earlier)

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

//////////////////////
// Helper utilities //
//////////////////////
function showPopup(message, isSuccess = true) {
  if (!document.body) return;
  let popupContainer = document.getElementById('popupContainer');
  if (!popupContainer) {
    popupContainer = document.createElement('div');
    popupContainer.id = 'popupContainer';
    popupContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 320px;
    `;
    document.body.appendChild(popupContainer);
  }

  const popup = document.createElement('div');
  popup.textContent = message;
  popup.style.cssText = `
    background-color: ${isSuccess ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 10px 16px;
    margin-top: 10px;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    opacity: 1;
    transition: opacity 0.5s ease-out;
  `;
  popupContainer.prepend(popup);
  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 500);
  }, 3600);
}

function formatUSD(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

//////////////////////
// Application state //
//////////////////////
let db = null;
let auth = null;
let userProfile = {};
let currentUserId = null;
let notifiedTransactionIds = new Set();
let WALLET_CONFIG = {};

///////////////////////////
// DOM references holder //
///////////////////////////
const DOM = {}; // we'll populate inside DOMContentLoaded

/////////////////////////////////////////
// Firestore / wallet config functions //
/////////////////////////////////////////

// --- Utility: normalize a key for tolerant matching ---
function normalizeKey(k) {
  if (!k && k !== '') return '';
  return String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
}
function findCoinKey(walletConfig, coinRequested) {
  if (!walletConfig || typeof walletConfig !== 'object') return null;
  if (coinRequested && walletConfig[coinRequested]) return coinRequested; // exact
  const normReq = normalizeKey(coinRequested);
  for (const key of Object.keys(walletConfig)) {
    if (normalizeKey(key) === normReq) return key;
  }
  return Object.keys(walletConfig)[0] || null;
}
function findNetworkKey(networksObj, networkRequested) {
  if (!networksObj || typeof networksObj !== 'object') return null;
  if (networkRequested && networksObj[networkRequested]) return networkRequested;
  const normReq = normalizeKey(networkRequested);
  for (const key of Object.keys(networksObj)) {
    if (normalizeKey(key) === normReq) return key;
  }
  return Object.keys(networksObj)[0] || null;
}

// Fetch wallet config from Firestore
async function fetchWalletConfig() {
  if (!db) return;
  try {
    const docRef = doc(db, "config", "wallet");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists && docSnap.exists()) {
      WALLET_CONFIG = docSnap.data() || {};
      console.debug("Wallet config loaded:", WALLET_CONFIG);
      updateNetworkOptions();
    } else {
      WALLET_CONFIG = {};
      console.warn("Wallet config not found.");
      updateNetworkOptions();
    }
  } catch (error) {
    console.error("Wallet config error:", error);
  }
}

function updateNetworkOptions() {
  const coinTypeSelect = DOM.coinType;
  const networkTypeSelect = DOM.networkType;
  const walletAddressDisplay = DOM.walletAddressDisplay;
  const qrCodeImage = DOM.qrCodeImage;
  if (!coinTypeSelect || !networkTypeSelect) {
    console.error("updateNetworkOptions: missing coinType or networkType element");
    return;
  }

  networkTypeSelect.innerHTML = '';

  const coinKeys = Object.keys(WALLET_CONFIG || {});
  if (coinKeys.length === 0) {
    coinTypeSelect.innerHTML = '<option value="">-- No coins configured --</option>';
    if (walletAddressDisplay) walletAddressDisplay.textContent = 'No configuration';
    if (qrCodeImage?.parentElement) qrCodeImage.parentElement.style.display = 'none';
    return;
  }

  // rebuild coin options
  const prevCoin = coinTypeSelect.value;
  const matchedCoinKey = findCoinKey(WALLET_CONFIG, prevCoin) || coinKeys[0];
  coinTypeSelect.innerHTML = '';
  coinKeys.forEach(ck => {
    const opt = document.createElement('option');
    opt.value = ck;
    opt.textContent = ck;
    coinTypeSelect.appendChild(opt);
  });
  coinTypeSelect.value = matchedCoinKey;

  const networksObj = WALLET_CONFIG[matchedCoinKey] || {};
  const networkKeys = Object.keys(networksObj);
  if (networkKeys.length === 0) {
    networkTypeSelect.innerHTML = '<option value="">-- No networks --</option>';
    if (walletAddressDisplay) walletAddressDisplay.textContent = 'Configuration not available.';
    if (qrCodeImage?.parentElement) qrCodeImage.parentElement.style.display = 'none';
    return;
  }

  const prevNetwork = networkTypeSelect.value;
  const matchedNetworkKey = findNetworkKey(networksObj, prevNetwork) || networkKeys[0];
  networkKeys.forEach(nk => {
    const opt = document.createElement('option');
    opt.value = nk;
    opt.textContent = nk;
    networkTypeSelect.appendChild(opt);
  });
  networkTypeSelect.value = matchedNetworkKey;

  updateDepositDisplay();
}

function updateDepositDisplay() {
  const walletAddressDisplay = DOM.walletAddressDisplay;
  const qrCodeImage = DOM.qrCodeImage;
  const coinTypeSelect = DOM.coinType;
  const networkTypeSelect = DOM.networkType;
  if (!walletAddressDisplay || !qrCodeImage) {
    console.error("updateDepositDisplay: missing DOM elements");
    return;
  }

  const selectedCoin = coinTypeSelect?.value || '';
  const selectedNetwork = networkTypeSelect?.value || '';
  const coinKey = findCoinKey(WALLET_CONFIG, selectedCoin);
  const networkKey = coinKey ? findNetworkKey(WALLET_CONFIG[coinKey], selectedNetwork) : null;
  const data = (coinKey && networkKey) ? (WALLET_CONFIG[coinKey]?.[networkKey]) : null;

  console.debug("updateDepositDisplay:", { selectedCoin, coinKey, selectedNetwork, networkKey, data });

  if (data && data.address) {
    walletAddressDisplay.textContent = data.address;
    if (data.qr_path) {
      qrCodeImage.src = data.qr_path;
      if (qrCodeImage.parentElement) qrCodeImage.parentElement.style.display = '';
    } else if (qrCodeImage.parentElement) {
      qrCodeImage.parentElement.style.display = 'none';
    }
  } else {
    walletAddressDisplay.textContent = 'Configuration not available.';
    if (qrCodeImage.parentElement) qrCodeImage.parentElement.style.display = 'none';
  }
}

///////////////////////////////
// Real-time Firestore - user //
///////////////////////////////
function startUserListener(uid) {
  if (!db || !uid) return () => {};
  const userDocRef = doc(db, "users", uid);
  return onSnapshot(userDocRef, (docSnap) => {
    if (!docSnap.exists()) {
      console.error('User document missing');
      return;
    }
    userProfile = docSnap.data() || {};

    // Ban check
    if (userProfile.isBanned === true) {
      window.handleLogout?.();
      return;
    }

    // Update UI safely
    if (DOM.profileName) {
      const displayName = userProfile.username || (auth?.currentUser?.email) || 'User';
      DOM.profileName.textContent = `Welcome, ${displayName}`;
    }
    if (DOM.balanceAmount) DOM.balanceAmount.textContent = formatUSD(userProfile.balance);
    if (DOM.roi) DOM.roi.textContent = formatUSD(userProfile.roi);
    if (DOM.initialInvestment) DOM.initialInvestment.textContent = formatUSD(userProfile.activeTrades);
    if (DOM.activeDeposit) DOM.activeDeposit.textContent = `${userProfile.deposits || 0} active deposits`;
  }, (error) => {
    console.error("User data error:", error);
  });
}

/////////////////////////////////////
// Real-time Firestore - transactions
/////////////////////////////////////
function startTransactionsListener(uid) {
  if (!db || !uid || !DOM.transactionList) return () => {};
  // restore notified IDs from localStorage
  try {
    const stored = localStorage.getItem(`notifiedTransactions_${uid}`);
    if (stored) notifiedTransactionIds = new Set(JSON.parse(stored));
  } catch (e) {
    console.error("Notified TX parse error:", e);
  }

  const q = query(
    collection(db, "transactions"),
    where("userId", "==", uid),
    limit(20)
  );

  return onSnapshot(q, (querySnapshot) => {
    const transactions = [];
    querySnapshot.forEach(d => {
      transactions.push({ id: d.id, ...(d.data() || {}) });
    });

    // notify approved/declined txs not yet seen
    transactions.forEach(tx => {
      if (
        (tx.status === 'approved' || tx.status === 'declined') &&
        !notifiedTransactionIds.has(tx.id)
      ) {
        const action = (tx.type || '').charAt(0).toUpperCase() + (tx.type || '').slice(1);
        const isSuccess = tx.status === 'approved';
        showPopup(`${action} of ${formatUSD(tx.amount)} was ${isSuccess ? 'approved ✅' : 'declined ❌'}`, isSuccess);
        notifiedTransactionIds.add(tx.id);
        localStorage.setItem(`notifiedTransactions_${uid}`, JSON.stringify([...notifiedTransactionIds]));
      }
    });

    // render latest 5 sorted by createdAt (best-effort)
    DOM.transactionList.innerHTML = '';
    transactions
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return bTime - aTime;
      })
      .slice(0, 5)
      .forEach(tx => {
        const li = document.createElement('li');
        const date = tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : (tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A');
        li.textContent = `${date}: ${tx.type} of ${formatUSD(tx.amount)} — Status: ${tx.status || 'N/A'}`;
        DOM.transactionList.appendChild(li);
      });
  }, (error) => {
    console.error("Transactions error:", error);
  });
}

/////////////////
// Modal logic //
/////////////////
function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
}

function closeModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
  clearStatus();
  clearInputs(modal);
}

function clearStatus() {
  if (DOM.statusAdd) DOM.statusAdd.textContent = '';
  if (DOM.statusWithdraw) DOM.statusWithdraw.textContent = '';
}

function clearInputs(modal) {
  if (DOM.addAmount) DOM.addAmount.value = '';
  if (DOM.withdrawAmount) DOM.withdrawAmount.value = '';
  if (modal === DOM.withdrawModal) {
    const walletInput = DOM.withdrawModal.querySelector('input[type="text"]');
    if (walletInput) walletInput.value = '';
  }
}

/////////////////////////
// Deposit / Withdraw //
/////////////////////////
async function handleDepositSubmit(e) {
  e?.preventDefault?.();
  if (!auth) return alert("Auth not ready");
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("Session expired. Please log in again.");
    return;
  }

  if (userProfile.isFrozen) {
    if (DOM.statusAdd) {
      DOM.statusAdd.textContent = '❌ Transactions are frozen by admin.';
      DOM.statusAdd.style.color = 'red';
    }
    return;
  }

  const amount = parseFloat(DOM.addAmount.value);
  if (isNaN(amount) || amount <= 0) {
    if (DOM.statusAdd) { DOM.statusAdd.textContent = " ! Enter valid amount."; DOM.statusAdd.style.color = 'red'; }
    return;
  }

  if (DOM.statusAdd) { DOM.statusAdd.textContent = " ⏳ Submitting..."; DOM.statusAdd.style.color = 'black'; }

  try {
    await addDoc(collection(db, "transactions"), {
      userId: currentUser.uid,
      type: 'deposit',
      amount: amount,
      status: 'pending',
      createdAt: new Date()
    });
    if (DOM.statusAdd) { DOM.statusAdd.textContent = " ✅ Request submitted!"; DOM.statusAdd.style.color = 'green'; }
    setTimeout(() => closeModal(DOM.addModal), 1200);
    showPopup(`Deposit of ${formatUSD(amount)} submitted.`, true);
  } catch (err) {
    console.error("Deposit error:", err);
    if (DOM.statusAdd) { DOM.statusAdd.textContent = '❌ ' + (err.message || 'Submission failed'); DOM.statusAdd.style.color = 'red'; }
  }
}

async function handleWithdrawSubmit(e) {
  e?.preventDefault?.();
  if (!auth) return alert("Auth not ready");
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("Session expired. Please log in again.");
    return;
  }

  if (userProfile.isFrozen) {
    if (DOM.statusWithdraw) { DOM.statusWithdraw.textContent = '❌ Transactions are frozen by admin.'; DOM.statusWithdraw.style.color = 'red'; }
    return;
  }

  const amount = parseFloat(DOM.withdrawAmount.value);
  const walletInput = DOM.withdrawModal.querySelector('input[type="text"]');
  const walletAddress = walletInput?.value.trim() || '';

  if (!walletAddress) {
    if (DOM.statusWithdraw) { DOM.statusWithdraw.textContent = ' ! Enter wallet address'; DOM.statusWithdraw.style.color = 'red'; }
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    if (DOM.statusWithdraw) { DOM.statusWithdraw.textContent = " ! Enter valid amount."; DOM.statusWithdraw.style.color = 'red'; }
    return;
  }
  if (amount > (userProfile.balance || 0)) {
    if (DOM.statusWithdraw) { DOM.statusWithdraw.textContent = " ! Insufficient balance."; DOM.statusWithdraw.style.color = 'red'; }
    return;
  }

  if (DOM.statusWithdraw) { DOM.statusWithdraw.textContent = " ⏳ Submitting..."; DOM.statusWithdraw.style.color = 'black'; }

  try {
    await addDoc(collection(db, "transactions"), {
      userId: currentUser.uid,
      type: 'withdrawal',
      amount: amount,
      walletAddress: walletAddress,
      status: 'pending',
      createdAt: new Date()
    });
    if (DOM.statusWithdraw) { DOM.statusWithdraw.textContent = " ✅ Request submitted!"; DOM.statusWithdraw.style.color = 'green'; }
    setTimeout(() => closeModal(DOM.withdrawModal), 1200);
    showPopup(`Withdrawal of ${formatUSD(amount)} submitted.`, true);
  } catch (err) {
    console.error("Withdraw error:", err);
    if (DOM.statusWithdraw) { DOM.statusWithdraw.textContent = '❌ ' + (err.message || 'Submission failed'); DOM.statusWithdraw.style.color = 'red'; }
  }
}

//////////////////////
// TradingView init //
//////////////////////
function initTradingView() {
  const container = document.getElementById("tradingview_eurusd");
  if (!container) return;

  const isDarkMode = document.body.classList.contains("dark-mode");
  const theme = isDarkMode ? "dark" : "light";

  container.innerHTML = '';

  // remove any previous script from head with this src to avoid duplicates (best-effort)
  const existing = Array.from(document.querySelectorAll('script[src]')).find(s => s.src && s.src.includes('s3.tradingview.com/tv.js'));
  if (!existing) {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.onload = () => {
      if (window.TradingView) {
        try {
          new window.TradingView.widget({
            container_id: "tradingview_eurusd",
            autosize: true,
            symbol: "FX:EURUSD",
            interval: "D",
            theme: theme,
            style: "1",
            locale: "en",
            width: "100%",
            height: 400
          });
        } catch (e) {
          console.warn("TradingView widget init failed:", e);
        }
      }
    };
    document.head.appendChild(script);
  } else {
    // re-init via existing lib
    if (window.TradingView) {
      try {
        new window.TradingView.widget({
          container_id: "tradingview_eurusd",
          autosize: true,
          symbol: "FX:EURUSD",
          interval: "D",
          theme: theme,
          style: "1",
          locale: "en",
          width: "100%",
          height: 400
        });
      } catch (e) {
        console.warn("TradingView widget re-init failed:", e);
      }
    }
  }
}

////////////////////
// Chart.js init //
////////////////////
function initChart() {
  const canvas = document.getElementById('analyticsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (window.dashboardChart) {
    try { window.dashboardChart.destroy(); } catch (e) { /* ignore */ }
  }

  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dataPoints = [3000, 2200, 2700, 1800, 1900, 2500, 4000, 3200, 1600, 3722, 2900, 3500];

  window.dashboardChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Portfolio Value',
        data: dataPoints,
        borderColor: '#dc691e',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: value => `$${value / 1000}K`,
            color: '#999'
          },
          grid: { color: '#eee' }
        },
        x: {
          ticks: { color: '#888' },
          grid: { display: false }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              return `Value: $${val.toLocaleString()}`;
            }
          }
        },
        legend: { labels: { color: '#555' } }
      }
    }
  });
}

///////////////
// UI / events
///////////////
function initUI() {
  // Theme toggle
  if (DOM.themeToggle && DOM.themeIcon) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark-mode') {
      document.body.classList.add('dark-mode');
      DOM.themeIcon.classList.replace("fa-moon", "fa-sun");
    }

    DOM.themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      if (document.body.classList.contains("dark-mode")) {
        DOM.themeIcon.classList.replace("fa-moon", "fa-sun");
        localStorage.setItem('theme', 'dark-mode');
      } else {
        DOM.themeIcon.classList.replace("fa-sun", "fa-moon");
        localStorage.setItem('theme', 'light-mode');
      }
      // small timeout to let CSS repaint before reinit TradingView
      setTimeout(initTradingView, 300);
    });
  }

  // Sidebar toggle
  if (DOM.sidebar && DOM.sidebarToggle && DOM.mainContent && DOM.mobileOverlay && DOM.hamburgerIcon) {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const toggleSidebar = () => {
      if (mediaQuery.matches) {
        DOM.sidebar.classList.toggle("open");
        DOM.mainContent.classList.toggle("pushed-mobile");
        if (DOM.mobileOverlay) DOM.mobileOverlay.classList.toggle("visible");
        DOM.sidebarToggle.classList.toggle("is-active");
      } else if (DOM.dashboardContainer) {
        DOM.dashboardContainer.classList.toggle("sidebar-collapsed");
        DOM.sidebarToggle.classList.toggle("is-active");
      }

      if (DOM.hamburgerIcon.classList.contains("fa-bars")) {
        DOM.hamburgerIcon.classList.replace("fa-bars", "fa-times");
      } else {
        DOM.hamburgerIcon.classList.replace("fa-times", "fa-bars");
      }
    };

    DOM.sidebarToggle.addEventListener("click", toggleSidebar);
    if (DOM.mobileOverlay) DOM.mobileOverlay.addEventListener("click", toggleSidebar);

    const setInitialSidebarState = () => {
      if (mediaQuery.matches) {
        DOM.sidebar.classList.remove("open");
        DOM.mainContent.classList.remove("pushed-mobile");
        if (DOM.mobileOverlay) DOM.mobileOverlay.classList.remove("visible");
      }
      if (DOM.dashboardContainer) DOM.dashboardContainer.classList.remove("sidebar-collapsed");
      DOM.hamburgerIcon.classList.remove("fa-times");
      DOM.hamburgerIcon.classList.add("fa-bars");
      DOM.sidebarToggle.classList.remove("is-active");
    };

    setInitialSidebarState();
    mediaQuery.addEventListener("change", setInitialSidebarState);
  }

  // Profile dropdown
  if (DOM.profileDropdown && DOM.dropdownMenu) {
    DOM.profileDropdown.addEventListener("click", (e) => {
      DOM.dropdownMenu.classList.toggle("hidden");
      e.stopPropagation();
    });

    document.addEventListener("click", (e) => {
      if (!DOM.profileDropdown.contains(e.target)) {
        DOM.dropdownMenu.classList.add("hidden");
      }
    });
  }
}

/////////////////////
// Wire up handlers
/////////////////////
function wireModalButtons() {
  if (DOM.openAddBtn && DOM.addModal) {
    DOM.openAddBtn.addEventListener('click', () => {
      openModal(DOM.addModal);
      updateDepositDisplay();
    });
  }
  if (DOM.openWithdrawBtn && DOM.withdrawModal) {
    DOM.openWithdrawBtn.addEventListener('click', () => openModal(DOM.withdrawModal));
  }

  DOM.closeButtons?.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      const modal = document.getElementById(modalId);
      closeModal(modal);
    });
  });

  [DOM.addModal, DOM.withdrawModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    }
  });

  if (DOM.confirmAdd) DOM.confirmAdd.addEventListener('click', handleDepositSubmit);
  if (DOM.confirmWithdraw) DOM.confirmWithdraw.addEventListener('click', handleWithdrawSubmit);

  // Wire coin/network selects to update display
  if (DOM.coinType) DOM.coinType.addEventListener('change', updateNetworkOptions);
  if (DOM.networkType) DOM.networkType.addEventListener('change', updateDepositDisplay);
}

//////////////////////////
// App initialization //
//////////////////////////
document.addEventListener("DOMContentLoaded", () => {
  // Ensure firebase objects are available on window
  db = window.db;
  auth = window.auth;

  if (!db || !auth) {
    console.error("Firebase not initialized. Check HTML script (window.db/window.auth).");
    alert("System error. Please refresh the page.");
    return;
  }

  // Query DOM once DOM is ready (prevents null refs)
  DOM.profileName = document.getElementById('profileName');
  DOM.balanceAmount = document.getElementById('balanceAmount');
  DOM.roi = document.getElementById('roi');
  DOM.initialInvestment = document.getElementById('initialInvestment');
  DOM.activeDeposit = document.getElementById('activeDeposit');
  DOM.transactionList = document.getElementById('transactionList');

  DOM.addModal = document.getElementById('addModal');
  DOM.withdrawModal = document.getElementById('withdrawModal');
  DOM.openAddBtn = document.getElementById('openAddFunds');
  DOM.openWithdrawBtn = document.getElementById('openWithdrawFunds');
  DOM.closeButtons = document.querySelectorAll('.close-btn');
  DOM.confirmAdd = document.getElementById('confirmAdd');
  DOM.confirmWithdraw = document.getElementById('confirmWithdraw');
  DOM.addAmount = document.getElementById('addAmount');
  DOM.withdrawAmount = document.getElementById('withdrawAmount');
  DOM.statusAdd = document.getElementById('statusAdd');
  DOM.statusWithdraw = document.getElementById('statusWithdraw');

  DOM.coinType = document.getElementById('coinType');
  DOM.networkType = document.getElementById('networkType');
  DOM.walletAddressDisplay = document.getElementById('walletAddressDisplay');
  DOM.qrCodeImage = document.getElementById('qrCodeImage');

  DOM.sidebar = document.getElementById("sidebar");
  DOM.sidebarToggle = document.getElementById("sidebar-toggle");
  DOM.hamburgerIcon = document.querySelector("#sidebar-toggle i");
  DOM.mainContent = document.getElementById("main-content");
  DOM.mobileOverlay = document.getElementById("mobile-overlay");
  DOM.themeToggle = document.getElementById("theme-toggle");
  DOM.themeIcon = document.querySelector("#theme-toggle i");
  DOM.profileDropdown = document.getElementById("profile-dropdown");
  DOM.dropdownMenu = DOM.profileDropdown ? DOM.profileDropdown.querySelector(".dropdown-menu") : null;
  DOM.dashboardContainer = document.getElementById("dashboard-container");

  // create popup container
  showPopup("Dashboard loaded (debug) — popup system active", true);

  initUI();
  initTradingView();
  initChart();
  fetchWalletConfig();
  wireModalButtons();

  // Only start listeners once auth state is known
  let unsubUser = null, unsubTx = null;
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUserId = user.uid;
      // start realtime listeners
      unsubUser = startUserListener(currentUserId);
      unsubTx = startTransactionsListener(currentUserId);
    } else {
      // cleanup if logged out
      currentUserId = null;
      userProfile = {};
      if (unsubUser) unsubUser();
      if (unsubTx) unsubTx();
    }
  });

  window.addEventListener('beforeunload', () => {
    if (unsubUser) unsubUser();
    if (unsubTx) unsubTx();
  });
});