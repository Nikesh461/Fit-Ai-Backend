document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const submitBtn = registerForm?.querySelector('button[type="submit"]');

    if (!registerForm) return;

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const payload = {
            name: document.getElementById('name')?.value.trim(),
            email: document.getElementById('email')?.value.trim(),
            password: document.getElementById('password')?.value,
            confirmPassword: document.getElementById('confirm-password')?.value,
            age: document.getElementById('age')?.value.trim(),
            height: document.getElementById('height')?.value.trim(),
            weight: document.getElementById('weight')?.value.trim(),
            goal: document.getElementById('goal')?.value,
            gender: document.getElementById('gender')?.value,
            preference: document.getElementById('preference')?.value,
            dietPreference: document.getElementById('diet-preference')?.value,
            cuisinePreference: document.getElementById('cuisine-preference')?.value
        };

        const termsAccepted = document.getElementById('terms')?.checked;

        if (!payload.name || !payload.email || !payload.password || !payload.age || !payload.height || !payload.weight || !payload.goal || !payload.gender || !payload.preference || !payload.dietPreference) {
            window.FitAIUI.showToast('Please complete all required profile fields.', 'error');
            return;
        }

        if (payload.password.length < 6) {
            window.FitAIUI.showToast('Password must be at least 6 characters long.', 'error');
            return;
        }

        if (payload.password !== payload.confirmPassword) {
            window.FitAIUI.showToast('Passwords do not match.', 'error');
            return;
        }

        if (!termsAccepted) {
            window.FitAIUI.showToast('Please agree to the Terms of Service.', 'error');
            return;
        }

        window.FitAIUI.setButtonLoading(submitBtn, true, 'CREATING ACCOUNT...');

        try {
            const data = await window.FitAIApi.auth.register({
                name: payload.name,
                email: payload.email,
                password: payload.password,
                age: payload.age,
                height: payload.height,
                weight: payload.weight,
                goal: payload.goal,
                preference: payload.preference,
                gender: payload.gender,
                dietPreference: payload.dietPreference,
                cuisinePreference: payload.cuisinePreference
            });

            window.FitAIAuth.setSession({
                token: data.token,
                user: data.user
            });

            window.FitAIUI.showToast(data.message || 'Account created successfully.', 'success');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Registration error:', error);
            window.FitAIUI.showToast(error.message || 'Unable to create your account right now.', 'error');
            window.FitAIUI.setButtonLoading(submitBtn, false);
        }
    });
});
