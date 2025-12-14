// P5 Project/js/pengaturan_akun.js

// ⭐ IMPORT API URL DAN AUTH MANAGER ⭐
import { PUBLIC_BACKEND_URL, API_BASE_URL } from './config.js'; 
// Import semua fungsi yang dibutuhkan
import { 
    getAuthToken, 
    getAuthUser, 
    updateAuthUI, 
    removeAuthToken, 
    validateToken // Diperlukan untuk refresh data user setelah update
} from './authManager.js'; 

// =======================================================
// FUNGSI UTAMA: UPDATE UI PROFIL (FOTO, NAMA, EMAIL)
// =======================================================

/**
 * Mengambil data pengguna dari localStorage dan memperbarui
 * foto profil, username, dan email pada navbar dropdown.
 */
function updateUserProfileUI() {
    // ✅ PERBAIKAN: Menggunakan kunci 'authUser'
    const userDataJSON = localStorage.getItem('authUser');
    
    if (userDataJSON) {
        try {
            const userData = JSON.parse(userDataJSON);
            
            // 1. Update Profile Picture (ID harus 'profile-pic-img')
            const profilePicImg = document.getElementById('profile-pic-img');
            if (profilePicImg && userData.profilePictureUrl) {
                profilePicImg.src = userData.profilePictureUrl;
                
                // Tambahkan error handler untuk berjaga-jaga jika URL eksternal gagal
                profilePicImg.onerror = () => {
                    console.warn("Gagal memuat foto profil eksternal. Menggunakan default HTML.");
                    // Biarkan browser menggunakan src default yang sudah ada di HTML
                };
            }
            
            // 2. Update Username (ID atau Class)
            const usernameEl = document.querySelector('.username'); // Atau gunakan ID jika ada
            if (usernameEl && userData.username) {
                usernameEl.textContent = userData.username; // Teks biasa (yang akan disembunyikan)
                usernameEl.setAttribute('data-text', userData.username); // Teks untuk animasi marquee
            }
                
            // 3. Update Email (ID atau Class)
            const emailEl = document.querySelector('.email'); // Atau gunakan ID jika ada
            if (emailEl && userData.email) {
                emailEl.textContent = userData.email; // Teks biasa (yang akan disembunyikan)
                emailEl.setAttribute('data-text', userData.email); // Teks untuk animasi marquee
            }
                
        } catch (error) {
            console.error("Gagal memparsing data pengguna dari LocalStorage:", error);
        }
    }
}

// =======================================================
// FUNGSI UTAMA: CEK STATUS LOGIN DAN TAMPILKAN UI YANG SESUAI
// =======================================================

async function checkLoginState(navAuthLinks, profileDropdownWrapper, body) {
    // ✅ PERBAIKAN: Menggunakan kunci 'authToken'
    const token = localStorage.getItem('authToken');
    // ✅ PERBAIKAN: Menggunakan kunci 'authUser'
    const userDataJSON = localStorage.getItem('authUser');
    
    // Asumsi: Token valid jika ada dan data pengguna ada
    if (token && userDataJSON) {
        // Logika sederhana: anggap token dan data di LS valid
        if (navAuthLinks) navAuthLinks.style.display = 'none';
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (body) body.dataset.loggedIn = 'true';

        // ⭐ Panggil fungsi untuk memperbarui UI profil ⭐
        updateUserProfileUI();
    } else {
        // Pengguna belum login
        if (navAuthLinks) navAuthLinks.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        if (body) body.dataset.loggedIn = 'false';
    }
}

// Asumsi API endpoints
const API_USERS_URL = `${API_BASE_URL}/users`; 
const API_AUTH_URL = `${API_BASE_URL}/auth`; 
const API_PROFILE_URL = `${API_USERS_URL}/profile`;
const API_PASSWORD_URL = `${API_USERS_URL}/password`;
const API_EMAIL_URL = `${API_USERS_URL}/email`;
const API_RESEND_VERIFY_URL = `${API_AUTH_URL}/resend-verification`;

// --- Elemen DOM ---
const body = document.body;
const loadingState = document.getElementById('loading-state');
const settingsLayout = document.querySelector('.settings-layout');
const settingsNav = document.querySelector('.settings-nav');
const settingsTabs = document.querySelectorAll('.settings-tab');

