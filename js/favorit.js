// File: html/favorit.js

// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
import { API_BASE_URL, PUBLIC_BACKEND_URL } from '../js/config.js';

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

// =======================================================
// FUNGSI UTAMA: UPDATE UI PROFIL (FOTO, NAMA, EMAIL)
// =======================================================

/**
 * Mengambil data pengguna dari localStorage dan memperbarui
 * foto profil, username, dan email pada navbar dropdown.
 */
function updateUserProfileUI() {
    const userDataJSON = localStorage.getItem('authUser');
    if (!userDataJSON) return;

    try {
        const userData = JSON.parse(userDataJSON);
        const profileImages = document.querySelectorAll('.profile-pic img, .dropdown-header img');
        
        // Pastikan URL Google menggunakan HTTPS
        let photoUrl = userData.profilePictureUrl;
        if (photoUrl && photoUrl.startsWith('http://')) {
            photoUrl = photoUrl.replace('http://', 'https://');
        }

        profileImages.forEach(img => {
            // Hindari reload gambar jika src sudah sama
            if (img.src === photoUrl) return;

            if (photoUrl) {
                // Gunakan crossOrigin anonymous untuk menghindari blokir CORS/CORB pada gambar
                img.crossOrigin = "anonymous"; 
                img.src = photoUrl;
            } else {
                img.src = `https://placehold.co/40x40/2ecc71/fff?text=${userData.username.charAt(0)}`;
            }

            img.onerror = () => {
                // Jika Google memblokir (429/CORB), gunakan inisial sebagai fallback terakhir
                img.src = `https://placehold.co/40x40/2ecc71/fff?text=${userData.username.charAt(0)}`;
                img.onerror = null; // Hentikan loop onerror
            };
        })
            
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

// =======================================================
// CEK LOGIN
// =======================================================
function checkLoginState(navAuthLinks, profileDropdownWrapper, body) {
    const token = localStorage.getItem('authToken');
    const userDataJSON = localStorage.getItem('authUser');
    
    if (token && userDataJSON) {
        if (navAuthLinks) navAuthLinks.style.display = 'none';
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'flex';
        if (body) body.dataset.loggedIn = 'true';
        updateUserProfileUI();
        return true;
    } else {
        if (navAuthLinks) navAuthLinks.style.display = 'flex';
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        if (body) body.dataset.loggedIn = 'false';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const body = document.body;
    const contentSection = document.getElementById('favorit-content');
    const emptyStateSection = document.getElementById('empty-state');
    const loginRequiredSection = document.getElementById('login-required-state');
    const recipeGrid = document.getElementById('recipe-grid');
    const loadMoreBtnContainer = document.querySelector('.load-more-btn-container');

    // Navbar
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const themeToggle = document.getElementById('theme-toggle');
    const navAuthLinks = document.querySelector('.nav-auth-links');
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    // State
    let currentFavorites = [];

    // Helper: Handle API Response
    async function handleApiResponseSecure(response) {
        const responseText = await response.text();
        if (!response.ok) {
            try { return { ok: false, data: JSON.parse(responseText) }; } 
            catch { return { ok: false, data: { msg: 'Kesalahan server.' } }; }
        }
        try { return { ok: true, data: JSON.parse(responseText) }; } 
        catch { return { ok: false, data: { msg: 'Format respons salah.' } }; }
    }

    // 1. Cek Login
    const isLoggedIn = checkLoginState(navAuthLinks, profileDropdownWrapper, body);

    // Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                window.location.reload();
            }
        });
    }

    // Navbar Toggles (Standar Wajib)
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
        const savedTheme = localStorage.getItem('sajile_theme') || 'light';
        body.dataset.theme = savedTheme;
        const icon = themeToggle.querySelector('i');
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

    // ===============================================
    // LOGIKA HALAMAN UTAMA
    // ===============================================

    function showLoginRequired() {
        if (contentSection) contentSection.style.display = 'none';
        if (emptyStateSection) emptyStateSection.style.display = 'none';
        if (loginRequiredSection) loginRequiredSection.style.display = 'block';
    }

    function showEmptyState() {
        if (contentSection) contentSection.style.display = 'none';
        if (loginRequiredSection) loginRequiredSection.style.display = 'none';
        if (emptyStateSection) {
            emptyStateSection.style.display = 'flex';
            emptyStateSection.style.placeItems = 'center';
            emptyStateSection.innerHTML = `
                <div class="empty-message fade-in visible">
                    <i class="far fa-heart icon-large"></i>
                    <h2>Favoritmu Masih Kosong</h2>
                    <p>Belum ada resep yang kamu simpan. Yuk, jelajahi ribuan resep lezat SajiLe!</p>
                    <a href="resep.html" class="btn-primary">Cari Resep</a>
                </div>
            `;
        }
    }

    function showContent() {
        if (emptyStateSection) emptyStateSection.style.display = 'none';
        if (loginRequiredSection) loginRequiredSection.style.display = 'none';
        if (contentSection) contentSection.style.display = 'block';
    }

    // FETCH FAVORITES
    async function fetchFavorites() {
        if (!isLoggedIn) {
            showLoginRequired();
            return;
        }

        const token = localStorage.getItem('authToken');
        const url = `${API_BASE_URL}/favorites`;

        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });

            const result = await handleApiResponseSecure(res);

            if (result.ok) {
                // Struktur backend bisa berbeda, sesuaikan:
                // result.data bisa array langsung, atau object { favorites: [...] }
                const favorites = Array.isArray(result.data) ? result.data : (result.data.favorites || []);
                
                currentFavorites = favorites;

                if (favorites.length === 0) {
                    showEmptyState();
                } else {
                    renderFavorites(favorites);
                    showContent();
                }
            } else {
                console.error("Gagal load favorit:", result.data);
                showEmptyState();
            }

        } catch (error) {
            console.error("Error fetch favorites:", error);
            showEmptyState(); // Fallback
        }
    }

    // RENDER FAVORITES
    function renderFavorites(favList) {
        if (!recipeGrid) return;
        recipeGrid.innerHTML = ''; // Clear loading/dummy

        const html = favList.map(item => {
            // Mapping data: item bisa jadi resep langsung atau wrapper { recipe: {...} }
            // Sesuaikan dengan respon backend Anda. Asumsi: item adalah objek resep.
            const recipe = item.recipe || item; 
            
            // Handle Image URL
            let imageUrl = recipe.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image';
            if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
                imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}`;
            }

            const timeTotal = (recipe.prepTime || 0) + (recipe.cookTime || 0);

            return `
                <a href="resep_detail.html?id=${recipe._id || recipe.id}" class="recipe-card fade-in">
                    <button class="btn-remove-fav" data-id="${recipe._id || recipe.id}" aria-label="Hapus dari Favorit">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <div class="card-image">
                        <img src="${imageUrl}" alt="${recipe.title}" loading="lazy">
                    </div>
                    <div class="card-info">
                        <h3>${recipe.title}</h3>
                        <p class="duration"><i class="far fa-clock"></i> ${timeTotal} Menit</p>
                    </div>
                </a>
            `;
        }).join('');

        recipeGrid.innerHTML = html;

        // Pasang Event Listener untuk tombol Hapus
        attachRemoveListeners();

        // Trigger animasi fade-in
        setTimeout(() => {
            document.querySelectorAll('.recipe-card').forEach(el => el.classList.add('visible'));
        }, 100);
    }

    // =======================================================
    // LOGIKA HAPUS FAVORIT (Perbaikan di favorit.js)
    // =======================================================
    function attachRemoveListeners() {
        const removeBtns = document.querySelectorAll('.btn-remove-fav');
        
        removeBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); 
                e.stopPropagation();

                if (!confirm("Hapus resep ini dari favorit?")) return;

                const recipeId = btn.getAttribute('data-id');
                const token = localStorage.getItem('authToken');
                const card = btn.closest('.recipe-card');

                // 1. Perubahan URL: Tambahkan ID resep ke URL
                const url = `${API_BASE_URL}/favorites/${recipeId}`; 

                try {
                    const res = await fetch(url, {
                        method: 'DELETE', // Method DELETE modular
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        }
                    });

                    if (res.ok) {
                        // Berhasil: Jalankan animasi hapus
                        card.style.transform = 'scale(0.8)';
                        card.style.opacity = '0';
                        
                        setTimeout(() => {
                            card.remove();
                            // Cek jika grid sudah kosong, tampilkan empty state
                            if (document.querySelectorAll('.recipe-card').length === 0) {
                                showEmptyState();
                            }
                        }, 300);
                    } else {
                        const errorData = await res.json();
                        alert(errorData.msg || "Gagal menghapus favorit.");
                    }
                } catch (err) {
                    console.error("Error deleting fav:", err);
                    alert("Kesalahan koneksi ke server.");
                }
            });
        });
    }

    // STARTUP
    if (API_BASE_URL) {
        console.log('⚡ Favorit Page Init');
        fetchFavorites();
    } else {
        window.addEventListener('backend-url-changed', () => {
            console.log('⚡ Favorit Page Init (Delayed)');
            fetchFavorites();
        });
    }
});