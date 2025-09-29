// dashboard.js - COMPLETE VERSION WITH FIREBASE + TRADINGVIEW + CHART.JS
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

// Ensure Firebase is initialized in HTML
const db = window.db;
const auth = window.auth;

if (!db || !auth) {
  console.error("Firebase not initialized. Check HTML script.");
  alert("System error. Please refresh the page.");
}

// DOM Elements
const profileNameEl = document.getElementById('profileName');
const balanceAmountEl = document.getElementById('balanceAmount');
const roiEl = document.getElementById('roi');
const activeInvestmentEl = document.getElementById('initialInvestment');
const activeDepositEl = document.getElementById('activeDeposit');
const transactionList = document.getElementById('transactionList');

// Modal elements
const addModal = document.getElementById('addModal');
const withdrawModal = document.getElementById('withdrawModal');
const openAddBtn = document.getElementById('openAddFunds');
const openWithdrawBtn = document.getElementById('openWithdrawFunds');
const closeButtons = document.querySelectorAll('.close-btn');
const confirmAddBtn = document.getElementById('confirmAdd');
const confirmWithdrawBtn = document.getElementById('confirmWithdraw');
const addAmountInput = document.getElementById('addAmount');
const withdrawAmountInput = document.getElementById('withdrawAmount');
const statusAdd = document.getElementById('statusAdd');
const statusWithdraw = document.getElementById('statusWithdraw');

// Wallet config elements
const coinTypeSelect = document.getElementById('coinType');
const networkTypeSelect = document.getElementById('networkType');
const walletAddressDisplay = document.getElementById('walletAddressDisplay');
const qrCodeImage = document.getElementById('qrCodeImage');

// UI Elements
const sidebar = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle");
const hamburgerIcon = document.querySelector("#sidebar-toggle i");
const mainContent = document.getElementById("main-content");
const mobileOverlay = document.getElementById("mobile-overlay");
const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon = document.querySelector("#theme-toggle i");
const profileDropdown = document.getElementById("profile-dropdown");
const dropdownMenu = profileDropdown ? profileDropdown.querySelector(".dropdown-menu") : null;
const dashboardContainer = document.getElementById("dashboard-container");

