document.addEventListener('DOMContentLoaded', () => {

    // 🛑 REMOVED: const auth = window.auth; and const db = window.db; 
    // These are no longer needed as database operations are server-side.

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
    const strengthBar = document.getElementById('strengthBar');
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

    // ✅ UPDATED: Username availability check now uses Fetch API to query the server
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
            // 🌐 Call the server endpoint to check username (Server handles the SQL query)
            const response = await fetch('/api/check-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (data.isAvailable) { // Server responds with { isAvailable: true }
                usernameFeedback.textContent = 'Username available.';
                usernameFeedback.classList.add('valid');
                usernameInput.classList.add('valid');
                return true;
            } else {
                displayError(usernameError, 'This username is already taken.');
                usernameFeedback.textContent = 'Username taken.';
                usernameInput.classList.add('invalid');

                // Generate suggestions (still client-side for UX)
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
            usernameFeedback.textContent = '';
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
            phoneFeedback.textContent = '';
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
            // Add a small delay for debounce in a real app
            checkUsernameAvailability(value);
        } else {
            clearError(usernameError);
            usernameFeedback.textContent = '';
            usernameSuggestions.style.display = 'none';
        }
    });

    // ✅ FORM SUBMISSION (updated to use FETCH to talk to the SQL server API)
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

        // --- Prepare Data for Server ---
        const registrationData = {
            fullName: fullNameInput.value.trim(),
            username: usernameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            password: passwordInput.value, // Send plain password for server to hash
            accountType: accountTypeInput.value,
            country: countryInput.value,
            currency: currencyInput.value,
            // Only send confirmation of agreement, as server can't read checkbox state directly
            agreedToTerms: termsCheckbox.checked, 
            ageAgreed: agreeCheckbox.checked 
        };

        showModal('Registering...', 'Creating your account...', false, true);

        try {
            // 🌐 Send data to server API endpoint
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });

            const result = await response.json();

            if (response.ok) {
                // HTTP 200-299 status code means success
                showModal('Registration Successful', `Welcome, ${registrationData.username}! Redirecting to login...`, false);
                form.reset();
                setTimeout(() => {
                    window.location.href = "../login/login.html";
                }, 2000);
            } else {
                // Server responded with an error (e.g., 400 Bad Request, 500 Server Error)
                let errorMessage = result.message || "An unexpected error occurred during registration.";

                // Example: Handle specific server-side errors
                if (result.errorType === 'EMAIL_TAKEN') {
                    errorMessage = 'This email is already registered. Please log in.';
                } else if (result.errorType === 'USERNAME_TAKEN') {
                    errorMessage = 'This username is already registered.';
                    // You might want to re-run suggestions here
                }
                
                showModal('Registration Failed', errorMessage, true);
            }

        } catch (error) {
            console.error('Network or Server error:', error);
            showModal('Registration Failed', 'Could not connect to the server. Please check your internet connection and try again.', true);
        } finally {
            isSubmitting = false; // 🔓 Always reset
        }
    });
});