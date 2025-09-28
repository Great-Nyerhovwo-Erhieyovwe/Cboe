// 🛑 FIREBASE IMPORTS 🛑
import { 
    createUserWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


// ❌ REMOVED: JSON Server URL is obsolete
// const API_USERS = 'https://cboejsonserver.onrender.com/api/users'; 

// 🛑 FIREBASE SERVICES (Accessed globally from the HTML script) 🛑
const auth = window.auth;
const db = window.db; 

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const form = document.getElementById('registrationForm');
    const fullNameInput = document.getElementById('fullName');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const agreeCheckbox = document.getElementById('agree'); // NEW: Added age/service agreement
    const accountTypeInput = document.getElementById('accountType'); // NEW
    const countryInput = document.getElementById('country'); // NEW
    const currencyInput = document.getElementById('currency'); // NEW

    // Modal elements (Unified for consistency)
    const modal = document.getElementById('modal');
    const closeModalBtn = document.getElementById('closeModal'); // Used ID from updated HTML
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalIcon = document.getElementById('modalIcon');
    const modalSpinner = document.getElementById('modalSpinner');

    // Error elements
    const fullNameError = document.getElementById('fullNameError');
    const usernameError = document.getElementById('usernameError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const termsError = document.getElementById('termsError');
    const ageAgreementError = document.getElementById('ageAgreementError'); // NEW: For the 'agree' checkbox

    // Feedback elements
    const usernameFeedback = document.getElementById('usernameFeedback');
    const usernameSuggestions = document.getElementById('usernameSuggestions');
    const phoneFeedback = document.getElementById('phoneFeedback');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const psi = document.querySelector('.password-strength-indicator');

    // Toggle icons (Used IDs from updated HTML)
    const togglePwd = document.getElementById('togglePwd');
    const toggleConfirmPwd = document.getElementById('toggleConfirmPwd');

    // 💬 NEW: Function to display the unified modal
    const showModal = (title, message, isError = true, showSpinner = false) => {
        if (modalTitle) modalTitle.textContent = title;
        if (modalMessage) modalMessage.textContent = message;
        
        if (modalIcon) {
            if (showSpinner) {
                modalIcon.className = 'hidden';
            } else {
                modalIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
                modalIcon.style.color = isError ? 'red' : 'green';
                modalIcon.classList.remove('hidden');
            }
        }
        if (modalSpinner) modalSpinner.style.display = showSpinner ? 'block' : 'none';
        if (modal) modal.style.display = "block";
    };

    // ❌ Close modal handlers (Unified)
    if (closeModalBtn) {
        closeModalBtn.onclick = function () {
            if (modal) modal.style.display = "none";
        };
    }

    window.onclick = function (event) {
        if (event.target === modal) {
            if (modal) modal.style.display = "none";
        }
    };
    
    // 👁️ Toggle password visibility for both fields
    /*
    const setupPasswordToggle = (toggleElement, inputElement) => {
        if (toggleElement && inputElement) {
            toggleElement.addEventListener('click', () => {
                const isPassword = inputElement.type === 'password';
                inputElement.type = isPassword ? 'text' : 'password';
                toggleElement.classList.toggle('fa-eye-slash', isPassword);
                toggleElement.classList.toggle('fa-eye', !isPassword);
                toggleElement.style.color = isPassword ? '#666' : '#0066cc';
            });
        }
    };

    setupPasswordToggle(togglePwd, passwordInput);
    setupPasswordToggle(toggleConfirmPwd, confirmPasswordInput);
    */
    
    // utility function to display error messages
    const displayError = (element, message) => {
        element.textContent = message;
        element.style.display = 'block';
        if (element.previousElementSibling) {
             // Handle the case where the previous sibling is the label, not the input
            let inputElement = element.previousElementSibling;
            if (inputElement.tagName === 'LABEL') {
                inputElement = inputElement.nextElementSibling;
            }
            if (inputElement && (inputElement.tagName === 'INPUT' || inputElement.tagName === 'SELECT')) {
                inputElement.classList.add('invalid');
                inputElement.classList.remove('valid');
            }
        }
    };

    // utility function to clear error messages
    const clearError = (element) => {
        element.textContent = '';
        element.style.display = 'none';
          if (element.previousElementSibling) {
            let inputElement = element.previousElementSibling;
            if (inputElement.tagName === 'LABEL') {
                inputElement = inputElement.nextElementSibling;
            }
            if (inputElement && (inputElement.tagName === 'INPUT' || inputElement.tagName === 'SELECT')) {
                inputElement.classList.remove('invalid');
                inputElement.classList.add('valid');
            }
        }
    };

    // --- Validation Functions ---
    // Full Name Validation
    const validateFullName = () => {
        const fullName = fullNameInput.value.trim();
        if (fullName === '') {
            displayError(fullNameError, 'Full Name is required.');
            return false;
        } else if (fullName.length < 3) {
            displayError(fullNameError, 'Full Name must be at least 3 characters.');
            return false;
        } else {
            clearError(fullNameError);
            return true;
        }
    };

    // 💬 MODIFIED: Username check now uses Firestore and standard error display
    // Username check is an ASYNCHRONOUS operation now
    const checkUsernameAvailability = async (username) => {
        // 1. Clear previous errors/feedback
        clearError(usernameError);
        usernameSuggestions.innerHTML = '';
        usernameSuggestions.style.display = 'none';
        usernameInput.classList.remove('valid', 'invalid');

        if (username === '') {
            displayError(usernameError, 'Username is required.');
            usernameFeedback.textContent = '';
            return false;
        }

        if (username.length < 6) {
            displayError(usernameError, 'Username must be at least 6 characters.');
            usernameFeedback.textContent = 'Minimum 6 characters required.';
            usernameFeedback.classList.remove('valid');
            return false;
        }

        usernameFeedback.textContent = 'Checking availability...';
        usernameFeedback.classList.remove('valid');

        const usernameQuery = query(collection(db, "users"), where("username", "==", username));
        
        try {
            const querySnapshot = await getDocs(usernameQuery);

            if (querySnapshot.empty) {
                // ✅ AVAILABLE
                usernameFeedback.textContent = 'Username available.';
                usernameFeedback.classList.add('valid');
                usernameInput.classList.add('valid');
                return true;
            } else {
                // ❌ TAKEN - Use the main error display for a critical failure
                displayError(usernameError, 'This username is already taken.');
                usernameFeedback.textContent = 'Username taken.';
                usernameFeedback.classList.remove('valid');
                usernameInput.classList.add('invalid');

                // Generate and display suggestions
                const suggestions = [
                    username + Math.floor(Math.random() * 100),
                    username + '_01',
                    username + 'user',
                ];
                usernameSuggestions.innerHTML = 'Suggestions:';
                
                // Add click listeners to suggestions
                suggestions.forEach(s => {
                    const li = document.createElement('li');
                    li.textContent = s;
                    li.className = 'suggestion-item cursor-pointer hover:bg-gray-100 p-1 rounded-md';
                    li.addEventListener('click', () => {
                        usernameInput.value = s;
                        usernameInput.dispatchEvent(new Event('input')); // Re-check availability on select
                    });
                    usernameSuggestions.appendChild(li);
                });
                usernameSuggestions.style.display = 'block';
                return false;
            }
        } catch (error) {
            console.error("Error checking username:", error);
            displayError(usernameError, 'Error checking availability. Try again.');
            usernameFeedback.textContent = 'Error during check.';
            usernameFeedback.classList.remove('valid');
            return false;
        }
    };

    // Username input listener
    usernameInput.addEventListener('input', () => {
        const value = usernameInput.value.trim();
        if (value.length > 0) {
            checkUsernameAvailability(value);
        } else {
            usernameFeedback.textContent = '';
            usernameSuggestions.innerHTML = '';
            usernameSuggestions.style.display = 'none';
            clearError(usernameError);
        }
    });


    // Email Validation (synchronous check for format only)
    const validateEmail = () => {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email === '') {
            displayError(emailError, 'Email is required.');
            return false;
        } else if (!emailRegex.test(email)) {
            displayError(emailError, 'Please enter a valid email address.');
            return false;
        } else {
            clearError(emailError);
            return true;
        }
    };

    // Phone Number validation
    phoneInput.addEventListener('input', () => {
        const value = phoneInput.value.trim();
        const phoneRegex = /^\+?[0-9]{7,15}$/; // supports international format
        if (!phoneRegex.test(value) && value.length > 0) {
            phoneFeedback.textContent = 'Enter a valid phone number (e.g., +1234567890)';
            phoneFeedback.classList.remove('valid');
        } else if (value.length === 0) {
            phoneFeedback.textContent = '';
            phoneFeedback.classList.remove('valid');
        } else {
            phoneFeedback.textContent = 'Valid phone number';
            phoneFeedback.classList.add('valid');
        }
    });

    // Password Strength Check (Unchanged logic)
    const checkPasswordStrength = (password) => {
        let strength = 0;
        let feedback = '';

        if (password.length >= 8) {
            strength += 1;
        } else {
            feedback += 'Password should be at least 8 characters. ';
        }
        if (/[A-Z]/.test(password)) {
            strength += 1;
        } else {
            feedback += 'Include upperCase letters. ';
        }
        if (/[a-z]/.test(password)) {
            strength += 1;
        } else {
            feedback += 'Include lowerCase letters. ';
        }
        if (/[0-9]/.test(password)) {
            strength += 1;
        } else {
            feedback += 'Include numbers. ';
        }
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password)) {
            strength += 1;
        } else {
            feedback += 'Include special characters. ';
        }

        strengthBar.className = 'strength-bar'; 
        if (password.length === 0) {
            strengthBar.style.width = '0%';
            strengthText.textContent = '';
        } else if (strength < 3) {
            strengthBar.style.width = '33%';
            strengthBar.classList.add('weak');
            strengthText.textContent = 'Weak';
            strengthText.style.color = '#dc3545';
        } else if (strength < 5) {
            strengthBar.style.width = '66%';
            strengthBar.classList.add('moderate');
            strengthText.textContent = 'Moderate';
            strengthText.style.color = '#ffc107';
        } else {
            strengthBar.style.width = '100%';
            strengthBar.classList.add('strong');
            strengthText.textContent = 'Strong';
            strengthText.style.color = '#28a745';
        }

        return { strength, feedback };
    };

    // password validation
    const validatePassword = () => {
        const password = passwordInput.value;
        const { strength, feedback } = checkPasswordStrength(password);

        if (password.length === 0) {
            displayError(passwordError, 'Password is required.');
            return false;
        } else if (strength < 5) {
            displayError(passwordError, `Password is too weak. ${feedback.trim()}`);
            return false;
        } else {
            clearError(passwordError);
            return true;
        }
    };

    // Confirm Password Validation
    const validateConfirmPassword = () => {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (confirmPassword === '') {
            displayError(confirmPasswordError, 'Confirm Password is required.');
            return false;
        } else if (password !== confirmPassword) {
            displayError(confirmPasswordError, 'Passwords do not match.');
            return false;
        } else {
            clearError(confirmPasswordError);
            return true;
        }
    };

    // Terms and Condition Validation
    const validateTerms = () => {
        if (!termsCheckbox.checked) {
            displayError(termsError, 'You must agree to the Terms and Conditions.');
            return false;
        } else {
            clearError(termsError);
            return true;
        }
    };
    
    // Age/Service Agreement Validation (NEW)
    const validateAgeAgreement = () => {
        if (!agreeCheckbox.checked) {
            displayError(ageAgreementError, 'You must confirm your age and accept the Service Agreement.');
            return false;
        } else {
            clearError(ageAgreementError);
            return true;
        }
    };

    //  Real-time validation
    fullNameInput.addEventListener('input', validateFullName);
    emailInput.addEventListener('input', validateEmail);
    // Note: Username check handled in its own async listener above
    passwordInput.addEventListener('input', () => {
        psi.style.display = 'block';
        validatePassword();
        validateConfirmPassword(); // Re-validate confirm password if password changes
    });
    confirmPasswordInput.addEventListener('input', validateConfirmPassword);
    termsCheckbox.addEventListener('change', validateTerms);
    agreeCheckbox.addEventListener('change', validateAgeAgreement); // NEW listener


    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Run all synchronous validations
        const isFullNameValid = validateFullName();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();
        const isTermsValid = validateTerms();
        const isAgeAgreementValid = validateAgeAgreement(); // NEW

        // Also run the async username check
        const isUsernameAvailable = await checkUsernameAvailability(usernameInput.value.trim());

        // Check if all validations pass
        if (isFullNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isTermsValid && isAgeAgreementValid && isUsernameAvailable) {
            
            // Extract all form values
            const fullName = fullNameInput.value.trim();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const phone = phoneInput.value.trim();
            const password = passwordInput.value;
            const accountType = accountTypeInput.value;
            const country = countryInput.value;
            const currency = currencyInput.value;


            // Show loading state
            showModal('Registering...', 'Creating your account...', false, true); // true for spinner
            
            try {
                // 1. 🔑 STEP 1: Create user in Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const uid = user.uid;

                // 2. 📝 STEP 2: Update Auth Profile (set display name/username)
                await updateProfile(user, {
                    displayName: username
                });
                
                // 3. 💾 STEP 3: Create User Document in Firestore
                const newUserDoc = {
                    fullName: fullName,
                    username: username,
                    email: email,
                    phone: phone,
                    accountType: accountType,
                    country: country,
                    currency: currency,
                    // Initialize required dashboard/admin fields
                    balance: 0.00,
                    roi: 0.00,
                    deposits: 0.00,
                    activeTrades: 0,
                    isFrozen: false,
                    isBanned: false,
                    createdAt: new Date().toISOString(),
                };

                // Use the Firebase Auth UID as the Firestore document ID
                await setDoc(doc(db, "users", uid), newUserDoc);

                // 4. ✅ Successful Registration
                showModal('Registration Successful', `Welcome, ${username}! Please log in now. Redirecting...`, false); 

                form.reset();
                strengthBar.style.width = '0%';
                strengthText.textContent = '';
                document.querySelectorAll('input, select').forEach(input => {
                    input.classList.remove('valid', 'invalid');
                });
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = "../login/login.html";
                }, 2000);

            } catch (error) {
                console.error('Firebase Registration Error:', error);
                
                let errorMessage = "An unexpected error occurred. Please try again.";

                // 💬 IMPROVED ERROR HANDLING based on Firebase Auth codes
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'This email is already registered. Please log in or use a different email.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'The password is too weak. Please use a stronger password.';
                        break;
                    default:
                        // Fallback to error message, cleaning up "Firebase: " prefix
                        errorMessage = error.message.replace('Firebase: ', '').replace('(auth/', '').replace(').', '');
                        break;
                }
                showModal('Registration Failed', errorMessage, true);
            }

        } else {
            // If any sync or async validation fails
            showModal('Validation Error', '⚠️ Please correct the errors marked in the form.', true);
        }
    });
});