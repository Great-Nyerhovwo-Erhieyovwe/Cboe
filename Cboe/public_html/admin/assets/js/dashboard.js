// 🛑 FIREBASE IMPORTS 🛑
// These are needed for the module environment to access Firestore and Auth methods
import { 
    getFirestore, collection, doc, updateDoc, deleteDoc, 
    onSnapshot, query, where, addDoc 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";


// === Configuration ===
// We no longer use JSON Server endpoints. We define Firestore collection paths.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const PUBLIC_USERS_COLLECTION = `artifacts/${appId}/public/data/users`;
const PUBLIC_TRANSACTIONS_COLLECTION = `artifacts/${appId}/public/data/transactions`;
const PUBLIC_MESSAGES_COLLECTION = `artifacts/${appId}/public/data/messages`;

// === Firebase Services (Will be populated in init) ===
let db;
let auth;

// === DOM Elements (Modified to be robust against page changes) ===
const dashboardContainer = document.getElementById("dashboard-container");
const sidebar = document.getElementById("sidebar");
const sidebarToggleBtn = document.getElementById("sidebar-toggle");
const hamburgerIcon = document.querySelector("#sidebar-toggle i");
const mainContent = document.getElementById("main-content");
const mobileOverlay = document.getElementById("mobile-overlay");
const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon = document.querySelector("#theme-toggle i");
const profileDropdown = document.getElementById("profile-dropdown");
const dropdownMenu = profileDropdown?.querySelector(".dropdown-menu");
const logoutBtn = document.getElementById("logout-btn"); // Added for consistency
const dropdownLogout = document.getElementById("dropdown-logout"); // Added for consistency

const messageContainer = document.getElementById('message-container');
// Use the new body IDs if available, fall back to general selector
const usersTableBody = document.getElementById('users-table-body') || document.querySelector('#users-table tbody');
const transactionsTableBody = document.getElementById('transactions-table-body') || document.querySelector('#transactions-table tbody');

// === State ===
let users = [];
let transactions = [];
let selectedUserId = null;


// === Custom Modal (Replacing the banned `confirm()` function) ===

const confirmationModal = document.createElement('div');
confirmationModal.id = 'confirmationModal';
confirmationModal.style.cssText = 'display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); justify-content: center; align-items: center;';
confirmationModal.innerHTML = `
    <div style="background: white; padding: 25px; border-radius: 8px; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h3 id="conf-title" style="margin-top: 0; color: #333;">Confirm Action</h3>
        <p id="conf-message" style="margin-bottom: 20px; color: #555;"></p>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="conf-cancel" style="padding: 8px 15px; border: 1px solid #ccc; border-radius: 4px; background: #f0f0f0; cursor: pointer;">Cancel</button>
            <button id="conf-ok" style="padding: 8px 15px; border: none; border-radius: 4px; background: #dc3545; color: white; cursor: pointer;">Confirm</button>
        </div>
    </div>
`;
document.body.appendChild(confirmationModal);


function showConfirmation(title, message, callback) {
    const modal = document.getElementById('confirmationModal');
    document.getElementById('conf-title').textContent = title;
    document.getElementById('conf-message').textContent = message;
    
    modal.style.display = 'flex';
    
    const handleOk = () => {
        modal.style.display = 'none';
        document.getElementById('conf-ok').removeEventListener('click', handleOk);
        document.getElementById('conf-cancel').removeEventListener('click', handleCancel);
        callback(true);
    };

    const handleCancel = () => {
        modal.style.display = 'none';
        document.getElementById('conf-ok').removeEventListener('click', handleOk);
        document.getElementById('conf-cancel').removeEventListener('click', handleCancel);
        callback(false);
    };

    document.getElementById('conf-ok').addEventListener('click', handleOk);
    document.getElementById('conf-cancel').addEventListener('click', handleCancel);
}

function showMessage(text, type = 'success') {
    messageContainer.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'message ' + type;
    div.textContent = text;
    messageContainer.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}


// === Core Data Listeners (Replaced fetch with onSnapshot) ===

/**
 * Sets up a real-time listener for all users.
 */
function setupUsersListener() {
    if (!db || !usersTableBody) return;

    const usersRef = collection(db, PUBLIC_USERS_COLLECTION);
    
    // Use onSnapshot for real-time updates
    onSnapshot(usersRef, (snapshot) => {
        users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        renderUsers();
        // Re-attach listeners after rendering
        addTableEventListeners(); 
    }, (error) => {
        console.error("Error fetching users:", error);
        showMessage("Failed to load users in real-time.", 'error');
    });
}

/**
 * Sets up a real-time listener for pending transactions.
 */
function setupTransactionsListener() {
    if (!db || !transactionsTableBody) return;

    const transactionsRef = collection(db, PUBLIC_TRANSACTIONS_COLLECTION);
    // Query for 'pending' status transactions
    const q = query(transactionsRef, where("status", "==", "pending"));

    onSnapshot(q, (snapshot) => {
        transactions = [];
        snapshot.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        renderTransactions();
    }, (error) => {
        console.error("Error fetching pending transactions:", error);
        showMessage("Failed to load transactions in real-time.", 'error');
    });
}


// === Rendering Functions (Minimal changes) ===

function renderUsers() {
    if (!usersTableBody) return;
    usersTableBody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        const balanceNum = Number(user.balance) || 0;
        
        const isBanned = user.isBanned === true;
        const isFrozen = user.isFrozen === true;

        const statusText = isBanned ? 'BANNED' : (isFrozen ? 'FROZEN' : 'Active');
        const statusColor = isBanned ? 'red' : (isFrozen ? 'orange' : 'green');

        tr.innerHTML = `
            <td><code title="User ID: ${user.id}">${user.id.substring(0, 8)}...</code></td>
            <td>${user.username || 'N/A'}</td>
            <td>${user.email}</td>
            <td>$${balanceNum.toFixed(2)}</td>
            <td>
                <input type="number" min="0" step="0.01" placeholder="New balance" id="balance-input-${user.id}" />
                <button class="update-btn" data-userid="${user.id}">Update</button>
            </td>
            <td>
                <button class="send-message-btn" data-userid="${user.id}" data-username="${user.username}">Message</button>
            </td>
            <td style="color:${statusColor}; font-weight:bold;">${statusText}</td>
            <td>
                <button class="action-btn ban-btn" data-user-id="${user.id}" data-action="ban">
                    ${isBanned ? 'Unban' : 'Ban Access'}
                </button>
                <button class="action-btn freeze-btn" data-user-id="${user.id}" data-action="freeze">
                    ${isFrozen ? 'Unfreeze Txn' : 'Freeze Txn'}
                </button>
                <button class="action-btn delete-btn" data-user-id="${user.id}" data-action="delete">
                    Delete User
                </button>
            </td>
        `;

        usersTableBody.appendChild(tr);
    });
}

