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
  const API_BASE = "http://localhost:5500";
  const API_USERS = `${API_BASE}/users`;
  const API_TRANSACTIONS = `${API_BASE}/transactions`;

  // --- DOM Elements ---
  const dashboardContainer = document.getElementById("dashboard-container");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggleBtn = document.getElementById("sidebar-toggle");
  const hamburgerIcon = document.querySelector("#sidebar-toggle i");
  const mainContent = document.getElementById("main-content");
  const mobileOverlay = document.getElementById("mobile-overlay");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeIcon = document.querySelector("#theme-toggle i");
  const profileDropdown = document.getElementById("profile-dropdown");
  const dropdownMenu = profileDropdown.querySelector(".dropdown-menu");

  const balanceAmountEl = document.getElementById('balanceAmount');
  const roiEl = document.getElementById('roi');
  const activeDepositEl = document.getElementById('activeDeposit');
  const transactionList = document.getElementById('transactionList');


  // Elements
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
    modal.style.display = 'flex';
  }

  // Helper function to close modal
  function closeModal(modal) {
    modal.style.display = 'none';
    clearStatus();
    clearInputs();
  }

  // Clear status messages
  function clearStatus() {
    statusAdd.textContent = '';
    statusWithdraw.textContent = '';
  }

  // Clear inputs
  function clearInputs() {
    addAmountInput.value = '';
    withdrawAmountInput.value = '';
    // clear wallet address input in withdraw modal if needed
    withdrawModal.querySelector('input[type="text"]').value = '';
  }

  // Open modals on button clicks
  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => openModal(addModal));
  }
  if (openWithdrawBtn) {
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
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Confirm Add Funds
  confirmAddBtn.addEventListener('click', () => {
    const amount = parseFloat(addAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      statusAdd.textContent = 'Please enter a valid amount';
      statusAdd.style.color = 'red';
      return;
    }
    statusAdd.textContent = 'Processing...';
    statusAdd.style.color = 'black';

    // Your logic to handle add funds here, e.g., API call
    // Simulating async operation:
    setTimeout(() => {
      statusAdd.textContent = `Successfully added $${amount.toFixed(2)}!`;
      statusAdd.style.color = 'green';
      // Optionally close modal after success:
      // closeModal(addModal);
    }, 1500);
  });

  // Confirm Withdraw Funds
  confirmWithdrawBtn.addEventListener('click', () => {
    const amount = parseFloat(withdrawAmountInput.value);
    const walletAddress = withdrawModal.querySelector('input[type="text"]').value.trim();
    if (!walletAddress) {
      statusWithdraw.textContent = 'Please enter your wallet address';
      statusWithdraw.style.color = 'red';
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      statusWithdraw.textContent = 'Please enter a valid amount';
      statusWithdraw.style.color = 'red';
      return;
    }
    statusWithdraw.textContent = 'Processing...';
    statusWithdraw.style.color = 'black';

    // Your logic to handle withdraw funds here, e.g., API call
    setTimeout(() => {
      statusWithdraw.textContent = `Successfully withdrew $${amount.toFixed(2)}!`;
      statusWithdraw.style.color = 'green';
      // Optionally close modal after success:
      // closeModal(withdrawModal);
    }, 1500);
  });



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
    balanceAmountEl.textContent = formatUSD(balance);
    roiEl.textContent = formatUSD(roi);
    activeDepositEl.textContent = `${deposits} active deposits`;
  }

  // Clear and populate transaction list from array of transaction objects
  function renderTransactions(transactions) {
    transactionList.innerHTML = ''; // clear old

    transactions.forEach(tx => {
      const li = document.createElement('li');
      const date = new Date(tx.createdAt || tx.date || Date.now()).toLocaleString();
      li.textContent = `${date}: ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} of ${formatUSD(tx.amount)} — Status: ${tx.status}`;
      transactionList.prepend(li);
    });
  } 

  // pop ups

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

  // *** POPUP NOTIFICATION SETUP ***
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

  // Replace calls to fetchTransactions with fetchTransactionsWithPopup
  // Initial load
  fetchUserData();
  fetchTransactionsWithPopup();

  // Poll for updates every 60 seconds
  setInterval(fetchTransactionsWithPopup, 60000);

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

  // Fetch user's transactions from JSON server
  async function fetchTransactions() {
    try {
      const res = await fetch(`${API_TRANSACTIONS}?userId=${user.id}&_sort=id&_order=desc`);
      if (!res.ok) throw new Error('Failed to load transactions');
      const transactions = await res.json();
      renderTransactions(transactions);
    } catch (err) {
      console.error(err);
      alert('Error loading transactions');
    }
  }

  // --- Add funds ---
  confirmAdd.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent any default form submission or button default

    const amount = parseFloat(addAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      statusAdd.textContent = " ! Please enter a valid amount.";
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

      statusAdd.textContent = " ⏳ Awaiting admin approval...";
      addAmountInput.value = '';

      setTimeout(() => {
        addModal.style.display = 'none';
        statusAdd.textContent = '';
      }, 2000);

      await fetchTransactions();
      await fetchTransactionsWithPopup();

    } catch (err) {
      statusAdd.textContent = '❌ ' + err.message;
    }
  });

  // --- Withdraw funds ---
  confirmWithdraw.addEventListener('click', async (e) => {
    e.preventDefault();

    const amount = parseFloat(withdrawAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      statusWithdraw.textContent = " ! Enter a valid amount.";
      return;
    }

    if (amount > balance) {
      statusWithdraw.textContent = " Insufficient balance.";
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

      statusWithdraw.textContent = " ⏳ Awaiting admin approval...";
      withdrawAmountInput.value = '';

      setTimeout(() => {
        withdrawModal.style.display = 'none';
        statusWithdraw.textContent = '';
      }, 2000);

      await fetchTransactions();
      await fetchTransactionsWithPopup();

    } catch (err) {
      statusWithdraw.textContent = '❌ ' + err.message;
    }
  });

