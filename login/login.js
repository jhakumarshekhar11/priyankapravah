/**
 * login.js — Email/Password & Phone OTP sign-in for Priyanka Pravah
 *
 * Imports from your existing firebaseconfig.js. Add these named exports
 * to firebaseconfig.js if they are not already present:
 *
 *   signInWithEmailAndPassword, sendPasswordResetEmail,
 *   RecaptchaVerifier, signInWithPhoneNumber, setPersistence,
 *   browserLocalPersistence, browserSessionPersistence
 *
 * The Google button is handled by globalauth.js (existing .google-btn listener).
 * This file only owns: email form, phone form, OTP form, and the UI toggle.
 */

import {
    auth,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
} from '../firebaseconfig.js';

// ─── Toast (reuse same function pattern as globalauth.js) ────────────────────
function showToast(message, type = 'default') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ─── Button loading helper ───────────────────────────────────────────────────
function setLoading(btn, state) {
    if (state) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ─── Redirect after successful login ────────────────────────────────────────
function redirectAfterLogin() {
    const intended = sessionStorage.getItem('intendedPath');
    sessionStorage.removeItem('intendedPath');
    window.location.replace(intended || '/rcorner/');
}

// ════════════════════════════════════════════════════════════════════════════
// 1. METHOD TOGGLE (Email ↔ Phone)
// ════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    const toggle      = document.getElementById('method-toggle');
    const tabEmail    = document.getElementById('tab-email');
    const tabPhone    = document.getElementById('tab-phone');
    const panelEmail  = document.getElementById('panel-email');
    const panelPhone  = document.getElementById('panel-phone');

    function activateTab(tab) {
        if (tab === 'email') {
            toggle.classList.remove('phone-active');
            tabEmail.classList.add('active');
            tabPhone.classList.remove('active');
            panelEmail.classList.add('active');
            panelPhone.classList.remove('active');
        } else {
            toggle.classList.add('phone-active');
            tabPhone.classList.add('active');
            tabEmail.classList.remove('active');
            panelPhone.classList.add('active');
            panelEmail.classList.remove('active');
            // Initialise reCAPTCHA the first time phone panel is opened
            initRecaptcha();
        }
    }

    tabEmail.addEventListener('click', () => activateTab('email'));
    tabPhone.addEventListener('click', () => activateTab('phone'));

    // ════════════════════════════════════════════════════════════════════════
    // 2. PASSWORD VISIBILITY TOGGLE
    // ════════════════════════════════════════════════════════════════════════
    const passwordInput = document.getElementById('password');
    const eyeToggle     = document.getElementById('eye-toggle');
    const eyeOpen       = document.getElementById('eye-open');
    const eyeClosed     = document.getElementById('eye-closed');

    eyeToggle.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        eyeOpen.style.display   = isHidden ? 'none'  : '';
        eyeClosed.style.display = isHidden ? ''      : 'none';
    });

    // ════════════════════════════════════════════════════════════════════════
    // 3. EMAIL / PASSWORD LOGIN
    // ════════════════════════════════════════════════════════════════════════
    const emailForm   = document.getElementById('email-form');
    const rememberMe  = document.getElementById('remember-me');
    const forgotLink  = document.getElementById('forgot-link');

    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const btn      = emailForm.querySelector('button[type="submit"]');

        if (!email || !password) {
            showToast('Please fill in all fields.', 'error'); return;
        }

        setLoading(btn, true);

        try {
            // Honour "Remember me" — persist session accordingly
            const persistence = rememberMe.checked
                ? browserLocalPersistence
                : browserSessionPersistence;
            await setPersistence(auth, persistence);

            await signInWithEmailAndPassword(auth, email, password);
            showToast('Welcome back!', 'success');
            redirectAfterLogin();
        } catch (err) {
            setLoading(btn, false);
            showToast(friendlyEmailError(err.code), 'error');
        }
    });

    // Forgot password
    forgotLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        if (!email) {
            showToast('Enter your email address above first.', 'error'); return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            showToast('Password reset link sent! Check your inbox.', 'success');
        } catch (err) {
            showToast(friendlyEmailError(err.code), 'error');
        }
    });

    function friendlyEmailError(code) {
        const map = {
            'auth/user-not-found':       'No account found with this email.',
            'auth/wrong-password':       'Incorrect password. Try again.',
            'auth/invalid-credential':   'Incorrect email or password.',
            'auth/invalid-email':        'Please enter a valid email address.',
            'auth/user-disabled':        'This account has been disabled.',
            'auth/too-many-requests':    'Too many attempts. Please wait a moment.',
            'auth/network-request-failed': 'Network error. Check your connection.',
        };
        return map[code] || 'Sign-in failed. Please try again.';
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. reCAPTCHA SETUP (invisible, required for phone auth)
    // ════════════════════════════════════════════════════════════════════════
    let recaptchaVerifier = null;
    let recaptchaInitialised = false;

    function initRecaptcha() {
        if (recaptchaInitialised) return;
        recaptchaInitialised = true;

        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',          // invisible — no visible checkbox
            callback: () => {},         // called when reCAPTCHA is solved
            'expired-callback': () => {
                showToast('CAPTCHA expired. Please try again.', 'error');
                recaptchaVerifier.clear();
                recaptchaInitialised = false;
            },
        });

        // Pre-render so it is ready when the user hits Send OTP
        recaptchaVerifier.render().catch(() => {
            // Silently fail if already rendered
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. PHONE LOGIN — Step 1: Send OTP
    // ════════════════════════════════════════════════════════════════════════
    const phoneForm      = document.getElementById('phone-form');
    const phoneStep      = document.getElementById('phone-step');
    const otpStep        = document.getElementById('otp-step');
    const otpPhoneDisplay = document.getElementById('otp-phone-display');

    let confirmationResult = null; // Firebase confirmation object
    let fullPhoneNumber    = '';

    phoneForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const countryCode = document.getElementById('country-code').value;
        const localNumber = document.getElementById('phone-number').value.trim().replace(/\s+/g, '');

        if (!localNumber || localNumber.length < 7) {
            showToast('Enter a valid phone number.', 'error'); return;
        }

        fullPhoneNumber = countryCode + localNumber;
        const btn = phoneForm.querySelector('button[type="submit"]');
        setLoading(btn, true);

        try {
            confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifier);
            showToast('OTP sent! Check your messages.', 'success');

            // Show OTP step
            otpPhoneDisplay.textContent = fullPhoneNumber;
            phoneStep.style.display = 'none';
            otpStep.classList.add('active');
            startCountdown();

            // Focus first OTP box
            document.querySelector('#otp-inputs input').focus();
        } catch (err) {
            setLoading(btn, false);
            showToast(friendlyPhoneError(err.code), 'error');

            // Reset reCAPTCHA so user can retry
            recaptchaVerifier.clear();
            recaptchaInitialised = false;
            initRecaptcha();
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // 6. OTP INPUT — auto-advance, backspace, paste handling
    // ════════════════════════════════════════════════════════════════════════
    const otpInputsContainer = document.getElementById('otp-inputs');
    const otpBoxes = Array.from(otpInputsContainer.querySelectorAll('input'));

    otpBoxes.forEach((box, i) => {
        box.addEventListener('input', (e) => {
            // Allow only digits
            box.value = box.value.replace(/\D/g, '').slice(0, 1);
            box.classList.toggle('filled', box.value.length === 1);

            if (box.value && i < otpBoxes.length - 1) {
                otpBoxes[i + 1].focus();
            }
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && i > 0) {
                otpBoxes[i - 1].value = '';
                otpBoxes[i - 1].classList.remove('filled');
                otpBoxes[i - 1].focus();
            }
        });

        // Paste: spread digits across boxes
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData)
                .getData('text')
                .replace(/\D/g, '')
                .slice(0, 6);
            pasted.split('').forEach((digit, idx) => {
                if (otpBoxes[idx]) {
                    otpBoxes[idx].value = digit;
                    otpBoxes[idx].classList.add('filled');
                }
            });
            // Focus the box after the last filled digit
            const nextEmpty = otpBoxes.find(b => !b.value);
            if (nextEmpty) nextEmpty.focus();
            else otpBoxes[otpBoxes.length - 1].focus();
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 7. OTP FORM — Step 2: Verify
    // ════════════════════════════════════════════════════════════════════════
    const otpForm = document.getElementById('otp-form');

    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = otpBoxes.map(b => b.value).join('');

        if (otp.length < 6) {
            showToast('Please enter all 6 digits.', 'error'); return;
        }
        if (!confirmationResult) {
            showToast('Session expired. Please request a new OTP.', 'error'); return;
        }

        const btn = otpForm.querySelector('button[type="submit"]');
        setLoading(btn, true);

        try {
            await confirmationResult.confirm(otp);
            showToast('Phone verified! Welcome.', 'success');
            redirectAfterLogin();
        } catch (err) {
            setLoading(btn, false);
            // Clear boxes on wrong OTP so user retypes
            otpBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
            otpBoxes[0].focus();
            showToast(friendlyPhoneError(err.code), 'error');
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // 8. BACK BUTTON (OTP → Phone step)
    // ════════════════════════════════════════════════════════════════════════
    document.getElementById('back-to-phone').addEventListener('click', () => {
        otpStep.classList.remove('active');
        phoneStep.style.display = '';
        otpBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
        confirmationResult = null;
        clearInterval(countdownInterval);
    });

    // ════════════════════════════════════════════════════════════════════════
    // 9. RESEND COUNTDOWN
    // ════════════════════════════════════════════════════════════════════════
    let countdownInterval = null;

    function startCountdown(seconds = 30) {
        const timerEl   = document.getElementById('resend-timer');
        const countEl   = document.getElementById('countdown');
        const resendBtn = document.getElementById('resend-btn');

        timerEl.style.display   = '';
        resendBtn.style.display = 'none';
        resendBtn.disabled      = true;

        let remaining = seconds;
        countEl.textContent = remaining;

        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            remaining--;
            countEl.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                timerEl.style.display   = 'none';
                resendBtn.style.display = '';
                resendBtn.disabled      = false;
            }
        }, 1000);
    }

    document.getElementById('resend-btn').addEventListener('click', async () => {
        const btn = document.getElementById('resend-btn');
        btn.disabled = true;

        try {
            // reCAPTCHA must be re-initialised for a fresh request
            if (recaptchaVerifier) {
                try { recaptchaVerifier.clear(); } catch (_) {}
            }
            recaptchaInitialised = false;
            initRecaptcha();

            confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifier);
            showToast('New OTP sent!', 'success');
            otpBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
            otpBoxes[0].focus();
            startCountdown();
        } catch (err) {
            btn.disabled = false;
            showToast(friendlyPhoneError(err.code), 'error');
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // 10. PHONE ERROR MESSAGES
    // ════════════════════════════════════════════════════════════════════════
    function friendlyPhoneError(code) {
        const map = {
            'auth/invalid-phone-number':    'Invalid phone number. Include the country code.',
            'auth/too-many-requests':       'Too many attempts. Please wait a few minutes.',
            'auth/invalid-verification-code': 'Wrong OTP. Please try again.',
            'auth/code-expired':            'OTP expired. Request a new one.',
            'auth/quota-exceeded':          'SMS quota exceeded. Please try later.',
            'auth/captcha-check-failed':    'CAPTCHA check failed. Please reload and retry.',
            'auth/network-request-failed':  'Network error. Check your connection.',
            'auth/session-expired':         'Session expired. Please request a new OTP.',
        };
        return map[code] || 'Something went wrong. Please try again.';
    }

}); // end DOMContentLoaded