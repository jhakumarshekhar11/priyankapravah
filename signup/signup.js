/**
 * signup.js — Email/Password account creation for Priyanka Pravah
 *
 * Flow:
 *  1. User fills name, email, password, confirm password, ticks terms.
 *  2. Client-side validation runs on blur + on submit.
 *  3. createUserWithEmailAndPassword() creates the Firebase Auth account.
 *  4. updateProfile() sets the display name immediately.
 *  5. A Firestore user document is created under /users/{uid} with safe
 *     public fields (name, email, photoURL, role, createdAt).
 *  6. User is redirected to /rcorner/.
 *
 * Google sign-up is handled by globalauth.js (.google-btn selector).
 * This file only owns the email form and its validation UI.
 */

import {
    auth,
    db,
    createUserWithEmailAndPassword,
    updateProfile,
    doc,
    setDoc,
    serverTimestamp,
} from '../firebaseconfig.js';

// ─── Toast (mirrors pattern in globalauth.js) ────────────────────────────────
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

// ─── Loading state helper ────────────────────────────────────────────────────
function setLoading(btn, state) {
    btn.classList.toggle('loading', state);
    btn.disabled = state;
}

// ─── Redirect after signup ───────────────────────────────────────────────────
function redirectAfterSignup() {
    window.location.replace('/rcorner/');
}