// --- Tab Profil ---
const themeToggle = document.getElementById('theme-toggle');
const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
const profileForm = document.getElementById('profile-form');
const currentAvatarImg = document.getElementById('current-avatar');
const avatarUploadInput = document.getElementById('avatar-upload');
const deleteAvatarBtn = document.getElementById('delete-avatar-btn');
const profileSubmitBtn = document.getElementById('profile-submit-btn');
const profileSuccessMsg = document.getElementById('profile-success-msg');
const profileErrorMsg = document.getElementById('profile-error-msg');

// --- Tab Kata Sandi ---
const passwordForm = document.getElementById('password-form');
const passwordSubmitBtn = document.getElementById('password-submit-btn');
const passwordSuccessMsg = document.getElementById('password-success-msg');
const passwordErrorMsg = document.getElementById('password-error-msg');

// --- Tab Email & Verifikasi ---
const currentEmailEl = document.getElementById('current-email');
const verificationBadgeEl = document.getElementById('verification-badge');
const resendVerificationBtn = document.getElementById('resend-verification-btn');
const resendSuccessMsg = document.getElementById('resend-success-msg');
const resendArea = document.getElementById('resend-verification-area');
const emailForm = document.getElementById('email-form');
const emailSuccessMsg = document.getElementById('email-success-msg');
const emailErrorMsg = document.getElementById('email-error-msg');

// --- Tab Preferensi ---
const themeSwitch = document.getElementById('theme-switch');
const savePreferenceBtn = document.getElementById('save-preference-btn');
const preferenceSuccessMsg = document.getElementById('preference-success-msg');

let globalUser = getAuthUser(); // Data user saat ini

// --- 2. Cek Status Login Saat Halaman Dimuat ---
checkLoginState(navAuthLinks, profileDropdownWrapper, body);

// =======================================================
// FUNGSI UTAMA: TAMPILAN & NAVIGASI TAB
// =======================================================

/**
 * Mengganti tab konten yang aktif.
 * @param {string} targetId - ID tab yang akan ditampilkan (cth: 'profil').
 */
function switchTab(targetId) {
    // 1. Update Navigasi
    settingsNav.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === targetId) {
            item.classList.add('active');
        }
    });

    // 2. Update Konten
    settingsTabs.forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });

    const targetTab = document.getElementById(`tab-${targetId}`);
    if (targetTab) {
        targetTab.style.display = 'block';
        setTimeout(() => targetTab.classList.add('active'), 50); // Tambahkan kelas active setelah display block
    }
}

/**
 * Memuat data user ke dalam form-form yang ada.
 * @param {object} user - Objek user.
 */
function loadUserDataToForms(user) {
    if (!user) return;
    
    // --- Profil Dasar ---
    document.getElementById('username').value = user.username || '';
    document.getElementById('bio').value = user.bio || '';

    // Set Avatar
    let avatarUrl = user.profilePictureUrl || '../assets/default-avatar.png';
    if (avatarUrl.startsWith('/') && !avatarUrl.startsWith('http')) {
        avatarUrl = `${PUBLIC_BACKEND_URL}${avatarUrl}`;
    }
    currentAvatarImg.src = avatarUrl;
    deleteAvatarBtn.style.display = user.profilePictureUrl ? 'inline-flex' : 'none';
    
    // --- Email & Verifikasi ---
    currentEmailEl.textContent = user.email || 'N/A';
    
    if (user.isVerified) {
        verificationBadgeEl.className = 'badge verified';
        verificationBadgeEl.textContent = 'Terverifikasi';
        resendArea.style.display = 'none'; // Sembunyikan tombol kirim ulang
    } else {
        verificationBadgeEl.className = 'badge unverified';
        verificationBadgeEl.textContent = 'Belum Terverifikasi';
        resendArea.style.display = 'block';
    }
    
    // --- Preferensi Tampilan ---
    const savedTheme = localStorage.getItem('sajile_theme') || 'light'; 
    themeSwitch.checked = savedTheme;
}

// =======================================================
// FUNGSI UTAMA: SUBMIT HANDLER
// =======================================================

