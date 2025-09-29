document.addEventListener('DOMContentLoaded', () => {

    // ✅ FIXED: Access Firebase from global scope (must be initialized in HTML)
    const auth = window.auth;
    const db = window.db;

    if (!auth || !db) {
        alert("Firebase not loaded. Check your HTML script tags.");
        return;
    }

    // --- DOM Elements ---
    const form = document.getElementById('registrationForm');
    const fullNameInput = document.getElementById('fullName');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const agreeCheckbox = document.getElementById('agree');
    const accountTypeInput = document.getElementById('accountType');
    const countryInput = document.getElementById('country');
    const currencyInput = document.getElementById('currency');

    // Modal elements
    const modal = document.getElementById('modal');
    const closeModalBtn = document.getElementById('closeModal');
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
    const ageAgreementError = document.getElementById('ageAgreementError');

    // Feedback elements
    const usernameFeedback = document.getElementById('usernameFeedback');
    const usernameSuggestions = document.getElementById('usernameSuggestions');
    const phoneFeedback = document.getElementById('phoneFeedback');
    const strengthBar = document.getElementById('strengthBar'); // ✅ Ensure HTML has "strength-bar" (not "stength-bar")
    const strengthText = document.getElementById('strengthText');
    const psi = document.querySelector('.password-strength-indicator');

    // 🔒 NEW: Prevent multiple submissions
    let isSubmitting = false;

    // 💬 Unified modal function
    const showModal = (title, message, isError = true, showSpinner = false) => {
        if (modalTitle) modalTitle.textContent = title;
        if (modalMessage) modalMessage.textContent = message;
        if (modalIcon) {
            if (showSpinner) {
                modalIcon.classList.add('hidden');
            } else {
                modalIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
                modalIcon.style.color = isError ? 'red' : 'green';
                modalIcon.classList.remove('hidden');
            }
        }
        if (modalSpinner) modalSpinner.style.display = showSpinner ? 'block' : 'none';
        if (modal) modal.style.display = "block";
    };

    // Close modal
    if (closeModalBtn) {
        closeModalBtn.onclick = () => {
            if (modal) modal.style.display = "none";
        };
    }
    window.onclick = (event) => {
        if (event.target === modal && modal) modal.style.display = "none";
    };

    // Utility: Display error
    const displayError = (element, message) => {
        if (!element) return;
        element.textContent = message;
        element.style.display = 'block';
        const input = element.previousElementSibling?.nextElementSibling || element.previousElementSibling;
        if (input && (input.tagName === 'INPUT' || input.tagName === 'SELECT')) {
            input.classList.add('invalid');
            input.classList.remove('valid');
        }
    };

    // Utility: Clear error
    const clearError = (element) => {
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        const input = element.previousElementSibling?.nextElementSibling || element.previousElementSibling;
        if (input && (input.tagName === 'INPUT' || input.tagName === 'SELECT')) {
            input.classList.remove('invalid');
            input.classList.add('valid');
        }
    };

    // --- Validation Functions ---
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

    const checkUsernameAvailability = async (username) => {
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
            return false;
        }

        usernameFeedback.textContent = 'Checking availability...';
        try {
            const q = db.collection("users").where("username", "==", username);
            const querySnapshot = await q.get();

            if (querySnapshot.empty) {
                usernameFeedback.textContent = 'Username available.';
                usernameFeedback.classList.add('valid');
                usernameInput.classList.add('valid');
                return true;
            } else {
                displayError(usernameError, 'This username is already taken.');
                usernameFeedback.textContent = 'Username taken.';
                usernameInput.classList.add('invalid');

                const base = username.replace(/\d+$/, '') || username;
                const suggestions = [
                    base + Math.floor(100 + Math.random() * 900),
                    base + '_trader',
                    base + '2025'
                ].filter(s => s.length >= 6);

                usernameSuggestions.innerHTML = '<strong>Suggestions:</strong>';
                suggestions.forEach(s => {
                    const li = document.createElement('li');
                    li.textContent = s;
                    li.style.padding = '4px 8px';
                    li.style.cursor = 'pointer';
                    li.style.borderRadius = '4px';
                    li.onmouseover = () => li.style.backgroundColor = '#f0f0f0';
                    li.onmouseout = () => li.style.backgroundColor = '';
                    li.onclick = () => {
                        usernameInput.value = s;
                        usernameInput.dispatchEvent(new Event('input'));
                    };
                    usernameSuggestions.appendChild(li);
                });
                usernameSuggestions.style.display = 'block';
                return false;
            }
        } catch (error) {
            console.error("Username check error:", error);
            displayError(usernameError, 'Error checking availability. Try again.');
            return false;
        }
    };

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

    const validatePhone = () => {
        const phone = phoneInput.value.trim();
        const phoneRegex = /^\+?[0-9]{7,15}$/;
        if (phone === '') {
            // Optional field, no error
            return true;
        }
        if (!phoneRegex.test(phone)) {
            phoneFeedback.textContent = 'Enter a valid phone number (e.g., +1234567890)';
            phoneFeedback.classList.remove('valid');
            return false;
        } else {
            phoneFeedback.textContent = 'Valid phone number';
            phoneFeedback.classList.add('valid');
            return true;
        }
    };

    const checkPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(password)) strength++;

        if (psi) psi.style.display = password ? 'block' : 'none';
        if (!strengthBar || !strengthText) return { strength, feedback: '' };

        strengthBar.className = 'strength-bar';
        strengthBar.style.width = '0%';
        strengthText.textContent = '';

        if (password.length === 0) return { strength: 0, feedback: '' };
        if (strength < 3) {
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
        return { strength, feedback: '' };
    };

    const validatePassword = () => {
        const password = passwordInput.value;
        const { strength } = checkPasswordStrength(password);
        if (password.length === 0) {
            displayError(passwordError, 'Password is required.');
            return false;
        }
        if (strength < 5) {
            displayError(passwordError, 'Password is too weak. Include uppercase, lowercase, number, and special character.');
            return false;
        }
        clearError(passwordError);
        return true;
    };

    const validateConfirmPassword = () => {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        if (confirmPassword === '') {
            displayError(confirmPasswordError, 'Confirm Password is required.');
            return false;
        }
        if (password !== confirmPassword) {
            displayError(confirmPasswordError, 'Passwords do not match.');
            return false;
        }
        clearError(confirmPasswordError);
        return true;
    };

    const validateTerms = () => {
        if (!termsCheckbox.checked) {
            displayError(termsError, 'You must agree to the Terms and Conditions.');
            return false;
        }
        clearError(termsError);
        return true;
    };
    
    const validateAgeAgreement = () => {
        if (!agreeCheckbox.checked) {
            displayError(ageAgreementError, 'You must confirm your age and accept the Service Agreement.');
            return false;
        }
        clearError(ageAgreementError);
        return true;
    };

    // ✅ REAL-TIME VALIDATION (as user types)
    fullNameInput.addEventListener('input', validateFullName);
    emailInput.addEventListener('input', validateEmail);
    phoneInput.addEventListener('input', validatePhone);
    passwordInput.addEventListener('input', () => {
        validatePassword();
        validateConfirmPassword();
    });
    confirmPasswordInput.addEventListener('input', validateConfirmPassword);
    termsCheckbox.addEventListener('change', validateTerms);
    agreeCheckbox.addEventListener('change', validateAgeAgreement);

    // ✅ VALIDATION ON FOCUS LOSS (blur)
    fullNameInput.addEventListener('blur', validateFullName);
    emailInput.addEventListener('blur', validateEmail);
    phoneInput.addEventListener('blur', validatePhone);
    passwordInput.addEventListener('blur', validatePassword);
    confirmPasswordInput.addEventListener('blur', validateConfirmPassword);
    usernameInput.addEventListener('blur', () => {
        if (usernameInput.value.trim()) {
            checkUsernameAvailability(usernameInput.value.trim());
        }
    });

    // ✅ USERNAME INPUT (real-time)
    usernameInput.addEventListener('input', () => {
        const value = usernameInput.value.trim();
        if (value.length > 0) {
            checkUsernameAvailability(value);
        } else {
            clearError(usernameError);
            usernameFeedback.textContent = '';
            usernameSuggestions.style.display = 'none';
        }
    });

    // ✅ FORM SUBMISSION (with async safety)
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // 🔒 Prevent multiple submissions
        if (isSubmitting) return;
        isSubmitting = true;

        // Run synchronous validations first
        const isFullNameValid = validateFullName();
        const isEmailValid = validateEmail();
        const isPhoneValid = validatePhone();
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();
        const isTermsValid = validateTerms();
        const isAgeAgreementValid = validateAgeAgreement();

        if (!isFullNameValid || !isEmailValid || !isPhoneValid || 
            !isPasswordValid || !isConfirmPasswordValid || 
            !isTermsValid || !isAgeAgreementValid) {
            isSubmitting = false;
            showModal('Validation Error', 'Please correct all form errors.', true);
            return;
        }

        // Check username (async)
        const isUsernameAvailable = await checkUsernameAvailability(usernameInput.value.trim());
        if (!isUsernameAvailable) {
            isSubmitting = false;
            return; // Error already shown
        }

        // Proceed with registration
        const fullName = fullNameInput.value.trim();
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const accountType = accountTypeInput.value;
        const country = countryInput.value;
        const currency = currencyInput.value;

        showModal('Registering...', 'Creating your account...', false, true);

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await user.updateProfile({ displayName: username });

            await db.collection("users").doc(user.uid).set({
                fullName: fullName,
                username: username,
                email: email,
                phone: phone,
                accountType: accountType,
                country: country,
                currency: currency,
                balance: 0.00,
                roi: 0.00,
                deposits: 0.00,
                activeTrades: 0,
                isFrozen: false,
                isBanned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            showModal('Registration Successful', `Welcome, ${username}! Redirecting to login...`, false);
            form.reset();
            setTimeout(() => {
                window.location.href = "../login/login.html";
            }, 2000);

        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = "An unexpected error occurred.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Please log in.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak.';
            }
            showModal('Registration Failed', errorMessage, true);
        } finally {
            isSubmitting = false; // 🔓 Always reset
        }
    });
});