//   async function fetchUserMessages(userId) {
//   try {
//     const res = await fetch(`http://172.20.10.4:5000/messages?userId=${userId}`);
//     if (!res.ok) throw new Error('Failed to fetch messages');
//     const messages = await res.json();
//     displayUserMessages(messages);
//   } catch (err) {
//     console.error(err.message);
//   }
// }

// function displayUserMessages(messages) {
//   const container = document.getElementById('user-messages');
//   if (!container) return;
  
//   container.innerHTML = '';

//   if (messages.length === 0) {
//     container.textContent = 'No messages.';
//     return;
//   }

//   messages.forEach(msg => {
//     const div = document.createElement('div');
//     div.className = 'user-message';
//     div.innerHTML = `
//       <p><strong>Message:</strong> ${msg.message}</p>
//       <p><strong>Billing Amount:</strong> $${Number(msg.billingAmount).toFixed(2)}</p>
//       <p><em>Sent at: ${new Date(msg.createdAt).toLocaleString()}</em></p>
//       <hr/>
//     `;
//     container.appendChild(div);
//   });
// }



//   const loggedInUserId = 1; // Replace this with actual user ID logic
//   fetchUserMessages(loggedInUserId);

  // Initial load
  fetchUserData();
  fetchTransactions();

  // --- Sidebar toggle ---
  const mediaQuery = window.matchMedia("(max-width: 768px)");

  const toggleSidebar = () => {
    if (mediaQuery.matches) {
      sidebar.classList.toggle("open");
      mainContent.classList.toggle("pushed-mobile");
      mobileOverlay.classList.toggle("visible");
      sidebarToggleBtn.classList.toggle("is-active");
    } else {
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
  mobileOverlay.addEventListener("click", toggleSidebar);

  const setInitialSidebarState = () => {
    if (mediaQuery.matches) {
      sidebar.classList.remove("open");
      mainContent.classList.remove("pushed-mobile");
      mobileOverlay.classList.remove("visible");
      dashboardContainer.classList.remove("sidebar-collapsed");
    } else {
      dashboardContainer.classList.remove("sidebar-collapsed");
    }
    hamburgerIcon.classList.remove("fa-times");
    hamburgerIcon.classList.add("fa-bars");
    sidebarToggleBtn.classList.remove("is-active");
  };

  setInitialSidebarState();
  mediaQuery.addEventListener("change", setInitialSidebarState);

  // --- Theme toggle ---
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      themeIcon.classList.replace("fa-moon", "fa-sun");
    } else {
      themeIcon.classList.replace("fa-sun", "fa-moon");
    }
  });

  // --- Profile dropdown ---
  profileDropdown.addEventListener("click", (e) => {
    dropdownMenu.classList.toggle("hidden");
    e.stopPropagation();
  });

  document.addEventListener("click", (e) => {
    if (!profileDropdown.contains(e.target)) {
      dropdownMenu.classList.add("hidden");
    }
  });

  // === TradingView widget ===
  let script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/tv.js';
  script.onload = function () {
    new TradingView.widget({
      container_id: "tradingview_eurusd",
      autosize: true,
      symbol: "FX:EURUSD",
      width: "900px",
      height: 400,
      theme: "light"
    });
  };
  document.head.appendChild(script);

  // === Chart.js Line Chart ===
  const ctx = document.getElementById('analyticsChart')?.getContext('2d');
  if (ctx) {
    const analyticsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [{
          label: 'Revenue',
          data: [3000, 2200, 2700, 1800, 1900, 2500, 4000, 3200, 1600, 3722, 2900, 3500],
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