function renderTransactions() {
    if (!transactionsTableBody) return;
    transactionsTableBody.innerHTML = '';

    if (transactions.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align:center;">No pending transactions</td>`;
        transactionsTableBody.appendChild(tr);
        return;
    }

    transactions.forEach(tx => {
        const user = users.find(u => u.id == tx.userId);
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><code title="TXN ID: ${tx.id}">${tx.id.substring(0, 8)}...</code></td>
            <td>${user ? user.username : 'Unknown'}</td>
            <td style="text-transform: capitalize;">${tx.type}</td>
            <td>${Number(tx.amount).toFixed(2)}</td>
            <td>
                <button class="approve-btn" data-txid="${tx.id}">Approve</button>
                <button class="reject-btn" data-txid="${tx.id}">Reject</button>
            </td>
        `;

        transactionsTableBody.appendChild(tr);
    });
}


// === Data Operations (Replaced fetch with Firestore calls) ===

// 1. Update Balance (Firestore: updateDoc)
async function updateUserBalance(userId, newBalance) {
    try {
        const userDocRef = doc(db, PUBLIC_USERS_COLLECTION, userId);
        
        await updateDoc(userDocRef, {
            balance: parseFloat(newBalance.toFixed(2)) // Ensure precision
        });
        
        showMessage('Balance updated successfully');
        // The listener handles the UI refresh
    } catch (err) {
        showMessage(`Failed to update balance: ${err.message}`, 'error');
        console.error("Firestore Error:", err);
    }
}

// 2. Admin Actions (Ban/Freeze/Delete) (Firestore: updateDoc or deleteDoc)
async function handleUserAction(userId, action) {
    const user = users.find(u => u.id == userId);
    if (!user) {
        showMessage('User not found in local data.', 'error');
        return;
    }
    
    const userDocRef = doc(db, PUBLIC_USERS_COLLECTION, userId);
    let updatePayload = {};

    try {
        switch (action) {
            case 'ban':
                updatePayload = { isBanned: !user.isBanned };
                await updateDoc(userDocRef, updatePayload);
                showMessage(`${user.username} successfully ${updatePayload.isBanned ? 'banned' : 'unbanned'}.`, 'success');
                break;
            case 'freeze':
                updatePayload = { isFrozen: !user.isFrozen };
                await updateDoc(userDocRef, updatePayload);
                showMessage(`Transaction status ${updatePayload.isFrozen ? 'FROZEN' : 'UNFROZEN'} for ${user.username}.`, 'success');
                break;
            case 'delete':
                await deleteDoc(userDocRef);
                showMessage(`User ${user.username} deleted permanently.`, 'success');
                break;
            default:
                console.error('Unknown admin action:', action);
                return;
        }

    } catch (error) {
        showMessage(`Failed to perform ${action}: ${error.message}`, 'error');
        console.error(`Admin action error (${action}):`, error);
    }
}

// 3. Approve Transaction (Firestore: updateDoc for user balance & transaction status)
async function approveTransaction(tx) {
    try {
        const user = users.find(u => u.id == tx.userId);
        if (!user) {
            return showMessage('User not found for this transaction.', 'error');
        }

        let newBalance = Number(user.balance) || 0;
        const txAmount = Number(tx.amount) || 0;

        // Balance calculation
        if (tx.type === 'deposit') {
            newBalance += txAmount;
        } else if (tx.type === 'withdrawal') {
            if (txAmount > newBalance) {
                return showMessage('Cannot approve withdrawal: insufficient balance.', 'error');
            }
            newBalance -= txAmount;
        } else {
             return showMessage(`Unknown transaction type: ${tx.type}`, 'error');
        }

        // 1. Update user balance
        const userDocRef = doc(db, PUBLIC_USERS_COLLECTION, user.id);
        await updateDoc(userDocRef, { balance: parseFloat(newBalance.toFixed(2)) });

        // 2. Update transaction status
        const txDocRef = doc(db, PUBLIC_TRANSACTIONS_COLLECTION, tx.id);
        await updateDoc(txDocRef, { 
            status: 'approved',
            processedAt: new Date().toISOString()
        });

        showMessage(`Transaction #${tx.id.substring(0, 8)} approved. New user balance: $${newBalance.toFixed(2)}.`);
        // Listeners handle the refresh
    } catch (err) {
        showMessage(`Failed to approve transaction: ${err.message}`, 'error');
        console.error("Firestore Transaction Error:", err);
    }
}

// 4. Reject Transaction (Firestore: updateDoc for transaction status)
async function rejectTransaction(txId) {
    try {
        const txDocRef = doc(db, PUBLIC_TRANSACTIONS_COLLECTION, txId);
        await updateDoc(txDocRef, { 
            status: 'rejected',
            processedAt: new Date().toISOString()
        });
        showMessage(`Transaction #${txId.substring(0, 8)} rejected.`);
        // Listener handles the refresh
    } catch (err) {
        showMessage(`Failed to reject transaction: ${err.message}`, 'error');
        console.error("Firestore Transaction Error:", err);
    }
}

// 5. Modal submit (Firestore: addDoc for message/updateDoc for balance)
const modalUserInfo = document.getElementById('modalUserInfo');
const messageText = document.getElementById('messageText');
const billingAmount = document.getElementById('billingAmount');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalStatus = document.getElementById('modalStatus');
const messageModal = document.getElementById('messageModal') || document.body.lastElementChild; // Fallback to the dynamically created one

// Modal close
closeModalBtn.addEventListener('click', () => {
    messageModal.style.display = 'none';
});

// Modal submit
sendMessageBtn.addEventListener('click', async () => {
    if (!selectedUserId || !db) return;

    const message = messageText.value.trim();
    const billing = parseFloat(billingAmount.value);
    const user = users.find(u => u.id === selectedUserId);

    if (!message && (isNaN(billing) || billing <= 0)) {
        modalStatus.textContent = 'Enter a message or a positive billing amount.';
        modalStatus.style.color = 'red';
        return;
    }

    modalStatus.textContent = 'Processing...';
    modalStatus.style.color = 'black';

    try {
        // 1. Handle Billing/Balance Update (if applicable)
        if (!isNaN(billing) && billing > 0) {
            if (!user) throw new Error("Target user data missing for billing.");
            
            const userDocRef = doc(db, PUBLIC_USERS_COLLECTION, selectedUserId);
            const newBalance = (Number(user.balance) || 0) - billing; // Billing subtracts
            
            // Update user balance
            await updateDoc(userDocRef, {
                balance: parseFloat(newBalance.toFixed(2))
            });

            // Log the billing as a transaction for history
             await addDoc(collection(db, PUBLIC_TRANSACTIONS_COLLECTION), {
                userId: selectedUserId,
                type: 'billing',
                amount: billing,
                status: 'completed',
                note: `Admin billed for: ${message.substring(0, 50)}...`,
                createdAt: new Date().toISOString(),
                processedAt: new Date().toISOString()
            });
        }
        
        // 2. Send Message (if applicable)
        if (message) {
            await addDoc(collection(db, PUBLIC_MESSAGES_COLLECTION), {
                userId: selectedUserId,
                sender: 'Admin',
                message: message,
                read: false,
                type: 'broadcast',
                timestamp: new Date().toISOString()
            });
        }

        modalStatus.textContent = 'Action completed successfully!';
        modalStatus.style.color = 'green';

        setTimeout(() => {
            messageModal.style.display = 'none';
        }, 1500);

    } catch (error) {
        modalStatus.textContent = error.message;
        modalStatus.style.color = 'red';
        console.error("Messaging/Billing Error:", error);
    }
});


// === Event Listeners Setup ===

function addTableEventListeners() {
    // 1. Balance Update & Messaging Button Listeners (re-attached on render)
    document.querySelectorAll('.update-btn').forEach(button => {
        button.onclick = null; // Clear existing listeners
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = button.getAttribute('data-userid');
            const input = document.getElementById(`balance-input-${userId}`);
            const newBalance = parseFloat(input.value);

            if (isNaN(newBalance) || newBalance < 0) {
                return showMessage('Enter a valid non-negative balance.', 'error');
            }
            updateUserBalance(userId, newBalance);
        });
    });

    document.querySelectorAll('.send-message-btn').forEach(button => {
        button.onclick = null; // Clear existing listeners
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedUserId = button.getAttribute('data-userid');
            const username = button.getAttribute('data-username');
            const user = users.find(u => u.id === selectedUserId);
            
            modalUserInfo.textContent = `To: ${username || user.email} (ID: ${selectedUserId.substring(0, 8)}...)`;
            messageText.value = '';
            billingAmount.value = '';
            modalStatus.textContent = '';
            messageModal.style.display = 'flex';
        });
    });

    // 2. Ban/Freeze/Delete Action Listeners (re-attached on render)
    if (usersTableBody) {
        usersTableBody.removeEventListener('click', handleUserActionsClick);
        usersTableBody.addEventListener('click', handleUserActionsClick);
    }
}