// Popup container
const popupContainer = document.createElement('div');
popupContainer.id = 'popupContainer';
popupContainer.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  max-width: 300px;
`;
document.body.appendChild(popupContainer);

function showPopup(message, isSuccess = true) {
  const popup = document.createElement('div');
  popup.textContent = message;
  popup.style.cssText = `
    background-color: ${isSuccess ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 100px 20px;
    margin-top: 10px;
    border-radius: 4px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    opacity: 1;
    transition: opacity 0.5s ease-out;
  `;
  popupContainer.prepend(popup);
  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => popup.remove(), 500);
  }, 4000);
}

function formatUSD(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

// Wallet config
let WALLET_CONFIG = {};
async function fetchWalletConfig() {
  try {
    const docSnap = await getDoc(doc(db, "config", "wallet"));
    if (docSnap.exists()) {
      WALLET_CONFIG = docSnap.data();
      updateNetworkOptions();
    }
  } catch (error) {
    console.error("Wallet config error:", error);
  }
}

function updateNetworkOptions() {
  if (!coinTypeSelect || !networkTypeSelect) return;
  const selectedCoin = coinTypeSelect.value;
  const networks = WALLET_CONFIG[selectedCoin];
  networkTypeSelect.innerHTML = '';
  if (networks) {
    for (const network in networks) {
      const option = document.createElement('option');
      option.value = network;
      option.textContent = network;
      networkTypeSelect.appendChild(option);
    }
  }
  updateDepositDisplay();
}

function updateDepositDisplay() {
  if (!walletAddressDisplay || !qrCodeImage) return;
  const selectedCoin = coinTypeSelect?.value || 'USDT';
  const selectedNetwork = networkTypeSelect?.value || 'TRC-20';
  const data = WALLET_CONFIG[selectedCoin]?.[selectedNetwork];
  if (data?.address) {
    walletAddressDisplay.textContent = data.address;
    qrCodeImage.src = data.qr_path || '../assets/placeholder_qr.png';
    qrCodeImage.parentElement.style.display = 'block';
  } else {
    walletAddressDisplay.textContent = 'Configuration not available.';
    qrCodeImage.parentElement.style.display = 'none';
  }
}

// Real-time user data
let userProfile = {};
function listenToUserData() {
  const user = auth.currentUser;
  if (!user) return () => {};
  
  const userDocRef = doc(db, "users", user.uid);
  return onSnapshot(userDocRef, (docSnap) => {
    if (!docSnap.exists()) {
      console.error('User document missing');
      return;
    }

    userProfile = docSnap.data();
    
    // Ban check
    if (userProfile.isBanned === true) {
      window.handleLogout?.();
      return;
    }

    // Update UI
    if (profileNameEl) {
      profileNameEl.textContent = `Welcome, ${userProfile.username || user.email}`;
    }
    if (balanceAmountEl) balanceAmountEl.textContent = formatUSD(userProfile.balance || 0);
    if (roiEl) roiEl.textContent = formatUSD(userProfile.roi || 0);
    if (activeInvestmentEl) activeInvestmentEl.textContent = formatUSD(userProfile.activeTrades || 0);
    if (activeDepositEl) activeDepositEl.textContent = `${userProfile.deposits || 0} active deposits`;
    
  }, (error) => {
    console.error("User data error:", error);
  });
}

// Real-time transactions
let notifiedTransactionIds = new Set();
const userId = auth.currentUser?.uid;
if (userId) {
  const stored = localStorage.getItem(`notifiedTransactions_${userId}`);
  if (stored) {
    try { notifiedTransactionIds = new Set(JSON.parse(stored)); }
    catch (e) { console.error("Notified TX parse error:", e); }
  }
}

function listenToTransactions() {
  if (!userId || !transactionList) return () => {};
  
  const q = query(
    collection(db, "transactions"),
    where("userId", "==", userId),
    limit(20)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const transactions = [];
    querySnapshot.forEach(doc => {
      const tx = { id: doc.id, ...doc.data() };
      transactions.push(tx);

      // Show popups for new statuses
      if (
        (tx.status === 'approved' || tx.status === 'declined') &&
        !notifiedTransactionIds.has(tx.id)
      ) {
        const action = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
        const isSuccess = tx.status === 'approved';
        showPopup(`${action} of ${formatUSD(tx.amount)} was ${isSuccess ? 'approved ✅' : 'declined ❌'}`, isSuccess);
        notifiedTransactionIds.add(tx.id);
        localStorage.setItem(`notifiedTransactions_${userId}`, JSON.stringify([...notifiedTransactionIds]));
      }
    });
    
    // Render transactions
    transactionList.innerHTML = '';
    transactions
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5)
      .forEach(tx => {
        const li = document.createElement('li');
        const date = tx.createdAt?.toDate?.() ? tx.createdAt.toDate().toLocaleString() : 'N/A';
        li.textContent = `${date}: ${tx.type} of ${formatUSD(tx.amount)} — Status: ${tx.status}`;
        transactionList.appendChild(li);
      });
      
  }, (error) => {
    console.error("Transactions error:", error);
  });
}

// Modal functions
function openModal(modal) {
  if (modal) modal.style.display = 'flex';
}

function closeModal(modal) {
  if (modal) {
    modal.style.display = 'none';
    clearStatus();
    clearInputs(modal);
  }
}

function clearStatus() {
  if (statusAdd) statusAdd.textContent = '';
  if (statusWithdraw) statusWithdraw.textContent = '';
}

function clearInputs(modal) {
  if (addAmountInput) addAmountInput.value = '';
  if (withdrawAmountInput) withdrawAmountInput.value = '';
  if (modal === withdrawModal) {
    const walletInput = withdrawModal.querySelector('input[type="text"]');
    if (walletInput) walletInput.value = '';
  }
}

// Deposit handler
if (confirmAddBtn) {
  confirmAddBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (userProfile.isFrozen) {
      statusAdd.textContent = '❌ Transactions are frozen by admin.';
      statusAdd.style.color = 'red';
      return;
    }

    const amount = parseFloat(addAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      statusAdd.textContent = " ! Enter valid amount.";
      statusAdd.style.color = 'red';
      return;
    }

    const coin = coinTypeSelect?.value || 'USDT';
    const network = networkTypeSelect?.value || 'TRC-20';

    statusAdd.textContent = " ⏳ Submitting...";
    statusAdd.style.color = 'black';

    try {
      await addDoc(collection(db, "transactions"), {
        userId: userId,
        type: 'deposit',
        amount: amount,
        coin: coin,
        network: network,
        status: 'pending',
        createdAt: new Date(),
        username: userProfile.username || 'N/A'
      });

      statusAdd.textContent = " ✅ Request submitted!";
      statusAdd.style.color = 'green';
      setTimeout(() => closeModal(addModal), 1500);
      showPopup(`Deposit of ${formatUSD(amount)} submitted.`, true);

    } catch (err) {
      statusAdd.textContent = '❌ ' + err.message;
      statusAdd.style.color = 'red';
    }
  });
}

// Withdraw handler
if (confirmWithdrawBtn) {
  confirmWithdrawBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (userProfile.isFrozen) {
      statusWithdraw.textContent = '❌ Transactions are frozen by admin.';
      statusWithdraw.style.color = 'red';
      return;
    }

    const amount = parseFloat(withdrawAmountInput.value);
    const walletInput = withdrawModal.querySelector('input[type="text"]');
    const walletAddress = walletInput?.value.trim() || '';

    if (!walletAddress) {
      statusWithdraw.textContent = ' ! Enter wallet address';
      statusWithdraw.style.color = 'red';
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      statusWithdraw.textContent = " ! Enter valid amount.";
      statusWithdraw.style.color = 'red';
      return;
    }
    if (amount > (userProfile.balance || 0)) {
      statusWithdraw.textContent = " ! Insufficient balance.";
      statusWithdraw.style.color = 'red';
      return;
    }

    statusWithdraw.textContent = " ⏳ Submitting...";
    statusWithdraw.style.color = 'black';

    try {
      await addDoc(collection(db, "transactions"), {
        userId: userId,
        type: 'withdrawal',
        amount: amount,
        walletAddress: walletAddress,
        status: 'pending',
        createdAt: new Date(),
        username: userProfile.username || 'N/A'
      });

      statusWithdraw.textContent = " ✅ Request submitted!";
      statusWithdraw.style.color = 'green';
      setTimeout(() => closeModal(withdrawModal), 1500);
      showPopup(`Withdrawal of ${formatUSD(amount)} submitted.`, true);

    } catch (err) {
      statusWithdraw.textContent = '❌ ' + err.message;
      statusWithdraw.style.color = 'red';
    }
  });
}

// Modal event listeners
if (openAddBtn && addModal) {
  openAddBtn.addEventListener('click', () => {
    openModal(addModal);
    updateDepositDisplay();
  });
}
if (openWithdrawBtn && withdrawModal) {
  openWithdrawBtn.addEventListener('click', () => openModal(withdrawModal));
}
closeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-modal');
    const modal = document.getElementById(modalId);
    closeModal(modal);
  });
});
[addModal, withdrawModal].forEach(modal => {
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  }
});

// ====================================================================
// === TRADINGVIEW WIDGET (WITH THEME SUPPORT) ===
// ====================================================================
function initTradingView() {
  const container = document.getElementById("tradingview_eurusd");
  if (!container) return;

  const isDarkMode = document.body.classList.contains("dark-mode");
  const theme = isDarkMode ? "dark" : "light";

  // Clear previous widget
  container.innerHTML = '';

  // Load TradingView script
  let script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/tv.js';
  script.onload = () => {
    if (window.TradingView) {
      new window.TradingView.widget({
        container_id: "tradingview_eurusd",
        autosize: true,
        symbol: "FX:EURUSD",
        interval: "D",
        theme: theme,
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        studies: [],
        width: "100%",
        height: 400
      });
    }
  };
  document.head.appendChild(script);
}

// ====================================================================
// === CHART.JS ANALYTICS CHART ===
// ====================================================================
function initChart() {
  const ctx = document.getElementById('analyticsChart')?.getContext('2d');
  if (!ctx) return;

  // Destroy existing chart if any
  if (window.dashboardChart) {
    window.dashboardChart.destroy();
  }

  window.dashboardChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [{
        label: 'Portfolio Value',
        data: [3000, 2200, 2700, 1800, 1900, 2500, 4000, 3200, 1600, 3722, 2900, 3500],
        borderColor: '#dc691e',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
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
          grid: {
            color: '#eee'
          }
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
        legend: {
          labels: {
            color: '#555',
          }
        }
      }
    }
  });
}

// ====================================================================
// === UI EVENT LISTENERS (SIDEBAR, THEME, PROFILE) ===
// ====================================================================
function initUI() {
  // Theme toggle
  if (themeToggleBtn && themeIcon) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark-mode') {
      document.body.classList.add('dark-mode');
      themeIcon.classList.replace("fa-moon", "fa-sun");
    }

    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      if (document.body.classList.contains("dark-mode")) {
        themeIcon.classList.replace("fa-moon", "fa-sun");
        localStorage.setItem('theme', 'dark-mode');
      } else {
        themeIcon.classList.replace("fa-sun", "fa-moon");
        localStorage.setItem('theme', 'light-mode');
      }
      // Reload TradingView with new theme
      setTimeout(initTradingView, 300);
    });
  }

  // Sidebar toggle
  if (sidebar && sidebarToggleBtn && mainContent && mobileOverlay && hamburgerIcon) {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const toggleSidebar = () => {
      if (mediaQuery.matches) {
        sidebar.classList.toggle("open");
        mainContent.classList.toggle("pushed-mobile");
        mobileOverlay.classList.toggle("visible");
        sidebarToggleBtn.classList.toggle("is-active");
      } else if (dashboardContainer) {
        dashboardContainer.classList.toggle("sidebar-collapsed");
        sidebarToggleBtn.classList.toggle("is-active");
      }

      if (hamburgerIcon.classList.contains("fa-bars")) {
        hamburgerIcon.classList.replace("fa-bars", "fa-times");
      } else {
        hamburgerIcon.classList.replace("fa-times", "fa-bars");
      }
    };

    sidebarToggleBtn.addEventListener("click", toggleSidebar);
    if (mobileOverlay) mobileOverlay.addEventListener("click", toggleSidebar);

    const setInitialSidebarState = () => {
      if (mediaQuery.matches) {
        sidebar.classList.remove("open");
        mainContent.classList.remove("pushed-mobile");
        if (mobileOverlay) mobileOverlay.classList.remove("visible");
      }
      if (dashboardContainer) dashboardContainer.classList.remove("sidebar-collapsed");
      hamburgerIcon.classList.remove("fa-times");
      hamburgerIcon.classList.add("fa-bars");
      sidebarToggleBtn.classList.remove("is-active");
    };

    setInitialSidebarState();
    mediaQuery.addEventListener("change", setInitialSidebarState);
  }

  // Profile dropdown
  if (profileDropdown && dropdownMenu) {
    profileDropdown.addEventListener("click", (e) => {
      dropdownMenu.classList.toggle("hidden");
      e.stopPropagation();
    });

    document.addEventListener("click", (e) => {
      if (!profileDropdown.contains(e.target)) {
        dropdownMenu.classList.add("hidden");
      }
    });
  }
}

// ====================================================================
// === INITIALIZE DASHBOARD ===
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Initialize UI first
  initUI();
  
  // Initialize widgets
  initTradingView();
  initChart();
  
  // Fetch wallet config once
  fetchWalletConfig();
  
  // Start real-time listeners
  const unsubscribeUser = listenToUserData();
  const unsubscribeTransactions = listenToTransactions();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    unsubscribeUser?.();
    unsubscribeTransactions?.();
  });
});