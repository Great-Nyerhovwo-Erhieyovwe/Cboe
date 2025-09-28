// --- FIREBASE FIRESTORE REFACTOR ---
// This script now relies on the global window.db and window.auth objects 
// set in the containing HTML file (dashboard.html).

import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    addDoc 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Global Firestore/Auth objects from the HTML initialization script
const db = window.db; 
const auth = window.auth;


// ====================================================================
// --- GLOBAL INIT CHECK AND USER DATA (No more sessionStorage checks here) ---
// ====================================================================

// NOTE: We rely on the parent HTML's onAuthStateChanged listener to ensure a user is logged in.
// window.currentUser is set in the HTML's Firebase script upon successful login.
let user = window.currentUser || auth.currentUser; 
let userId = user ? user.uid : null; 

document.addEventListener("DOMContentLoaded", () => {
    // Re-check after DOM is loaded in case the Auth listener resolved later
    user = window.currentUser || auth.currentUser;
    userId = user ? user.uid : null;

    if (!userId || !db) {
        console.error("Firebase services or User ID not available. UI elements will not load.");
        // The HTML script should have already redirected the user, but this guards the functions.
        return; 
    }

    // --- Global DOM Elements ---
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

    // --- Dashboard/Modal Specific Elements ---
    const profileNameEl = document.getElementById('profileName');
    const balanceAmountEl = document.getElementById('balanceAmount');
    const roiEl = document.getElementById('roi');
    const activeInvestmentEl = document.getElementById('initialInvestment'); // Corrected ID
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

    // --- NEW DEPOSIT MODAL ELEMENTS (Wallet Config) ---
    const coinTypeSelect = document.getElementById('coinType');
    const networkTypeSelect = document.getElementById('networkType');
    const walletAddressDisplay = document.getElementById('walletAddressDisplay');
    const qrCodeImage = document.getElementById('qrCodeImage');
    
    // --- State Variables ---
    let userProfile = {}; // Store the Firestore user document here
    
    // ====================================================================
    // --- FIRESTORE WALLET CONFIG (Dynamic Data Fetch) ---
    // ====================================================================

    let WALLET_CONFIG = {};
    const WALLET_CONFIG_DOC = doc(db, "config", "wallet");
    
    // Fetch and cache the admin-set wallet configuration
    async function fetchWalletConfig() {
        try {
            const docSnap = await getDoc(WALLET_CONFIG_DOC);
            if (docSnap.exists()) {
                // The structure should be: { "USDT": { "TRC-20": { address: "...", qr_path: "..." }, ... } }
                WALLET_CONFIG = docSnap.data();
                updateNetworkOptions(); // Initialize the dropdowns
            } else {
                console.warn("Wallet configuration document 'config/wallet' not found.");
                WALLET_CONFIG = {};
            }
        } catch (error) {
            console.error("Error fetching wallet config:", error);
        }
    }

    function updateNetworkOptions() {
        if (!coinTypeSelect || !networkTypeSelect) return;
        
        const selectedCoin = coinTypeSelect.value;
        const networks = WALLET_CONFIG[selectedCoin];
        
        // Clear existing options
        networkTypeSelect.innerHTML = ''; 

        // Add new options for the selected coin
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

        const selectedCoin = coinTypeSelect.value;
        const selectedNetwork = networkTypeSelect.value;

        const data = WALLET_CONFIG[selectedCoin]?.[selectedNetwork];

        if (data && data.address) {
            walletAddressDisplay.textContent = data.address;
            // NOTE: Assuming qr_path contains the correct public image URL from Storage or elsewhere
            qrCodeImage.src = data.qr_path || '../assets/IMG_3817.png'; 
            qrCodeImage.parentElement.style.display = 'block';
        } else {
            walletAddressDisplay.textContent = 'Configuration not available.';
            qrCodeImage.src = '';
            qrCodeImage.parentElement.style.display = 'none';
        }
    }

    // Add event listeners to the new selectors
    if (coinTypeSelect && networkTypeSelect) {
        coinTypeSelect.addEventListener('change', updateNetworkOptions);
        networkTypeSelect.addEventListener('change', updateDepositDisplay);
    }
    
    // ====================================================================
    // --- FIRESTORE DATA FUNCTIONS ---
    // ====================================================================

    function formatUSD(amount) {
        return `$${Number(amount).toFixed(2)}`;
    }

    // PRIMARY DATA FETCH FUNCTION - SYNCS ALL METRICS
    async function fetchUserData() {
        try {
            const userDocRef = doc(db, "users", userId);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) {
                console.error('User document not found for ID:', userId);
                // Consider logging out the user if their data record is missing
                return;
            }

            const userData = docSnap.data();
            userProfile = userData; // Update global state
            
            // 🛑 BAN CHECK (Immediate action) 🛑
            if (userData.isBanned === true) {
                alert('🚫 Account Banned: Access has been permanently revoked by the administrator.');
                // Clear the Firebase session (handled by the HTML script) and redirect
                window.handleLogout(); 
                return; 
            }

            // Update UI elements
            if (profileNameEl) {
                const name = userData.username || user.email || 'User';
                profileNameEl.textContent = `Welcome, ${name}`;
            }

            // Update all dashboard metrics
            const balance = userData.balance || 0;
            const roi = userData.roi || 0;
            const activeInvestments = userData.activeTrades || 0; // Assuming activeTrades stores the value/count
            const activeDepositsCount = userData.deposits || 0; // Assuming deposits stores the count

            if (balanceAmountEl) balanceAmountEl.textContent = formatUSD(balance);
            if (roiEl) roiEl.textContent = `${formatUSD(roi)} (${(roi * 100 / (userData.initialDeposit || 1)).toFixed(2)}%)`;
            if (activeInvestmentEl) activeInvestmentEl.textContent = formatUSD(activeInvestments); 
            if (activeDepositEl) activeDepositEl.textContent = `${activeDepositsCount} active deposits`;
            
        } catch (err) {
            console.error('Error loading user data:', err);
        }
    }

    function renderTransactions(transactions) {
        if (!transactionList) return; 

        transactionList.innerHTML = ''; 
        
        // Render up to 5 latest transactions (can be adjusted)
        transactions.slice(0, 5).forEach(tx => {
            const li = document.createElement('li');
            
            // Convert Firestore Timestamp or Date string to a readable format
            let date;
            if (tx.createdAt && tx.createdAt.toDate) {
                date = tx.createdAt.toDate().toLocaleString();
            } else if (tx.createdAt) {
                date = new Date(tx.createdAt).toLocaleString();
            } else {
                date = new Date().toLocaleString();
            }
            
            li.textContent = `${date}: ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} of ${formatUSD(tx.amount)} — Status: ${tx.status}`;
            transactionList.prepend(li);
        });
    }
    
    // --- TRANSACTION FETCH AND POPUP LOGIC ---
    // NOTE: This now uses Firestore collection querying.
    let notifiedTransactionIds = new Set();
    const NOTIFIED_KEY = `notifiedTransactions_${userId}`; 
    
    const storedNotified = localStorage.getItem(NOTIFIED_KEY); 
    if (storedNotified) {
        try {
            notifiedTransactionIds = new Set(JSON.parse(storedNotified));
        } catch (e) {
            console.error("Failed to parse notified transactions from localStorage:", e);
        }
    }

    async function fetchTransactionsWithPopup() {
        if (!transactionList) return; 

        try {
            const transactionsCollection = collection(db, "transactions");
            // Query: transactions WHERE userId == currentUser.uid, ordered by createdAt, limit to 20
            const q = query(
                transactionsCollection, 
                where("userId", "==", userId), 
                orderBy("createdAt", "desc"), 
                limit(20) // Limit the fetch size
            );
            
            const querySnapshot = await getDocs(q);
            const transactions = [];

            querySnapshot.forEach(doc => {
                const tx = { id: doc.id, ...doc.data() };
                transactions.push(tx);

                // Check for new notifications
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

            // Save the list of notified IDs back to local storage
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
    // --- MODAL AND SUBMISSION LOGIC (Firestore Write) ---
    // ====================================================================

    // --- Add funds (Firestore) ---
    if (confirmAddBtn && addAmountInput && statusAdd) {
        confirmAddBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // 🥶 TRANSACTION FREEZE CHECK 🥶
            if (userProfile.isFrozen === true) {
                statusAdd.textContent = '❌ Transactions are currently frozen by the administrator.';
                statusAdd.style.color = 'red';
                return; 
            }

            const amount = parseFloat(addAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                statusAdd.textContent = " ! Please enter a valid amount.";
                statusAdd.style.color = 'red';
                return;
            }
            
            const coinType = coinTypeSelect.value;
            const networkType = networkTypeSelect.value;
            
            if (!coinType || !networkType) {
                 statusAdd.textContent = " ! Please select a Coin Type and Network.";
                 statusAdd.style.color = 'red';
                 return;
            }

            statusAdd.textContent = " ⏳ Submitting request...";
            statusAdd.style.color = 'black';

            // Data structure for the new Firestore document
            const newTransaction = {
                userId: userId,
                type: 'deposit',
                amount: amount,
                coin: coinType, 
                network: networkType, 
                status: 'pending',
                createdAt: new Date() // Firestore automatically converts this to Timestamp
            };

            try {
                // Add the document to the 'transactions' collection
                await addDoc(collection(db, "transactions"), newTransaction);

                statusAdd.textContent = " ✅ Deposit request submitted!";
                statusAdd.style.color = 'green';
                addAmountInput.value = '';

                setTimeout(() => {
                    closeModal(addModal);
                }, 1500);

                // SYNCHRONIZATION CALLS
                await fetchUserData(); // Update balance/deposit count
                await fetchTransactionsWithPopup(); // Update transaction history and popups

            } catch (err) {
                console.error("Firestore Deposit Error:", err);
                statusAdd.textContent = '❌ Failed to submit deposit: ' + err.message;
                statusAdd.style.color = 'red';
            }
        });
    }

    // --- Withdraw funds (Firestore) ---
    if (confirmWithdrawBtn && withdrawAmountInput && statusWithdraw) {
        confirmWithdrawBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // 🥶 TRANSACTION FREEZE CHECK 🥶
            if (userProfile.isFrozen === true) {
                statusWithdraw.textContent = '❌ Transactions are currently frozen by the administrator.';
                statusWithdraw.style.color = 'red';
                return; 
            }

            const amount = parseFloat(withdrawAmountInput.value);
            // Assuming wallet address input is the first text input in the withdrawModal
            const walletInput = withdrawModal.querySelector('input[type="text"]');
            const walletAddress = walletInput ? walletInput.value.trim() : '';

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
            if (amount > (userProfile.balance || 0)) { // Check against current balance
                statusWithdraw.textContent = " ! Insufficient balance.";
                statusWithdraw.style.color = 'red';
                return;
            }

            statusWithdraw.textContent = " ⏳ Submitting request...";
            statusWithdraw.style.color = 'black';

            const newTransaction = {
                userId: userId,
                type: 'withdrawal',
                amount: amount,
                walletAddress: walletAddress, 
                status: 'pending',
                createdAt: new Date()
            };

            try {
                // Add the document to the 'transactions' collection
                await addDoc(collection(db, "transactions"), newTransaction);

                statusWithdraw.textContent = " ✅ Withdrawal request submitted!";
                statusWithdraw.style.color = 'green';
                withdrawAmountInput.value = '';
                walletInput.value = ''; // Clear wallet input

                setTimeout(() => {
                    closeModal(withdrawModal);
                }, 1500);

                // SYNCHRONIZATION CALLS
                await fetchUserData(); 
                await fetchTransactionsWithPopup(); 

            } catch (err) {
                console.error("Firestore Withdrawal Error:", err);
                statusWithdraw.textContent = '❌ Failed to submit withdrawal: ' + err.message;
                statusWithdraw.style.color = 'red';
            }
        });
    }

    // ====================================================================
    // --- HELPER FUNCTIONS (Left mostly unchanged as they are DOM-specific) ---
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
    
    // ====================================================================
    // --- UI EVENT LISTENERS (Modals) ---
    // ====================================================================
    
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
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        }
    });

    // ====================================================================
    // --- GLOBAL UI COMPONENTS (Theme, Sidebar, Dropdown) ---
    // ====================================================================
    
    // --- Theme toggle (Persistence) ---
    if (themeToggleBtn && themeIcon) {
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

    // --- Sidebar toggle (Logic omitted for brevity, assuming existing code works) ---
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

    // --- Logout button logic (Replaced with global function call from HTML) ---
    // The previous code is removed as it's now handled by the inline HTML script:
    // <li><a href="javascript:void(0);" onclick="handleLogout();">...</a></li>


    // ====================================================================
    // --- WIDGETS ---
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
                // Remove existing scripts if you need to dynamically re-add/update the widget
                tradingViewContainer.innerHTML = ''; 
                
                let script = document.createElement('script');
                script.src = 'https://s3.tradingview.com/tv.js'; 
                script.onload = function () {
                    new window.TradingView.widget({ // Use window.TradingView for safety
                        container_id: "tradingview_eurusd",
                        autosize: true,
                        symbol: "FX:EURUSD",
                        width: "100%", // Use 100% width for better responsiveness
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
    // --- INITIALIZATION AND POLLING (Passive Sync) ---
    // ====================================================================

    // 1. Fetch the admin-set wallet configuration
    fetchWalletConfig(); 
    
    // 2. Initial load fetches all user data and transactions
    fetchUserData();
    fetchTransactionsWithPopup(); 

    // Polling for passive synchronization every 60 seconds (Using Firestore read, not API)
    if (balanceAmountEl || transactionList) {
        setInterval(() => {
            fetchUserData();
            fetchTransactionsWithPopup();
        }, 60000);
    }

});