function handleUserActionsClick(e) {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;

    const userId = btn.dataset.userId;
    const action = btn.dataset.action;
    const user = users.find(u => u.id == userId);
    if (!user) return;
    
    if (action === 'delete') {
        showConfirmation(
            'Confirm Permanent Deletion',
            `Are you SURE you want to DELETE user ${user.username} (ID: ${userId.substring(0, 8)}...) and all their data? This is **permanent**.`,
            (confirmed) => {
                if (confirmed) {
                    handleUserAction(userId, action);
                }
            }
        );
    } else {
        handleUserAction(userId, action);
    }
}


// 3. Transaction Approval/Rejection Listeners (one listener on the table body)
if (transactionsTableBody) {
    transactionsTableBody.addEventListener('click', (e) => {
        const txBtn = e.target.closest('.approve-btn, .reject-btn');
        if (!txBtn) return;

        const txId = txBtn.getAttribute('data-txid');
        const action = txBtn.classList.contains('approve-btn') ? 'approve' : 'reject';
        const tx = transactions.find(t => t.id == txId);
        if (!tx) return;
        
        showConfirmation(
            `${action.toUpperCase()} Transaction?`,
            `Confirm ${action} for ${tx.type} of $${Number(tx.amount).toFixed(2)} for user ${tx.userId.substring(0, 8)}...`,
            (confirmed) => {
                if (confirmed) {
                    if (action === 'approve') {
                        approveTransaction(tx);
                    } else {
                        rejectTransaction(txId);
                    }
                }
            }
        );
    });
}


