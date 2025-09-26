document.addEventListener("DOMContentLoaded", () => {

    // Global Constants
    const API_BASE = "https://cboejsonserver.onrender.com/api"; 
    const API_USERS = `${API_BASE}/users`;
    const API_TRANSACTIONS = `${API_BASE}/transactions`;

    // ===== LOGIN VALIDATION (Essential for all pages) =====
    const isUser = sessionStorage.getItem('isUser');
    const userData = sessionStorage.getItem('user');

    if (!isUser || !userData) {
        window.location.href = "../login/login.html";
        return;
    }

    const user = JSON.parse(userData);

    // Optional: Show user name (Conditional check)
    const profileNameEl = document.getElementById('profileName');
    if (profileNameEl && user.username) {
        profileNameEl.textContent = `Welcome, ${user.username}`; 
    }

    // --- Global DOM Elements (Expected on all dashboard pages) ---
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

    // --- Dashboard/Modal Specific Elements (Must be checked for existence before use) ---
    const balanceAmountEl = document.getElementById('balanceAmount');
    const roiEl = document.getElementById('roi');
    const activeDepositEl = document.getElementById('activeDeposit');
    const transactionList = document.getElementById('transactionList');

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

    // State Variables
    let balance = 0;
    let roi = 0;
    let deposits = 0;

    // ====================================================================
    // --- HELPER FUNCTIONS ---
    // ====================================================================

    function openModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            clearStatus();
            clearInputs();
        }
    }

    function clearStatus() {
        if (statusAdd) statusAdd.textContent = '';
        if (statusWithdraw) statusWithdraw.textContent = '';
    }

    function clearInputs() {
        if (addAmountInput) addAmountInput.value = '';
        if (withdrawAmountInput) withdrawAmountInput.value = '';
        if (withdrawModal) {
            const walletInput = withdrawModal.querySelector('input[type="text"]');
            if (walletInput) walletInput.value = '';
        }
    }

    function formatUSD(amount) {
        return `$${amount.toFixed(2)}`;
    }

    function updateDashboard() {
        if (balanceAmountEl) balanceAmountEl.textContent = formatUSD(balance);
        if (roiEl) roiEl.textContent = formatUSD(roi);
        if (activeDepositEl) activeDepositEl.textContent = `${deposits} active deposits`;
    }

    function renderTransactions(transactions) {
        if (!transactionList) return; 

        transactionList.innerHTML = ''; 

        transactions.forEach(tx => {
            const li = document.createElement('li');
            const date = new Date(tx.createdAt || tx.date || Date.now()).toLocaleString();
            li.textContent = `${date}: ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} of ${formatUSD(tx.amount)} — Status: ${tx.status}`;
            transactionList.prepend(li);
        });
    }

    // *** POPUP NOTIFICATION SETUP ***
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
        popup.style.backgroundColor = isSuccess ? '#4CAF50' : '#f44336';
        popup.style.color = 'white';
        popup.style.padding = '10px 20px';
        popup.style.marginTop = '10px';
        popup.style.borderRadius = '4px';
        popup.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        popup.style.opacity = '1';
        popup.style.transition = 'opacity 0.5s ease-out';

        popupContainer.appendChild(popup);

        setTimeout(() => {
            popup.style.opacity = '0';
            setTimeout(() => {
                popup.remove();
            }, 500);
        }, 4000);
    }
    
    // --- PERSISTENT NOTIFICATION TRACKING ---
    let notifiedTransactionIds = new Set();
    const NOTIFIED_KEY = `notifiedTransactions_${user.id}`; 
    const storedNotified = localStorage.getItem(NOTIFIED_KEY); 

    if (storedNotified) {
        try {
            const storedArray = JSON.parse(storedNotified);
            if (Array.isArray(storedArray)) {
                notifiedTransactionIds = new Set(storedArray);
            }
        } catch (e) {
            console.error("Failed to parse notified transactions from localStorage:", e);
            notifiedTransactionIds = new Set();
        }
    }


    // ====================================================================
    // --- API CALL FUNCTIONS ---
    // ====================================================================

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
            console.error('Error loading user data:', err);
        }
    }

    async function fetchTransactionsWithPopup() {
        if (!transactionList) return; 

        try {
            const res = await fetch(`${API_TRANSACTIONS}?userId=${user.id}&_sort=id&_order=desc`);
            if (!res.ok) throw new Error('Failed to load transactions');
            const transactions = await res.json();

            transactions.forEach(tx => {
                if (
                    (tx.status === 'approved' || tx.status === 'declined') &&
                    !notifiedTransactionIds.has(tx.id)
                ) {
                    const action = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);
                    const isSuccess = tx.status === 'approved';
                    const statusMsg = isSuccess ? 'approved ✅' : 'declined ❌';
                    showPopup(`${action} of ${formatUSD(tx.amount)} was ${statusMsg}`, isSuccess);

                    notifiedTransactionIds.add(tx.id);
                }
            });

            localStorage.setItem(
                NOTIFIED_KEY,
                JSON.stringify([...notifiedTransactionIds])
            );

            renderTransactions(transactions);
        } catch (err) {
            console.error('Error loading transactions:', err);
        }
    }


    // ====================================================================
    // --- MODAL EVENT LISTENERS (Conditional on modal elements) ---
    // ====================================================================

    if (openAddBtn && addModal) {
        openAddBtn.addEventListener('click', () => openModal(addModal));
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
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        }
    });

    // --- Add funds (API) ---
    if (confirmAddBtn && addAmountInput && statusAdd) {
        confirmAddBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const amount = parseFloat(addAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                statusAdd.textContent = " ! Please enter a valid amount.";
                statusAdd.style.color = 'red';
                return;
            }

            statusAdd.textContent = " ⏳ Awaiting admin approval...";
            statusAdd.style.color = 'black';

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

                statusAdd.textContent = " ✅ Deposit request submitted!";
                statusAdd.style.color = 'green';
                addAmountInput.value = '';

                setTimeout(() => {
                    closeModal(addModal);
                }, 1500);

                await fetchUserData(); 
                await fetchTransactionsWithPopup(); 

            } catch (err) {
                statusAdd.textContent = '❌ ' + err.message;
                statusAdd.style.color = 'red';
            }
        });
    }

    // --- Withdraw funds (API) ---
    if (confirmWithdrawBtn && withdrawAmountInput && statusWithdraw) {
        confirmWithdrawBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const amount = parseFloat(withdrawAmountInput.value);
            const walletAddress = withdrawModal.querySelector('input[type="text"]').value.trim();

            if (!walletAddress) {
                statusWithdraw.textContent = ' ! Please enter your wallet address';
                statusWithdraw.style.color = 'red';
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                statusWithdraw.textContent = " ! Enter a valid amount.";
                statusWithdraw.style.color = 'red';
                return;
            }
            if (amount > balance) {
                statusWithdraw.textContent = " ! Insufficient balance.";
                statusWithdraw.style.color = 'red';
                return;
            }

            statusWithdraw.textContent = " ⏳ Awaiting admin approval...";
            statusWithdraw.style.color = 'black';

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

                statusWithdraw.textContent = " ✅ Withdrawal request submitted!";
                statusWithdraw.style.color = 'green';
                withdrawAmountInput.value = '';

                setTimeout(() => {
                    closeModal(withdrawModal);
                }, 1500);

                await fetchUserData(); 
                await fetchTransactionsWithPopup(); 

            } catch (err) {
                statusWithdraw.textContent = '❌ ' + err.message;
                statusWithdraw.style.color = 'red';
            }
        });
    }


    // ====================================================================
    // --- GLOBAL UI COMPONENTS (Theme, Sidebar, Dropdown) ---
    // ====================================================================

    // --- Theme toggle ---
    if (themeToggleBtn && themeIcon) {
        // Load theme preference from localStorage on page load (Persistence)
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark-mode') {
            document.body.classList.add('dark-mode');
            themeIcon.classList.replace("fa-moon", "fa-sun");
        } else {
            document.body.classList.remove('dark-mode');
            themeIcon.classList.replace("fa-sun", "fa-moon");
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
            window.dispatchEvent(new Event('themeChanged')); 
        });
    }

    // --- Sidebar toggle (Hamburger menu) ---
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
        mobileOverlay.addEventListener("click", toggleSidebar);

        const setInitialSidebarState = () => {
            if (mediaQuery.matches) {
                sidebar.classList.remove("open");
                mainContent.classList.remove("pushed-mobile");
                mobileOverlay.classList.remove("visible");
            } 
            if (dashboardContainer) {
                 dashboardContainer.classList.remove("sidebar-collapsed");
            }
            hamburgerIcon.classList.remove("fa-times");
            hamburgerIcon.classList.add("fa-bars");
            sidebarToggleBtn.classList.remove("is-active");
        };

        setInitialSidebarState();
        mediaQuery.addEventListener("change", setInitialSidebarState); 
    }

    // --- Profile dropdown ---
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

    // --- Logout button logic ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = "../login/login.html";
        });
    }


    // ====================================================================
    // --- WIDGETS (Conditional on container elements) ---
    // ====================================================================

    // === TradingView widget ===
    const tradingViewContainer = document.getElementById("tradingview_eurusd");
    if (tradingViewContainer) { 
        const loadTradingView = () => {
            const isDarkMode = document.body.classList.contains("dark-mode");
            const theme = isDarkMode ? "dark" : "light";
            
            if (window.TradingView && window.TradingView.widget) {
                 // Already loaded
            } else {
                let script = document.createElement('script');
                script.src = 'https://s3.tradingview.com/tv.js'; 
                script.onload = function () {
                    new TradingView.widget({
                        container_id: "tradingview_eurusd",
                        autosize: true,
                        symbol: "FX:EURUSD",
                        width: "900px",
                        height: 400,
                        theme: theme 
                    });
                };
                document.head.appendChild(script);
            }
        };

        loadTradingView();
        
        window.addEventListener('themeChanged', loadTradingView);
    }


    // ====================================================================
    // --- INITIALIZATION AND POLLING ---
    // ====================================================================

    // Initial load
    fetchUserData();
    fetchTransactionsWithPopup(); 

    // Poll for updates every 60 seconds (Only poll if we expect dashboard data)
    if (balanceAmountEl || transactionList) {
        setInterval(() => {
            fetchUserData();
            fetchTransactionsWithPopup();
        }, 60000);
    }

});