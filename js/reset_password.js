// reset_password.js
import { API_BASE_URL } from './config.js';

// =======================================================
// GLOBAL EVENT LISTENERS
// =======================================================

// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('reset-form');
    const passwordInput = document.getElementById('new-password');
    const toggleEye = document.getElementById('toggle-pass');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');
    const btnSubmit = document.getElementById('btn-submit');

    // 1. Ambil Token dari URL (?token=xxxx)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        Swal.fire({
            icon: 'error',
            title: 'Token Hilang',
            text: 'Link tidak valid. Silakan minta link reset baru.',
            confirmButtonColor: '#2ecc71'
        }).then(() => window.location.href = 'daftar_atau_login.html');
    }

    // 2. Toggle Password Visibility
    toggleEye.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleEye.classList.toggle('fa-eye');
        toggleEye.classList.toggle('fa-eye-slash');
    });

    // 3. Password Strength Monitor
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        let strength = 0;
        
        if (val.length >= 6) strength += 40;
        if (val.match(/[A-Z]/)) strength += 30;
        if (val.match(/[0-9]/)) strength += 30;

        strengthBar.style.width = strength + '%';
        
        if (strength < 40) {
            strengthBar.style.backgroundColor = '#e74c3c';
            strengthText.textContent = 'Lemah (Gunakan angka & huruf kapital)';
        } else if (strength < 100) {
            strengthBar.style.backgroundColor = '#f1c40f';
            strengthText.textContent = 'Cukup Baik';
        } else {
            strengthBar.style.backgroundColor = '#2ecc71';
            strengthText.textContent = 'Sandi Sangat Kuat!';
        }
    });

    // 4. Handle Submit Form
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = passwordInput.value;

        // Visual feedback
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Memproses...';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/resetpassword/${token}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (response.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'Kata sandi Anda telah diperbarui. Silakan login kembali.',
                    confirmButtonColor: '#2ecc71'
                });
                window.location.href = 'daftar_atau_login.html';
            } else {
                throw new Error(result.msg || 'Gagal mereset sandi.');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Opps!',
                text: error.message,
                confirmButtonColor: '#2ecc71'
            });
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<span>Perbarui Sandi</span> <i class="fas fa-arrow-right"></i>';
        }
    });
});