// === UI & Sidebar Logic ===

// (Sidebar and Theme Toggle logic remains the same)
const mediaQuery = window.matchMedia("(max-width: 768px)");

const toggleSidebar = () => {
    dashboardContainer.classList.toggle("sidebar-collapsed");
    sidebarToggleBtn.classList.toggle("is-active");

    if (hamburgerIcon.classList.contains("fa-bars")) {
        hamburgerIcon.classList.replace("fa-bars", "fa-times");
    } else {
        hamburgerIcon.classList.replace("fa-times", "fa-bars");
    }
};

sidebarToggleBtn.addEventListener("click", toggleSidebar);
mobileOverlay?.addEventListener("click", toggleSidebar);

const setInitialSidebarState = () => {
    // Ensures sidebar collapses correctly on desktop and shows/hides properly on mobile
    if (mediaQuery.matches) {
        dashboardContainer.classList.remove("sidebar-collapsed");
    }
    hamburgerIcon.classList.remove("fa-times");
    hamburgerIcon.classList.add("fa-bars");
    sidebarToggleBtn.classList.remove("is-active");
};

setInitialSidebarState();
mediaQuery.addEventListener("change", setInitialSidebarState);

themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    if (isDark) {
        themeIcon.classList.replace("fa-moon", "fa-sun");
        localStorage.setItem('theme', 'dark-mode');
    } else {
        themeIcon.classList.replace("fa-sun", "fa-moon");
        localStorage.setItem('theme', 'light-mode');
    }
});