/**
 * Fungsi untuk mengirim data formulir ke API.
 * @param {string} url - URL API endpoint.
 * @param {object|FormData} bodyData - Data yang akan dikirim.
 * @param {HTMLElement} successEl - Elemen pesan sukses.
 * @param {HTMLElement} errorEl - Elemen pesan error.
 * @param {HTMLElement} btnEl - Tombol submit.
 * @param {boolean} isFormData - Apakah data berupa FormData.
 */
async function submitForm(url, bodyData, successEl, errorEl, btnEl, isFormData = false) {
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    btnEl.disabled = true;
    const originalText = btnEl.innerHTML;
    btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    
    const token = getAuthToken();
    if (!token) {
        errorEl.textContent = "Sesi berakhir. Silakan login kembali.";
        errorEl.style.display = 'block';
        removeAuthToken();
        return;
    }

    try {
        const res = await fetch(url, {
            method: 'PUT', // Hampir semua update menggunakan PUT
            headers: isFormData ? {
                // Jangan set Content-Type untuk FormData, browser akan melakukannya
                'x-auth-token': token
            } : {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: isFormData ? bodyData : JSON.stringify(bodyData)
        });

        const data = await res.json();

        if (!res.ok) {
            errorEl.textContent = data.msg || 'Terjadi kesalahan saat menyimpan.';
            errorEl.style.display = 'block';
            return;
        }

        successEl.textContent = data.msg || 'Perubahan berhasil disimpan!';
        successEl.style.display = 'block';
        
        // Refresh data user yang tersimpan di localStorage dan UI navbar
        const freshUser = await validateToken(token);
        if (freshUser) {
            globalUser = freshUser;
            loadUserDataToForms(freshUser); // Update forms
        }

    } catch (error) {
        console.error('Submit Error:', error);
        errorEl.textContent = 'Gagal terhubung ke server.';
        errorEl.style.display = 'block';
    } finally {
        btnEl.disabled = false;
        btnEl.innerHTML = originalText;
    }
}

// =======================================================
// HANDLER: PROFIL DASAR
// =======================================================

profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const bio = document.getElementById('bio').value.trim();
    
    submitForm(
        API_PROFILE_URL,
        { username, bio },
        profileSuccessMsg,
        profileErrorMsg,
        profileSubmitBtn
    );
});

// Update preview avatar saat file dipilih
avatarUploadInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        currentAvatarImg.src = URL.createObjectURL(this.files[0]);
        deleteAvatarBtn.style.display = 'inline-flex';
        
        // Langsung upload saat file dipilih
        const formData = new FormData();
        formData.append('avatar', this.files[0]);

        submitForm(
            `${API_PROFILE_URL}/avatar`, // Asumsi ada endpoint khusus untuk upload avatar
            formData,
            profileSuccessMsg,
            profileErrorMsg,
            document.getElementById('profile-submit-btn'), // Gunakan tombol submit sebagai indikator
            true // isFormData = true
        );
    }
});

// Hapus Avatar
deleteAvatarBtn.addEventListener('click', () => {
    if (!confirm("Yakin ingin menghapus foto profil?")) return;
    
    submitForm(
        `${API_PROFILE_URL}/avatar/delete`, // Asumsi ada endpoint khusus
        {}, 
        profileSuccessMsg,
        profileErrorMsg,
        deleteAvatarBtn
    );
    // Reset visual
    currentAvatarImg.src = '../assets/default-avatar.png';
    deleteAvatarBtn.style.display = 'none';
    avatarUploadInput.value = ''; // Reset input file
});


// =======================================================
// HANDLER: KATA SANDI
// =======================================================

passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validasi Sisi Klien
    if (newPassword !== confirmPassword) {
        passwordErrorMsg.textContent = "Kata sandi baru dan konfirmasi tidak cocok.";
        passwordErrorMsg.style.display = 'block';
        return;
    }
    if (newPassword.length < 6) {
        passwordErrorMsg.textContent = "Kata sandi minimal 6 karakter.";
        passwordErrorMsg.style.display = 'block';
        return;
    }
    
    submitForm(
        API_PASSWORD_URL,
        { currentPassword, newPassword },
        passwordSuccessMsg,
        passwordErrorMsg,
        passwordSubmitBtn
    ).then(() => {
        // Clear fields setelah berhasil
        if (passwordSuccessMsg.style.display === 'block') {
            passwordForm.reset();
        }
    });
});

// =======================================================
// HANDLER: EMAIL & VERIFIKASI
// =======================================================

emailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newEmail = document.getElementById('new-email').value;
    const password = document.getElementById('email-password').value;
    
    submitForm(
        API_EMAIL_URL,
        { newEmail, password },
        emailSuccessMsg,
        emailErrorMsg,
        document.getElementById('email-submit-btn')
    );
});

// Kirim Ulang Verifikasi
resendVerificationBtn.addEventListener('click', async () => {
    resendSuccessMsg.style.display = 'none';
    resendVerificationBtn.disabled = true;
    const originalText = resendVerificationBtn.innerHTML;
    resendVerificationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    
    const token = getAuthToken();
    
    try {
        const res = await fetch(API_RESEND_VERIFY_URL, {
            method: 'POST', // Asumsi: POST karena mengirim permintaan
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            alert(data.msg || 'Gagal mengirim ulang link verifikasi.');
            return;
        }

        resendSuccessMsg.textContent = data.msg || 'Link verifikasi baru telah dikirimkan ke email Anda.';
        resendSuccessMsg.style.display = 'block';
        
    } catch (error) {
        console.error('Resend Error:', error);
        alert('Gagal terhubung ke server untuk mengirim ulang verifikasi.');
    } finally {
        resendVerificationBtn.disabled = false;
        resendVerificationBtn.innerHTML = originalText;
    }
});


// =======================================================
// HANDLER: PREFERENSI TAMPILAN
// =======================================================

// B. Dark Mode Toggle
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        // ⭐ Gunakan kunci LS yang konsisten: sajile_theme
        const savedTheme = localStorage.getItem('sajile_theme') || 'light'; 
        
        body.dataset.theme = savedTheme;
        if (icon) {
            icon.classList.toggle('fa-sun', savedTheme === 'dark');
            icon.classList.toggle('fa-moon', savedTheme === 'light');
        }

        themeToggle.addEventListener('click', () => {
            const currentTheme = body.dataset.theme;
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
            body.dataset.theme = newTheme;
            localStorage.setItem('sajile_theme', newTheme);

            if (icon) {
                icon.classList.toggle('fa-moon');
                icon.classList.toggle('fa-sun');
            }
        });
    }

// =======================================================
// INISIALISASI
// =======================================================

function initSettings() {
    // 1. Cek Otentikasi
    updateAuthUI(); // Perbarui Navbar
    if (!getAuthToken()) {
        alert("Anda harus login untuk mengakses halaman pengaturan.");
        window.location.href = 'daftar_atau_login.html';
        return;
    }

    // 2. Tampilkan data user
    loadUserDataToForms(globalUser);
    
    // 3. Tampilkan Tab Default
    switchTab('profil');
    
    // 4. Sembunyikan loading state & tampilkan layout
    loadingState.style.display = 'none';
    settingsLayout.style.display = 'grid'; 

    // 5. Setup event listener untuk navigasi tab
    settingsNav.addEventListener('click', (e) => {
        if (e.target.matches('.nav-item')) {
            e.preventDefault();
            const target = e.target.getAttribute('data-tab');
            if (target) {
                switchTab(target);
            }
        }
    });
    
    // 6. Init Navbar (Logika standar navbar/dropdown)
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => { hamburgerBtn.classList.toggle('active'); navMenu.classList.toggle('active'); });
    }
    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('active'); });
        document.addEventListener('click', (e) => { 
            if (profileDropdown && !profileDropdown.contains(e.target) && profilePicBtn && !profilePicBtn.contains(e.target)) {
                 profileDropdown.classList.remove('active'); 
            }
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                removeAuthToken(); 
            }
        });
    }
    
    // 7. Arahkan link "Profil Saya" di navbar ke profil sendiri
    const myProfileLink = document.getElementById('my-profile-link');
    if (myProfileLink && globalUser) {
        myProfileLink.href = `lihat_profil.html?id=${globalUser._id}`;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Sinkronkan tema saat DOMContentLoaded
    const savedTheme = localStorage.getItem('sajile_theme') || 'light';
    document.body.dataset.theme = savedTheme;
    
    initSettings();
});

// Blokir seleksi teks via JavaScript (standar)
document.addEventListener('selectstart', function(e) { e.preventDefault(); });
document.addEventListener('dragstart', function(e) { e.preventDefault(); });