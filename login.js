document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://mnvdpvsivqqbzbtjtpws.supabase.co';
    const SUPABASE_ANON_KEY =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udmRwdnNpdnFxYnpidGp0cHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTM0MTIsImV4cCI6MjA2ODgyOTQxMn0.v5tAGcd0K4VW9yR1CZYVjMYHLhWJXN7Tz5j9DNf1CQE';
    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
    );

    const authStep1 = document.getElementById('auth-step1');
    const authStep2 = document.getElementById('auth-step2');
    const profileLink = document.getElementById('pflink');
    const usernameInput = document.getElementById('username-input');
    const getCodeBtn = document.getElementById('get-code-btn');
    const verificationCodeElem = document.getElementById('verification-code');
    const verifyCommentBtn = document.getElementById('verify-comment-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const copyMessage = document.getElementById('copy-message');

    let scratchUsername = '';

    function showLoading(show) {
        loadingOverlay.classList.toggle('hidden', !show);
    }

    getCodeBtn.addEventListener('click', async () => {
        scratchUsername = usernameInput.value.trim();
        if (!scratchUsername) {
            errorMessage.textContent = 'ユーザー名を入力してください。';
            errorMessage.classList.remove('hidden');
            return;
        }

        showLoading(true);
        errorMessage.classList.add('hidden');

        try {
            const response = await fetch(
                'https://mnvdpvsivqqbzbtjtpws.supabase.co/functions/v1/nyax_auth',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'generateCode',
                        username: scratchUsername, // SCIDを送信する
                    }),
                },
            );
            const data = await response.json();
            if (!response.ok || data.error)
                throw new Error(data.error || 'コードの生成に失敗しました。');

            verificationCodeElem.textContent = data.code;
            profileLink.href = `https://scratch.mit.edu/users/${scratchUsername}/#comments`;
            authStep1.classList.add('hidden');
            authStep2.classList.remove('hidden');
        } catch (e) {
            errorMessage.textContent = e.message;
            errorMessage.classList.remove('hidden');
        } finally {
            showLoading(false);
        }
    });

    verificationCodeElem.addEventListener('click', () => {
        navigator.clipboard
            .writeText(verificationCodeElem.textContent)
            .then(() => {
                copyMessage.classList.remove('hidden');
                errorMessage.classList.add('hidden'); // エラーメッセージは隠す
                setTimeout(() => {
                    copyMessage.classList.add('hidden');
                }, 2000);
            });
    });

    verifyCommentBtn.addEventListener('click', async () => {
        showLoading(true);
        errorMessage.classList.add('hidden');
        copyMessage.classList.add('hidden');

        try {
            const response = await fetch(
                'https://mnvdpvsivqqbzbtjtpws.supabase.co/functions/v1/nyax_auth',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'verifyComment',
                        username: scratchUsername,
                        code: verificationCodeElem.textContent,
                    }),
                },
            );
            const data = await response.json();
            if (!response.ok || data.error)
                throw new Error(data.error || '認証に失敗しました。');

            const { error: sessionError } = await supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
            });
            if (sessionError)
                throw new Error('セッションの設定に失敗しました。');

            window.location.href = 'index.html';
        } catch (e) {
            errorMessage.textContent = e.message;
            errorMessage.classList.remove('hidden');
        } finally {
            showLoading(false);
        }
    });
});
