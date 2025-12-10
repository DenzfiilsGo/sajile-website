// File: html/favorit.js

// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
import { API_BASE_URL, API_AUTH_URL } from '../js/config.js';

// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

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

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- Elemen DOM ---
    const body = document.body;
    const contentSection = document.getElementById('favorit-content');
    const emptyStateSection = document.getElementById('empty-state');
    
    // Navbar Elements
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const themeToggle = document.getElementById('theme-toggle');
    const navAuthLinks = document.querySelector('.nav-auth-links');
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    // Default: Sembunyikan konten
    if (contentSection) contentSection.style.display = 'none';
    if (emptyStateSection) emptyStateSection.style.display = 'none';

    // --- Helper function untuk penanganan respons API yang aman ---
    async function handleApiResponseSecure(response) {
        const responseText = await response.text();
        if (!response.ok) {
            try {
                const errorData = JSON.parse(responseText);
                return { ok: false, data: errorData };
            } catch (e) {
                return { ok: false, data: { msg: 'Kesalahan jaringan atau server.' } };
            }
        }
        try {
            const jsonData = JSON.parse(responseText);
            return { ok: true, data: jsonData };
        } catch (e) {
            console.error("Gagal parse JSON:", responseText);
            return { ok: false, data: { msg: 'Kesalahan format respons dari server' } };
        }
    }

    // --- 2. Cek Status Login Saat Halaman Dimuat ---
    checkLoginState(navAuthLinks, profileDropdownWrapper, body); 

    // --- Logika Logout ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken'); 
                localStorage.removeItem('authUser');
                window.location.href = 'daftar_atau_login.html'; 
            }
        });
    }

    // --- Logika Empty States ---
    function handleEmptyState(isLoggedIn, hasFavorites) {
        if (contentSection) contentSection.style.display = 'none';
        if (emptyStateSection) emptyStateSection.style.display = 'flex';

        if (!isLoggedIn) {
            emptyStateSection.innerHTML = `
                <div class="empty-message fade-in visible">
                    <i class="fas fa-lock icon-large"></i>
                    <h2>Akses Dibatasi</h2>
                    <p>Silakan masuk atau daftar untuk melihat daftar resep favoritmu.</p>
                    <a href="daftar_atau_login.html" class="btn-primary">Masuk / Daftar Sekarang</a>
                </div>
            `;
        } else if (isLoggedIn && !hasFavorites) {
            emptyStateSection.innerHTML = `
                <div class="empty-message fade-in visible">
                    <i class="far fa-heart icon-large"></i>
                    <h2>Favoritmu Masih Kosong</h2>
                    <p>Belum ada resep yang kamu simpan. Yuk, jelajahi ribuan resep lezat SajiLe!</p>
                    <a href="resep.html" class="btn-primary">Cari Resep</a>
                </div>
            `;
        } else {
            if (emptyStateSection) emptyStateSection.style.display = 'none';
            if (contentSection) contentSection.style.display = 'block';
        }
    }

    // ===============================================
    // FUNGSI INTI: FETCH DATA FAVORIT
    // ===============================================
    async function fetchFavorites() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Endpoint dinamis berdasarkan API_BASE_URL
        const API_FAVORITES_URL = `${API_BASE_URL}/favorites`; // Sesuaikan jika endpoint beda

        try {
            const response = await fetch(API_FAVORITES_URL, { 
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });

            const result = await handleApiResponseSecure(response);

            if (result.ok && result.data.favorites && result.data.favorites.length > 0) {
                handleEmptyState(true, true); 
                renderFavorites(result.data.favorites); 
                initContentListeners(API_FAVORITES_URL); // Pass URL ke listener
            } else {
                handleEmptyState(true, false);
            }

        } catch (error) {
            console.error('Gagal mengambil favorit:', error);
            handleEmptyState(true, false); 
        }
    }

    function renderFavorites(favoritesArray) {
        const grid = document.querySelector('.recipe-grid');
        if (grid) {
            grid.innerHTML = favoritesArray.map(fav => `
                <div class="recipe-card fade-in" data-id="${fav.id}">
                    <img src="${fav.imageUrl || 'https://via.placeholder.com/300'}" alt="${fav.title}">
                    <div class="card-content">
                        <h3>${fav.title}</h3>
                        <p class="description">${fav.description || 'Tidak ada deskripsi'}</p>
                        <div class="card-footer">
                            <a href="resep_detail.html?id=${fav.id}" class="btn-primary">Lihat Resep</a>
                            <button class="btn-remove-fav">Hapus</button> 
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    function initContentListeners(apiUrl) {
        // Logika Hapus Favorit
        const removeBtns = document.querySelectorAll('.btn-remove-fav');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); 
                if (!confirm("Yakin ingin menghapus resep ini dari Favorit?")) return;
                
                const card = btn.closest('.recipe-card');
                const recipeId = card.getAttribute('data-id');
                const token = localStorage.getItem('authToken');
                
                if (!recipeId || !token) return;

                try {
                    const response = await fetch(`${apiUrl}/${recipeId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` },
                        credentials: 'include'
                    });

                    if (response.ok) {
                        card.style.opacity = 0;
                        card.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            card.remove();
                            const grid = document.querySelector('.recipe-grid');
                            if (grid && grid.children.length === 0) {
                                handleEmptyState(true, false);
                            }
                        }, 300);
                    } else {
                        alert(`Gagal menghapus favorit.`);
                    }
                } catch (error) {
                    alert('Error koneksi saat menghapus favorit.');
                }
            });
        });

        // Scroll Animation
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    }

    // ===============================================
    // STARTUP LOGIC (WAITING FOR CONFIG)
    // ===============================================
    async function initFavoritPage() {
        console.log('⚡ Favorit Page Init. API:', API_BASE_URL);
        const loggedIn = checkLoginState();
        if (loggedIn) {
            await fetchFavorites();
        }
        
        // --- Dark Mode & Navbar Logic (Standard) ---
        // (Logika Navbar dan Dark Mode Anda sudah bagus, ditempel di sini)
        if (hamburgerBtn && navMenu) {
            hamburgerBtn.addEventListener('click', () => {
                hamburgerBtn.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }
        
        if (profilePicBtn && profileDropdown) {
            profilePicBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('active');
            });
            document.addEventListener('click', (e) => {
                if (!profileDropdown.contains(e.target) && !profilePicBtn.contains(e.target)) {
                    profileDropdown.classList.remove('active');
                }
            });
        }

        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            const savedTheme = localStorage.getItem('sajile_theme') || 'light';
            body.dataset.theme = savedTheme;
            if (icon) {
                icon.classList.toggle('fa-sun', savedTheme === 'dark');
                icon.classList.toggle('fa-moon', savedTheme === 'light');
            }
            themeToggle.addEventListener('click', () => {
                const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
                body.dataset.theme = newTheme;
                localStorage.setItem('sajile_theme', newTheme);
                if (icon) {
                    icon.classList.toggle('fa-moon');
                    icon.classList.toggle('fa-sun');
                }
            });
        }
    }

    if (API_BASE_URL) {
        initFavoritPage();
    } else {
        window.addEventListener('backend-url-changed', initFavoritPage);
    }
});