profileDropdown?.addEventListener("click", (e) => {
    dropdownMenu.classList.toggle("hidden");
    e.stopPropagation();
});

document.addEventListener("click", (e) => {
    if (profileDropdown && !profileDropdown.contains(e.target)) {
        dropdownMenu?.classList.add("hidden");
    }
});

// Logout handlers
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        await signOut(auth);
        // The HTML auth listener should handle redirection
    } catch (error) {
        showMessage(`Logout failed: ${error.message}`, 'error');
    }
};

if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (dropdownLogout) dropdownLogout.addEventListener('click', handleLogout);


// === Initialization ===

async function init() {
    // 🛑 WAIT for Firebase to initialize in the HTML 🛑
    const checkFirebaseReady = setInterval(() => {
        if (window.db && window.auth) {
            clearInterval(checkFirebaseReady);
            db = window.db;
            auth = window.auth;
            
            // Start listening to data
            setupUsersListener(); 
            if (transactionsTableBody) {
                setupTransactionsListener();
            }

            // Optional: Update welcome message
            const adminNameEl = document.getElementById('admin-user-name');
            if (adminNameEl && window.currentUser) {
                adminNameEl.textContent = `Welcome, Admin`;
            }

            console.log("Admin Dashboard initialized with Firestore listeners.");
        }
    }, 100); 
}

init();