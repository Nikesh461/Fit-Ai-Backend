document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = loginForm?.querySelector('button[type="submit"]');

    if (!loginForm || !emailInput || !passwordInput) return;

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            window.FitAIUI.showToast('Please enter both email and password.', 'error');
            return;
        }

        window.FitAIUI.setButtonLoading(submitBtn, true, 'AUTHENTICATING...');

        try {
            const data = await window.FitAIApi.auth.login({ email, password });

            window.FitAIAuth.setSession({
                token: data.token,
                user: data.user
            });

            window.FitAIUI.showToast(data.message || 'Signed in successfully.', 'success');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Login error:', error);
            window.FitAIUI.showToast(error.message || 'Unable to sign in right now.', 'error');
            window.FitAIUI.setButtonLoading(submitBtn, false);
        }
    });
});
