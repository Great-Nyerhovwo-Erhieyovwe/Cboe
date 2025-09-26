document.addEventListener("DOMContentLoaded", () => {

  // ===== LOGIN VALIDATION =====
  const isUser = sessionStorage.getItem('isUser');
  const userData = sessionStorage.getItem('user');

  if (!isUser || !userData) {
    window.location.href = "../login/login.html";
    return;
  }

  const user = JSON.parse(userData);

  // Optional: Show user name
  const profileNameEl = document.getElementById('profileName');
  if (profileNameEl && user.fullName) {
    profileNameEl.textContent = `Welcome, ${user.username}`;
  }

  // API URLs
  // const API_BASE = "http://localhost:5500";
  const API_BASE = "https://cboejsonserver.onrender.com/api"; // ✅ FIXED: Removed trailing spaces
  const API_USERS = `${API_BASE}/users`;
  const API_TRANSACTIONS = `${API_BASE}/transactions`;

  // --- DOM Elements ---
  // ✅ SAFETY: Only get elements that exist on current page
  const dashboardContainer = document.getElementById("dashboard-container");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggleBtn = document.getElementById("sidebar-toggle");
  const hamburgerIcon = sidebarToggleBtn ? sidebarToggleBtn.querySelector("i") : null; // ✅ FIXED: Check if btn exists
  const mainContent = document.getElementById("main-content");
  const mobileOverlay = document.getElementById("mobile-overlay");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector("i") : null; // ✅ FIXED: Check if btn exists
  const profileDropdown = document.getElementById("profile-dropdown");
  const dropdownMenu = profileDropdown ? profileDropdown.querySelector(".dropdown-menu") : null; // ✅ FIXED

  const balanceAmountEl = document.getElementById('balanceAmount');
  const roiEl = document.getElementById('roi');
  const activeDepositEl = document.getElementById('activeDeposit');
  const transactionList = document.getElementById('transactionList');

  // Elements for modals
  const addModal = document.getElementById('addModal');
  const withdrawModal = document.getElementById('withdrawModal');

  const openAddBtn = document.getElementById('openAddFunds'); // your button to open add funds modal
  const openWithdrawBtn = document.getElementById('openWithdrawFunds'); // your button to open withdraw modal

  const closeButtons = document.querySelectorAll('.close-btn');

  const confirmAddBtn = document.getElementById('confirmAdd');
  const confirmWithdrawBtn = document.getElementById('confirmWithdraw');

  const addAmountInput = document.getElementById('addAmount');
  const withdrawAmountInput = document.getElementById('withdrawAmount');

  const statusAdd = document.getElementById('statusAdd');
  const statusWithdraw = document.getElementById('statusWithdraw');

  // Helper function to open modal
  function openModal(modal) {
    if (modal) modal.style.display = 'flex'; // ✅ FIXED: Check if modal exists
  }

  // Helper function to close modal
  function closeModal(modal) {
    if (modal) { // ✅ FIXED: Check if modal exists
      modal.style.display = 'none';
      clearStatus();
      clearInputs();
    }
  }

  // Clear status messages
  function clearStatus() {
    if (statusAdd) statusAdd.textContent = ''; // ✅ FIXED: Check before use
    if (statusWithdraw) statusWithdraw.textContent = '';
  }

  // Clear inputs
  function clearInputs() {
    if (addAmountInput) addAmountInput.value = ''; // ✅ FIXED: Check before use
    if (withdrawAmountInput) withdrawAmountInput.value = '';
    if (withdrawModal) {
      const walletInput = withdrawModal.querySelector('input[type="text"]');
      if (walletInput) walletInput.value = '';
    }
  }

  // Open modals on button clicks
  if (openAddBtn && addModal) { // ✅ FIXED: Only add listener if both exist
    openAddBtn.addEventListener('click', () => openModal(addModal));
  }
  if (openWithdrawBtn && withdrawModal) {
    openWithdrawBtn.addEventListener('click', () => openModal(withdrawModal));
  }

  // Close modals on close button clicks
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      const modal = document.getElementById(modalId);
      closeModal(modal);
    });
  });

  // Close modal if clicking outside modal content
  [addModal, withdrawModal].forEach(modal => {
    if (modal) { // ✅ FIXED: Check if modal exists
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    }
  });

  // Confirm Add Funds
  if (confirmAddBtn) { // ✅ FIXED: Only add listener if button exists
    confirmAddBtn.addEventListener('click', () => {
      const amount = parseFloat(addAmountInput.value);
      if (isNaN(amount) || amount <= 0) {
        if (statusAdd) statusAdd.textContent = 'Please enter a valid amount'; // ✅ FIXED
        if (statusAdd) statusAdd.style.color = 'red';
        return;
      }
      if (statusAdd) {
        statusAdd.textContent = 'Processing...';
        statusAdd.style.color = 'black';
      }

      // Simulating async operation:
      setTimeout(() => {
        if (statusAdd) {
          statusAdd.textContent = `Successfully added $${amount.toFixed(2)}!`;
          statusAdd.style.color = 'green';
        }
      }, 1500);
    });
  }

  // Confirm Withdraw Funds
  if (confirmWithdrawBtn) { // ✅ FIXED: Only add listener if button exists
    confirmWithdrawBtn.addEventListener('click', () => {
      const amount = parseFloat(withdrawAmountInput.value);
      const walletAddress = withdrawModal ? withdrawModal.querySelector('input[type="text"]').value.trim() : '';
      if (!walletAddress) {
        if (statusWithdraw) {
          statusWithdraw.textContent = 'Please enter your wallet address';
          statusWithdraw.style.color = 'red';
        }
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        if (statusWithdraw) {
          statusWithdraw.textContent = 'Please enter a valid amount';
          statusWithdraw.style.color = 'red';
        }
        return;
      }
      if (statusWithdraw) {
        statusWithdraw.textContent = 'Processing...';
        statusWithdraw.style.color = 'black';
      }

      setTimeout(() => {
        if (statusWithdraw) {
          statusWithdraw.textContent = `Successfully withdrew $${amount.toFixed(2)}!`;
          statusWithdraw.style.color = 'green';
        }
      }, 1500);
    });
  }

  // Variables to store user data locally until fetched
  let balance = 0;
  let roi = 0;
  let deposits = 0;

  // Format money nicely
  function formatUSD(amount) {
    return `$${amount.toFixed(2)}`;
  }

  // Display balance, roi, deposits
  function updateDashboard() {
    if (balanceAmountEl) balanceAmountEl.textContent = formatUSD(balance); // ✅ FIXED: Check before use
    if (roiEl) roiEl.textContent = formatUSD(roi);
    if (activeDepositEl) activeDepositEl.textContent = `${deposits} active deposits`;
  }

  // Clear and populate transaction list from array of transaction objects
  function renderTransactions(transactions) {
    if (!transactionList) return; // ✅ FIXED: Exit if no container
    transactionList.innerHTML = ''; // clear old

    transactions.forEach(tx => {
      const li = document.createElement('li');
      const date = new Date(tx.createdAt || tx.date || Date.now()).toLocaleString();
      li.textContent = `${date}: ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} of ${formatUSD(tx.amount)} — Status: ${tx.status}`;
      transactionList.prepend(li);
    });
  } 

  // pop ups

  // Create popup container
  const popupContainer = document.createElement('div');
  popupContainer.id = 'popupContainer';
  popupContainer.style.position = 'fixed';
  popupContainer.style.bottom = '20px';
  popupContainer.style.right = '20px';
  popupContainer.style.zIndex = '10000';
  document.body.appendChild(popupContainer);

  function showPopup(message, isSuccess = true) {
    const popup = document.createElement('div');
    popup.textContent = message;
    popup.style.backgroundColor = isSuccess ? '#4CAF50' : '#f44336'; // green or red
    popup.style.color = 'white';
    popup.style.padding = '10px 20px';
    popup.style.marginTop = '10px';
    popup.style.borderRadius = '4px';
    popup.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    popup.style.opacity = '1';
    popup.style.transition = 'opacity 0.5s ease-out';

    popupContainer.appendChild(popup);

    // Fade out and remove after 4 seconds
    setTimeout(() => {
      popup.style.opacity = '0';
      setTimeout(() => {
        popup.remove();
      }, 500);
    }, 4000);
  }

  // Keep track of notified transaction IDs to avoid duplicate popups
  let notifiedTransactionIds = new Set();

  // Load from sessionStorage if available
  const storedNotified = sessionStorage.getItem('notifiedTransactionIds');
  if (storedNotified) {
    try {
      notifiedTransactionIds = new Set(JSON.parse(storedNotified));
    } catch {
      notifiedTransactionIds = new Set();
    }
  }

  // Enhanced fetchTransactions to include popup notifications
  async function fetchTransactionsWithPopup() {
    try {
      const res = await fetch(`${API_TRANSACTIONS}?userId=${user.id}&_sort=id&_order=desc`);
      if (!res.ok) throw new Error('Failed to load transactions');
      const transactions = await res.json();

      // Check for approved/declined transactions not notified yet
      transactions.forEach(tx => {
        if (
          (tx.status === 'approved' || tx.status === 'declined') &&
          !notifiedTransactionIds.has(tx.id)
        ) {
          // Show popup message
          const action = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
          const statusMsg = tx.status === 'approved' ? 'approved ✅' : 'declined ❌';
          showPopup(`${action} of ${formatUSD(tx.amount)} was ${statusMsg}`);

          notifiedTransactionIds.add(tx.id);
        }
      });

      // Save updated notified list to sessionStorage
      sessionStorage.setItem(
        'notifiedTransactionIds',
        JSON.stringify([...notifiedTransactionIds])
      );

      renderTransactions(transactions);
    } catch (err) {
      console.error(err);
      alert('Error loading transactions');
    }
  }

  // ✅ REMOVED DUPLICATE fetchUserData() and fetchTransactions() definitions

  // Fetch user details (balance etc) from JSON server
  async function fetchUserData() {
    try {
      const res = await fetch(`${API_USERS}/${user.id}`);
      if (!res.ok) throw new Error('Failed to load user data');
      const userData = await res.json();
      balance = userData.balance || 0;
      roi = userData.roi || 0;
      deposits = userData.deposits || 0;
      updateDashboard();
    } catch (err) {
      console.error(err);
      alert('Error loading user data');
    }
  }

  // --- Add funds (REAL API VERSION) ---
  if (confirmAddBtn) {
    confirmAddBtn.addEventListener('click', async (e) => {
      e.preventDefault(); // Prevent any default form submission or button default

      if (!addAmountInput) return;
      const amount = parseFloat(addAmountInput.value);
      if (isNaN(amount) || amount <= 0) {
        if (statusAdd) statusAdd.textContent = " ! Please enter a valid amount.";
        return;
      }

      // Prepare new deposit transaction
      const newTransaction = {
        userId: user.id,
        type: 'deposit',
        amount: amount,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      try {
        const res = await fetch(API_TRANSACTIONS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTransaction)
        });

        if (!res.ok) throw new Error('Failed to submit deposit request.');

        if (statusAdd) statusAdd.textContent = " ⏳ Awaiting admin approval...";
        if (addAmountInput) addAmountInput.value = '';

        setTimeout(() => {
          if (addModal) addModal.style.display = 'none';
          if (statusAdd) statusAdd.textContent = '';
        }, 2000);

        // Only refresh if on dashboard
        if (transactionList) {
          await fetchTransactionsWithPopup();
        }

      } catch (err) {
        if (statusAdd) statusAdd.textContent = '❌ ' + err.message;
      }
    });
  }

  // --- Withdraw funds (REAL API VERSION) ---
  if (confirmWithdrawBtn) {
    confirmWithdrawBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      if (!withdrawAmountInput) return;
      const amount = parseFloat(withdrawAmountInput.value);
      if (isNaN(amount) || amount <= 0) {
        if (statusWithdraw) statusWithdraw.textContent = " ! Enter a valid amount.";
        return;
      }

      // Get current balance for validation (only if on dashboard)
      let currentBalance = 0;
      if (balanceAmountEl) {
        const balanceText = balanceAmountEl.textContent.replace(/[^0-9.]/g, '');
        currentBalance = parseFloat(balanceText) || 0;
      }

      if (amount > currentBalance && currentBalance > 0) {
        if (statusWithdraw) statusWithdraw.textContent = " Insufficient balance.";
        return;
      }

      // Prepare new withdrawal transaction
      const newTransaction = {
        userId: user.id,
        type: 'withdrawal',
        amount: amount,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      try {
        const res = await fetch(API_TRANSACTIONS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTransaction)
        });

        if (!res.ok) throw new Error('Failed to submit withdrawal request.');

        if (statusWithdraw) statusWithdraw.textContent = " ⏳ Awaiting admin approval...";
        if (withdrawAmountInput) withdrawAmountInput.value = '';

        setTimeout(() => {
          if (withdrawModal) withdrawModal.style.display = 'none';
          if (statusWithdraw) statusWithdraw.textContent = '';
        }, 2000);

        // Only refresh if on dashboard
        if (transactionList) {
          await fetchTransactionsWithPopup();
        }

      } catch (err) {
        if (statusWithdraw) statusWithdraw.textContent = '❌ ' + err.message;
      }
    });
  }

  // Initial load (only if on dashboard)
  if (balanceAmountEl || transactionList) {
    fetchUserData();
    fetchTransactionsWithPopup();
    setInterval(fetchTransactionsWithPopup, 60000); // Poll every 60s
  }

  // --- Sidebar toggle (only if sidebar exists) ---
  if (sidebar && sidebarToggleBtn && hamburgerIcon) {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const toggleSidebar = () => {
      if (mediaQuery.matches) {
        sidebar.classList.toggle("open");
        if (mainContent) mainContent.classList.toggle("pushed-mobile");
        if (mobileOverlay) mobileOverlay.classList.toggle("visible");
        sidebarToggleBtn.classList.toggle("is-active");
      } else {
        if (dashboardContainer) dashboardContainer.classList.toggle("sidebar-collapsed");
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
        if (mainContent) mainContent.classList.remove("pushed-mobile");
        if (mobileOverlay) mobileOverlay.classList.remove("visible");
        if (dashboardContainer) dashboardContainer.classList.remove("sidebar-collapsed");
      } else {
        if (dashboardContainer) dashboardContainer.classList.remove("sidebar-collapsed");
      }
      hamburgerIcon.classList.remove("fa-times");
      hamburgerIcon.classList.add("fa-bars");
      sidebarToggleBtn.classList.remove("is-active");
    };

    setInitialSidebarState();
    mediaQuery.addEventListener("change", setInitialSidebarState);
  }

  // --- Theme toggle (only if theme toggle exists) ---
  if (themeToggleBtn && themeIcon) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      if (document.body.classList.contains("dark-mode")) {
        themeIcon.classList.replace("fa-moon", "fa-sun");
      } else {
        themeIcon.classList.replace("fa-sun", "fa-moon");
      }
    });
  }

  // --- Profile dropdown (only if exists) ---
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

  // === TradingView widget ===
  const tradingContainer = document.getElementById("tradingview_eurusd");
  if (tradingContainer) {
    let script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js'; // ✅ FIXED: Removed trailing spaces
    script.onload = function () {
      new TradingView.widget({
        container_id: "tradingview_eurusd",
        autosize: true,
        symbol: "FX:EURUSD",
        theme: "light"
      });
    };
    document.head.appendChild(script);
  }

  // === Chart.js Line Chart ===
  const chartCanvas = document.getElementById('analyticsChart');
  if (chartCanvas) {
    const ctx = chartCanvas.getContext('2d');
    const analyticsChart = new Chart(ctx, {
      type: 'line',
       {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [{
          label: 'Revenue',
           [3000, 2200, 2700, 1800, 1900, 2500, 4000, 3200, 1600, 3722, 2900, 3500],
          borderColor: '#dc691e', // copper brown
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
                return `Revenue: $${val.toLocaleString()}`;
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

  // --- Logout button logic ---
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.clear();
      window.location.href = "../login/login.html";
    });
  }

});