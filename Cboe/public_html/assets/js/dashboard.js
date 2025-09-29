// --- FIREBASE FIRESTORE REFACTOR ---
// This script relies on the global window.db and window.auth objects 
// set in the containing HTML file (dashboard.html).

import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    limit, 
    addDoc,
    onSnapshot // Used for real-time updates for balance and transactions
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Global Firestore/Auth objects from the HTML initialization script
const db = window.db; 
const auth = window.auth;

// ====================================================================
// --- GLOBAL HELPER FUNCTIONS (Defined before use) ---
// ====================================================================

// --- 1. POPUP NOTIFICATION SETUP ---
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
        padding: 10px 20px;
        margin-top: 10px;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        opacity: 1;
        transition: opacity 0.5s ease-out;
    `;

    popupContainer.prepend(popup);

    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            popup.remove();
        }, 500);
    }, 4000);
}

function formatUSD(amount) {
    return `$${Number(amount).toFixed(2)}`;
}

// --- 2. GLOBAL LOGOUT HANDLER (Ensures 'banned' check can execute) ---
if (typeof window.handleLogout === 'undefined') {
    window.handleLogout = async () => {
        try {
            if (auth) {
                await auth.signOut();
            }
        } catch (error) {
            console.error("Error signing out:", error);
        }
        window.location.href = 'login.html'; 
    };
}


// ====================================================================
// --- DOM CONTENT LOADED START ---
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
    
    // User is checked by the HTML's auth listener, so auth.currentUser is reliable here
    const user = auth.currentUser;
    const userId = user ? user.uid : null;
    
    if (!userId || !db || !auth) {
        console.error("Firebase services or User ID not available. Redirect should have occurred.");
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
    const activeInvestmentEl = document.getElementById('initialInvestment'); 
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
    let userProfile = {}; 
    
    // ====================================================================
    // --- FIRESTORE WALLET CONFIG (One-time fetch) ---
    // ====================================================================

    let WALLET_CONFIG = {};
    const WALLET_CONFIG_DOC = doc(db, "config", "wallet");
    
    async function fetchWalletConfig() {
        try {
            const docSnap = await getDoc(WALLET_CONFIG_DOC);
            if (docSnap.exists()) {
                WALLET_CONFIG = docSnap.data();
                updateNetworkOptions(); 
            } else {
                console.warn("Wallet configuration document 'config/wallet' not found.");
                WALLET_CONFIG = {};
            }
        } catch (error) {
            console.error("Error fetching wallet config:", error);
        }
    }

    if (coinTypeSelect && networkTypeSelect && walletAddressDisplay && qrCodeImage) {
        
        function updateNetworkOptions() {
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
            const selectedCoin = coinTypeSelect.value;
            const selectedNetwork = networkTypeSelect.value;

            const data = WALLET_CONFIG[selectedCoin]?.[selectedNetwork];

            if (data && data.address) {
                walletAddressDisplay.textContent = data.address;
                qrCodeImage.src = data.qr_path || '../assets/placeholder_qr.png'; 
                qrCodeImage.parentElement.style.display = 'block';
            } else {
                walletAddressDisplay.textContent = 'Configuration not available.';
                qrCodeImage.src = '';
                qrCodeImage.parentElement.style.display = 'none';
            }
        }

        coinTypeSelect.addEventListener('change', updateNetworkOptions);
        networkTypeSelect.addEventListener('change', updateDepositDisplay);
    }
    
    // ====================================================================
    // --- FIRESTORE DATA LISTENERS (Real-time Sync) ---
    // ====================================================================

    function renderTransactions(transactions) {
        if (!transactionList) return; 

        transactionList.innerHTML = ''; 
        
        // Client-side sort by date (descending) 
        transactions.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

        // Render only the latest 5 transactions
        transactions.slice(0, 5).forEach(tx => {
            const li = document.createElement('li');
            let date = tx.createdAt.toDate().toLocaleString();
            
            li.textContent = `${date}: ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} of ${formatUSD(tx.amount)} — Status: ${tx.status}`;
            transactionList.prepend(li);
        });
    }

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

    // Real-time listener for transactions
    function listenToTransactions() {
        if (!transactionList) return () => {}; 

        const transactionsCollection = collection(db, "transactions");
        
        // Query: transactions WHERE userId == currentUser.uid, limit to 20.
        // NOTE: OrderBy is removed to prevent required index creation in Firestore.
        const q = query(
            transactionsCollection, 
            where("userId", "==", userId), 
            limit(20)
        );
            
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
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

            localStorage.setItem(
                NOTIFIED_KEY,
                JSON.stringify([...notifiedTransactionIds])
            );

            renderTransactions(transactions);
        }, (error) => {
            console.error("Error listening to transactions:", error);
        });

        return unsubscribe; 
    }
    
    // PRIMARY DATA LISTEN FUNCTION - Real-time Sync for Metrics
    function listenToUserData() {
        // Ensure user data is fetched from the 'users' collection as per standard structure
        const userDocRef = doc(db, "users", userId); 
        
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (!docSnap.exists()) {
                console.error('User document not found for ID:', userId);
                return;
            }

            const userData = docSnap.data();
            userProfile = userData; 
            
            // 🛑 BAN CHECK (Immediate action) 🛑
            if (userData.isBanned === true) {
                console.warn('Account Banned. Redirecting...');
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
            // Use 'initialDeposit' or 'totalDeposits' as the base, safely defaulting to 1
            const initialDeposit = userData.initialDeposit || userData.totalDeposits || 1; 
            const activeInvestments = userData.activeTrades || 0; 
            const activeDepositsCount = userData.deposits || 0; 

            if (balanceAmountEl) balanceAmountEl.textContent = formatUSD(balance);
            if (roiEl) roiEl.textContent = `${formatUSD(roi)} (${(roi * 100 / initialDeposit).toFixed(2)}%)`;
            if (activeInvestmentEl) activeInvestmentEl.textContent = formatUSD(activeInvestments); 
            if (activeDepositEl) activeDepositEl.textContent = `${activeDepositsCount} active deposits`;
            
        }, (error) => {
            console.error("Error listening to user data:", error);
        });
        
        return unsubscribe; 
    }


    // ====================================================================
    // --- MODAL AND SUBMISSION LOGIC (Firestore Write) ---
    // ====================================================================

    // --- Add funds (Deposit) ---
    if (confirmAddBtn && addAmountInput && statusAdd) {
        confirmAddBtn.addEventListener('click', async (e) => {
            e.preventDefault();

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
            
            const coinType = coinTypeSelect ? coinTypeSelect.value : 'N/A';
            const networkType = networkTypeSelect ? networkTypeSelect.value : 'N/A';
            
            if (!coinType || !networkType || coinType === 'N/A' || networkType === 'N/A') {
                statusAdd.textContent = " ! Please select a Coin Type and Network.";
                statusAdd.style.color = 'red';
                return;
            }

            statusAdd.textContent = " ⏳ Submitting request...";
            statusAdd.style.color = 'black';

            const newTransaction = {
                userId: userId,
                type: 'deposit',
                amount: amount,
                coin: coinType, 
                network: networkType, 
                status: 'pending',
                createdAt: new Date(), 
                username: userProfile.username || 'N/A'
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

                showPopup(`Deposit of ${formatUSD(amount)} submitted for review.`, true);

            } catch (err) {
                console.error("Firestore Deposit Error:", err);
                statusAdd.textContent = '❌ Failed to submit deposit: ' + err.message;
                statusAdd.style.color = 'red';
            }
        });
    }

    // --- Withdraw funds ---
    if (confirmWithdrawBtn && withdrawAmountInput && statusWithdraw) {
        confirmWithdrawBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (userProfile.isFrozen === true) {
                statusWithdraw.textContent = '❌ Transactions are currently frozen by the administrator.';
                statusWithdraw.style.color = 'red';
                return; 
            }

            const amount = parseFloat(withdrawAmountInput.value);
            // Assumes the wallet address input has the name="walletAddress" attribute
            const walletInput = withdrawModal.querySelector('input[name="walletAddress"]'); 
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
            if (amount > (userProfile.balance || 0)) { 
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
                createdAt: new Date(),
                username: userProfile.username || 'N/A'
            };

            try {
                // Add the document to the 'transactions' collection
                await addDoc(collection(db, "transactions"), newTransaction);

                statusWithdraw.textContent = " ✅ Withdrawal request submitted!";
                statusWithdraw.style.color = 'green';
                withdrawAmountInput.value = '';
                walletInput.value = ''; 

                setTimeout(() => {
                    closeModal(withdrawModal);
                }, 1500);
                
                showPopup(`Withdrawal of ${formatUSD(amount)} submitted for review.`, true);

            } catch (err) {
                console.error("Firestore Withdrawal Error:", err);
                statusWithdraw.textContent = '❌ Failed to submit withdrawal: ' + err.message;
                statusWithdraw.style.color = 'red';
            }
        });
    }

    // ====================================================================
    // --- HELPER FUNCTIONS (Modals/Status) ---
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
            const walletInput = withdrawModal.querySelector('input[name="walletAddress"]');
            if (walletInput) walletInput.value = '';
        }
    }
    
    // ====================================================================
    // --- UI EVENT LISTENERS (Modals & Theme/Sidebar) ---
    // ====================================================================
    
    // Modal Listeners
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

    // Theme toggle logic...
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

    // Sidebar toggle logic...
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

    // Profile dropdown logic...
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
                 // Widget is already loaded, skip
            } else {
                tradingViewContainer.innerHTML = ''; 
                
                let script = document.createElement('script');
                script.src = 'https://s3.tradingview.com/tv.js'; 
                script.onload = function () {
                    new window.TradingView.widget({
                        container_id: "tradingview_eurusd",
                        autosize: true,
                        symbol: "FX:EURUSD",
                        width: "100%", 
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
    // --- INITIALIZATION (Start Real-time Sync) ---
    // ====================================================================

    // 1. Fetch the admin-set wallet configuration (one-time fetch)
    fetchWalletConfig(); 
    
    // 2. Start real-time listeners for user data and transactions
    const unsubscribeUser = listenToUserData();
    const unsubscribeTransactions = listenToTransactions();
});