// ════════════════════════════════════════════════════════════════════════════
// DOM REFERENCES
// ════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    const form            = document.getElementById('signup-form');
    const nameInput       = document.getElementById('fullname');
    const emailInput      = document.getElementById('email');
    const pwInput         = document.getElementById('password');
    const confirmInput    = document.getElementById('confirm-password');
    const termsCheck      = document.getElementById('terms-check');
    const submitBtn       = document.getElementById('signup-btn');

    // Error spans
    const errName         = document.getElementById('err-name');
    const errEmail        = document.getElementById('err-email');
    const errPw           = document.getElementById('err-password');
    const errConfirm      = document.getElementById('err-confirm');

    // Strength bar
    const strengthFill    = document.getElementById('strength-fill');
    const strengthLabel   = document.getElementById('strength-label');

    // Match hint
    const matchHint       = document.getElementById('match-hint');

    // Eye toggles
    const eyePwBtn        = document.getElementById('eye-pw');
    const eyePwOpen       = document.getElementById('eye-pw-open');
    const eyePwClosed     = document.getElementById('eye-pw-closed');
    const eyeConfBtn      = document.getElementById('eye-confirm');
    const eyeConfOpen     = document.getElementById('eye-confirm-open');
    const eyeConfClosed   = document.getElementById('eye-confirm-closed');

    // ════════════════════════════════════════════════════════════════════════
    // 1. PASSWORD VISIBILITY TOGGLES
    // ════════════════════════════════════════════════════════════════════════
    function bindEye(btn, input, openIcon, closedIcon) {
        btn.addEventListener('click', () => {
            const hidden = input.type === 'password';
            input.type        = hidden ? 'text' : 'password';
            openIcon.style.display   = hidden ? 'none' : '';
            closedIcon.style.display = hidden ? ''     : 'none';
        });
    }

    bindEye(eyePwBtn,   pwInput,      eyePwOpen,   eyePwClosed);
    bindEye(eyeConfBtn, confirmInput, eyeConfOpen, eyeConfClosed);

    // ════════════════════════════════════════════════════════════════════════
    // 2. PASSWORD STRENGTH METER
    // ════════════════════════════════════════════════════════════════════════
    const STRENGTH_LABELS = ['', 'Too weak', 'Could be stronger', 'Almost there', 'Strong password'];

    function getStrength(pw) {
        if (!pw) return 0;
        let score = 0;
        if (pw.length >= 8)                          score++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw))   score++;
        if (/[0-9]/.test(pw))                        score++;
        if (/[^A-Za-z0-9]/.test(pw))                 score++;
        return score; // 0–4
    }

    function updateStrengthUI(score) {
        // Remove all strength classes
        strengthFill.className  = `strength-bar-fill strength-${score}`;
        strengthLabel.className = `strength-label strength-text-${score}`;
        strengthLabel.textContent = STRENGTH_LABELS[score] || '';
    }

    pwInput.addEventListener('input', () => {
        updateStrengthUI(getStrength(pwInput.value));
        // Live re-check confirm match if already typed
        if (confirmInput.value) checkConfirmMatch();
        clearError(errPw, pwInput);
    });

    // ════════════════════════════════════════════════════════════════════════
    // 3. CONFIRM PASSWORD MATCH
    // ════════════════════════════════════════════════════════════════════════
    function checkConfirmMatch() {
        const match = pwInput.value === confirmInput.value && confirmInput.value.length > 0;
        const empty = confirmInput.value.length === 0;

        if (empty) {
            matchHint.textContent = '';
            matchHint.className = 'match-hint';
            confirmInput.classList.remove('valid', 'invalid');
        } else if (match) {
            matchHint.textContent = '✓ Passwords match';
            matchHint.className = 'match-hint ok';
            confirmInput.classList.add('valid');
            confirmInput.classList.remove('invalid');
        } else {
            matchHint.textContent = '✗ Passwords do not match';
            matchHint.className = 'match-hint err';
            confirmInput.classList.add('invalid');
            confirmInput.classList.remove('valid');
        }
        return match;
    }

    confirmInput.addEventListener('input', () => {
        checkConfirmMatch();
        clearError(errConfirm, confirmInput);
    });

    // ════════════════════════════════════════════════════════════════════════
    // 4. INDIVIDUAL FIELD VALIDATION
    // ════════════════════════════════════════════════════════════════════════
    function showError(span, input, msg) {
        span.textContent = msg;
        input.classList.add('invalid');
        input.classList.remove('valid');
    }

    function clearError(span, input) {
        span.textContent = '';
        input.classList.remove('invalid');
    }

    function markValid(input) {
        input.classList.add('valid');
        input.classList.remove('invalid');
    }

    function validateName() {
        const val = nameInput.value.trim();
        if (!val) {
            showError(errName, nameInput, 'Please enter your full name.'); return false;
        }
        if (val.length < 2) {
            showError(errName, nameInput, 'Name must be at least 2 characters.'); return false;
        }
        clearError(errName, nameInput);
        markValid(nameInput);
        return true;
    }

    function validateEmail() {
        const val = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val) {
            showError(errEmail, emailInput, 'Please enter your email address.'); return false;
        }
        if (!emailRegex.test(val)) {
            showError(errEmail, emailInput, 'Please enter a valid email address.'); return false;
        }
        clearError(errEmail, emailInput);
        markValid(emailInput);
        return true;
    }

    function validatePassword() {
        const val = pwInput.value;
        if (!val) {
            showError(errPw, pwInput, 'Please create a password.'); return false;
        }
        if (val.length < 8) {
            showError(errPw, pwInput, 'Password must be at least 8 characters.'); return false;
        }
        if (getStrength(val) < 2) {
            showError(errPw, pwInput, 'Add uppercase letters, numbers, or symbols to strengthen it.'); return false;
        }
        clearError(errPw, pwInput);
        markValid(pwInput);
        return true;
    }

    function validateConfirm() {
        if (!confirmInput.value) {
            showError(errConfirm, confirmInput, 'Please confirm your password.'); return false;
        }
        if (!checkConfirmMatch()) {
            showError(errConfirm, confirmInput, 'Passwords do not match.'); return false;
        }
        clearError(errConfirm, confirmInput);
        return true;
    }

    // Validate on blur for UX
    nameInput.addEventListener('blur',    validateName);
    emailInput.addEventListener('blur',   validateEmail);
    pwInput.addEventListener('blur',      validatePassword);
    confirmInput.addEventListener('blur', validateConfirm);

    // Clear errors on focus
    nameInput.addEventListener('focus',    () => clearError(errName,    nameInput));
    emailInput.addEventListener('focus',   () => clearError(errEmail,   emailInput));
    pwInput.addEventListener('focus',      () => clearError(errPw,      pwInput));
    confirmInput.addEventListener('focus', () => clearError(errConfirm, confirmInput));

    // ════════════════════════════════════════════════════════════════════════
    // 5. FORM SUBMIT — CREATE ACCOUNT
    // ════════════════════════════════════════════════════════════════════════
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Run all validators
        const nameOk    = validateName();
        const emailOk   = validateEmail();
        const pwOk      = validatePassword();
        const confirmOk = validateConfirm();

        if (!nameOk || !emailOk || !pwOk || !confirmOk) {
            // Scroll to first error
            form.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (!termsCheck.checked) {
            showToast('Please agree to the Terms of Service to continue.', 'error');
            return;
        }

        const name  = nameInput.value.trim();
        const email = emailInput.value.trim();
        const pw    = pwInput.value;

        setLoading(submitBtn, true);

        try {
            // ── Step 1: Create Firebase Auth user ──────────────────────────
            const userCredential = await createUserWithEmailAndPassword(auth, email, pw);
            const user = userCredential.user;

            // ── Step 2: Set display name in Firebase Auth ──────────────────
            await updateProfile(user, { displayName: name });

            // ── Step 3: Create Firestore user document ─────────────────────
            // This is the single source of truth for public user data.
            // Sensitive data (role, flags) should be managed server-side.
            await setDoc(doc(db, 'users', user.uid), {
                uid:         user.uid,
                displayName: name,
                email:       email,
                photoURL:    user.photoURL || null,
                role:        'reader',          // default role; admin role is set server-side only
                createdAt:   serverTimestamp(),
                lastSeen:    serverTimestamp(),
            });

            showToast(`Welcome, ${name}! Your account is ready.`, 'success');

            // Small delay so toast is visible before redirect
            setTimeout(redirectAfterSignup, 900);

        } catch (err) {
            setLoading(submitBtn, false);
            showToast(friendlySignupError(err.code), 'error');
        }
    });

    // ════════════════════════════════════════════════════════════════════════
    // 6. FRIENDLY ERROR MESSAGES
    // ════════════════════════════════════════════════════════════════════════
    function friendlySignupError(code) {
        const map = {
            'auth/email-already-in-use':   'An account with this email already exists. Try logging in.',
            'auth/invalid-email':          'This email address is not valid.',
            'auth/weak-password':          'Password is too weak. Use at least 8 characters.',
            'auth/operation-not-allowed':  'Email/password sign-up is not enabled. Contact support.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/too-many-requests':      'Too many attempts. Please wait a moment and try again.',
        };
        return map[code] || 'Something went wrong. Please try again.';
    }

}); // end DOMContentLoaded