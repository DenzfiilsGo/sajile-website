// P5 Project/js/lihat_profil.js

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

// ⭐ IMPORT API URL DAN AUTH MANAGER DARI FILE CONFIG.JS/AUTHMANAGER.JS ⭐
import { backendUrlReady, PUBLIC_BACKEND_URL, API_BASE_URL } from './config.js';
import { getAuthToken, removeAuthToken, updateAuthUI, getAuthUser } from './authManager.js'; 

const RECIPES_PER_PAGE = 9;

// --- Elemen DOM ---
const body = document.body;
const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
const themeToggle = document.getElementById('theme-toggle');
const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
const profileContent = document.getElementById('profile-content');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessageEl = document.getElementById('error-message');

const profileAvatarImg = document.getElementById('profile-avatar-img');
const profileUsernameEl = document.getElementById('profile-username');
const profileBioEl = document.getElementById('profile-bio');
const statRecipesEl = document.getElementById('stat-recipes');
const statLikesEl = document.getElementById('stat-likes');
const statJoinedDateEl = document.getElementById('stat-joined-date');
const detailEmailEl = document.getElementById('detail-email');
const detailVerifiedEl = document.getElementById('detail-verified');
const recipesOwnerNameEl = document.getElementById('recipes-owner-name');
const userRecipesListEl = document.getElementById('user-recipes-list');
const editProfileBtn = document.getElementById('edit-profile-btn');

const loadMoreBtnContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');

let targetUserId = null; // ID pengguna yang sedang dilihat
let currentPage = 1;
let isLoadingRecipes = false;

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

// --- 2. Cek Status Login Saat Halaman Dimuat ---
checkLoginState(navAuthLinks, profileDropdownWrapper, body);

// =======================================================
// FUNGSI UTAMA: PENGAMBILAN ID DARI URL
// =======================================================

/**
 * Mendapatkan nilai parameter dari URL.
 * @param {string} name - Nama parameter (contoh: 'id').
 * @returns {string|null} Nilai parameter atau null.
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// =======================================================
// FUNGSI UTAMA: FETCH DATA PROFIL
// =======================================================

/**
 * Mengambil data profil pengguna (publik) dari backend.
 * @param {string} userId - ID pengguna yang akan diambil.
 */
async function fetchUserProfile(userId) {
    loadingState.style.display = 'block';
    profileContent.style.display = 'none';
    errorState.style.display = 'none';
    try {
        // ⭐ GUNAKAN PROMISE YANG SUDAH ANDA BUAT DI SINI
        await backendUrlReady;
        // Sekarang API_BASE_URL sudah pasti terisi dari backend_url.json
        const url = `${API_BASE_URL}/users/${userId}`; 
        
        console.log("Meminta data ke:", url); // Pastikan log ini muncul dengan port 5000/api
        const res = await fetch(url, { method: 'GET' });
        
        if (res.status === 404) {
             throw new Error("Profil pengguna tidak ditemukan.");
        }
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.msg || 'Gagal memuat profil.');
        }

        const userData = await res.json();
        targetUserId = userData._id; // Set ID pengguna yang berhasil dimuat
        renderUserProfile(userData);
        // Lanjutkan untuk memuat resepnya
        await fetchUserRecipes(targetUserId, true);

    } catch (error) {
        console.error('Error saat mengambil profil:', error);
        renderErrorState(error.message);
    } finally {
        loadingState.style.display = 'none';
    }
}

/**
 * Merender data profil ke dalam DOM.
 * @param {object} user - Objek data pengguna.
 */
function renderUserProfile(user) {
    // 1. Update Title
    document.title = `${user.username}'s Profil - SajiLe`;
    
    // 2. Update Header
    profileUsernameEl.textContent = user.username;
    profileBioEl.textContent = user.bio || 'Bio pengguna ini masih kosong atau tidak disediakan.';
    recipesOwnerNameEl.textContent = user.username;
    
    // 3. Update Avatar
    let imageUrl = user.profilePictureUrl || '../assets/default-avatar.png';
    // Gunakan PUBLIC_BACKEND_URL jika URL relatif
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
        imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}`;
    }
    profileAvatarImg.src = imageUrl;

    // 4. Update Stats & Details
    statRecipesEl.textContent = user.recipeCount || 0; // Asumsi API mengembalikan field ini
    statLikesEl.textContent = user.totalLikes || 0; // Asumsi API mengembalikan field ini

    // Fitur Baru: Komentar
    document.getElementById('stat-comments-received').textContent = user.commentsReceived || 0;
    document.getElementById('stat-comments-given').textContent = user.commentsGiven || 0;

    // 5. Render Gelar / Rank (Logika Statis Berdasarkan Kontribusi)
    updateRankSystem(user);

    // 6. Render Ulasan/Rating Bars
    // Asumsi user.ratingsReceived adalah objek { "5": 10, "4": 5, ... }
    renderRatingBars('received-bars', 'avg-received', user.ratingsReceived || {});
    renderRatingBars('given-bars', 'avg-given', user.ratingsGiven || {});
    
    const joinedDate = user.date ? new Date(user.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    statJoinedDateEl.textContent = joinedDate;

    detailEmailEl.textContent = user.email;
    
    const isVerified = user.isVerified;
    detailVerifiedEl.innerHTML = isVerified 
        ? `<span class="verified-status-badge status-verified">Terverifikasi</span>` 
        : `<span class="verified-status-badge status-unverified">Belum Terverifikasi</span>`;

    // Cek apakah profil yang dilihat adalah profil pengguna yang sedang login
    const loggedInUser = getAuthUser();
    if (loggedInUser && loggedInUser._id === user._id) {
        // Tampilkan tombol edit jika ini adalah profil sendiri
        editProfileBtn.style.display = 'inline-flex';
        editProfileBtn.onclick = () => {
            // Arahkan ke halaman edit profil (asumsi ada)
            window.location.href = 'edit_profil.html'; 
        };
        // Perbarui tautan Profil Saya di navbar agar mengarah ke profil ini
        const myProfileLink = document.getElementById('my-profile-link');
        if (myProfileLink) myProfileLink.href = `lihat_profil.html?id=${loggedInUser._id}`;
    } else {
        editProfileBtn.style.display = 'none';
    }
    
    profileContent.style.display = 'block';
}

/**
 * Menampilkan status error.
 * @param {string} message - Pesan error.
 */
function renderErrorState(message) {
    loadingState.style.display = 'none';
    profileContent.style.display = 'none';
    errorState.style.display = 'block';
    errorMessageEl.textContent = message;
}

// profil.js - Tambahkan logika ini di bagian inisialisasi profil
function renderPremiumStatus(user) {
    const statusContainer = document.getElementById('membership-status');
    if (!statusContainer) return;

    if (user.membership === 'free') {
        statusContainer.innerHTML = `<span class="badge-free">Member Gratis</span>`;
        return;
    }

    if (user.membership === 'legend') {
        statusContainer.innerHTML = `<span class="badge-legend">Chef Legend (Lifetime)</span>`;
        return;
    }

    // Hitung sisa hari
    const now = new Date();
    const expiryDate = new Date(user.premiumUntil);
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
        statusContainer.innerHTML = `
            <div class="premium-info">
                <span class="badge-premium">${user.membership.toUpperCase()}</span>
                <p class="expiry-text">Berakhir dalam <strong>${diffDays} hari</strong> lagi</p>
            </div>
        `;
    } else {
        statusContainer.innerHTML = `<span class="badge-expired">Masa Berlaku Habis</span>`;
    }
}

/**
 * Logika Penentuan Pangkat & Progress Bar (10 Tingkat)
 */
function updateRankSystem(user) {
    const titleEl = document.getElementById('rank-title');
    const xpTextEl = document.getElementById('rank-xp-text');
    const progressFill = document.getElementById('rank-progress');
    const emblem = document.getElementById('user-rank-emblem');

    // JIKA SALAH SATU TIDAK ADA, BERHENTI AGAR TIDAK ERROR
    if (!titleEl || !xpTextEl || !progressFill || !emblem) {
        console.error("Error: Salah satu selektor tidak dapat ditemukan! Harap periksa...")
        return;
    }

    // 1. HITUNG SKOR KOMPETITIF (XP)
    // Resep: 25 XP | Rating 4-5 (Apresiasi): 10 XP | Komen ke orang: 2 XP
    const score = (user.recipeCount * 10000) + (user.totalLikes * 5) + (user.commentsGiven * 1);

    // 2. DEFINISI TINGKATAN (Thresholds)
    const ranks = [
        { min: 0, name: "SajiLe Newbie", icon: "fa-seedling", color: "tier-newbie" },
        { min: 30, name: "Kitchen Assistant", icon: "fa-hand-holding-heart", color: "tier-assistant" },
        { min: 100, name: "Rising Star", icon: "fa-star", color: "tier-rising" },
        { min: 250, name: "Home Chef", icon: "fa-fire", color: "tier-homechef" },
        { min: 500, name: "Elite Cook", icon: "fa-award", color: "tier-elite" },
        { min: 800, name: "Culinary Expert", icon: "fa-medal", color: "tier-expert" },
        { min: 1200, name: "Chef de Cuisine", icon: "fa-hat-chef", color: "tier-cuisine" },
        { min: 2000, name: "Executive Chef", icon: "fa-star-and-crescent", color: "tier-executive" },
        { min: 3500, name: "Master Chef", icon: "fa-crown", color: "tier-master" },
        { min: 6000, name: "Legendary SajiLe Chef", icon: "fa-utensils", color: "tier-legend" }
    ];

    // 3. TENTUKAN PANGKAT SAAT INI & BERIKUTNYA
    let currentRankIndex = 0;
    for (let i = 0; i < ranks.length; i++) {
        if (score >= ranks[i].min) {
            currentRankIndex = i;
        } else {
            break;
        }
    }

    const currentRank = ranks[currentRankIndex];
    const nextRank = ranks[currentRankIndex + 1] || null;

    // 4. UPDATE UI PANGKAT
    titleEl.textContent = currentRank.name;
    emblem.className = `rank-emblem ${currentRank.color}`;
    emblem.querySelector('i').className = `fas ${currentRank.icon}`;

    // 5. UPDATE PROGRESS BAR & TEXT XP
    if (nextRank) {
        const xpInCurrentTier = score - currentRank.min;
        const xpRequiredForNext = nextRank.min - currentRank.min;
        const progressPercent = (xpInCurrentTier / xpRequiredForNext) * 100;

        progressFill.style.width = `${progressPercent}%`;
        xpTextEl.textContent = `${score} / ${nextRank.min} XP`;
    } else {
        // Jika sudah mencapai Rank Tertinggi (Legendary)
        progressFill.style.width = "100%";
        progressFill.style.background = "linear-gradient(90deg, #e74c3c, #f1c40f)";
        xpTextEl.textContent = `${score} XP (MAX)`;
    }
}

/**
 * Membuat bar visual untuk rating bintang
 */
function renderRatingBars(containerId, avgId, ratingsObj) {
    const container = document.getElementById(containerId);
    const avgEl = document.getElementById(avgId);
    
    const stars = ["5", "4.5", "4", "3.5", "3", "2.5", "2", "1.5", "1", "0.5"];
    let totalVotes = 0;
    let sumScores = 0;
    
    stars.forEach(s => {
        const count = ratingsObj[s] || 0;
        totalVotes += count;
        sumScores += (parseFloat(s) * count);
    });

    const average = totalVotes > 0 ? (sumScores / totalVotes).toFixed(1) : "0.0";
    avgEl.textContent = average;

    container.innerHTML = stars.map(s => {
        const count = ratingsObj[s] || 0;
        const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
        return `
            <div class="star-row">
                <span>${s} <i class="fas fa-star" style="color: #f1c40f; font-size: 0.7rem;"></i></span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percent}%"></div>
                </div>
                <span style="min-width: 20px;">${count}</span>
            </div>
        `;
    }).join('');
}

// Tambahkan di profil.js (Ganti fungsi fetchLeaderboard lama Anda dengan ini)
async function fetchLeaderboard(timeframe = 'all-time') {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return; // Guard clause jika elemen tidak ada di HTML

    try {
        // 1. TUNGGU URL BACKEND SIAP (Mencegah Race Condition)
        await backendUrlReady; 
        
        // 2. Pastikan menggunakan API_BASE_URL yang benar
        const url = `${API_BASE_URL}/users/leaderboard/top?timeframe=${timeframe}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Gagal mengambil data leaderboard');

        const data = await response.json();

        listEl.innerHTML = ''; // Kosongkan list loading

        if (data.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Belum ada data peringkat.</p>';
            return;
        }

        // Di dalam fungsi fetchLeaderboard(timeframe)
        data.forEach((user, index) => {
            const rank = index + 1;
            let rankClass = 'rank-standard';
            let rankDecorator = rank;
            let subtitle = '';

            // --- LOGIKA PENAMBAHAN CLASS USER-CURRENT-ROW ---
            const loggedInUser = getAuthUser(); // Fungsi dari authManager.js
            let isMeClass = '';
            
            // Cek apakah ID user di peringkat ini sama dengan ID user yang login
            if (loggedInUser && (user._id === loggedInUser._id)) {
                isMeClass = 'user-current-row';
            }
            // -----------------------------------------------

            if (rank === 1) {
                rankClass = 'rank-1';
                rankDecorator = '<i class="fas fa-crown"></i>';
                subtitle = 'Hitam Legenda';
            } else if (rank === 2) {
                rankClass = 'rank-2';
                rankDecorator = '<i class="fas fa-medal"></i>';
                subtitle = 'Ungu Legenda';
            } else if (rank === 3) {
                rankClass = 'rank-3';
                rankDecorator = '<i class="fas fa-award"></i>';
                subtitle = 'Merah Legenda';
            } else if (rank === 4) {
                rankClass = 'rank-4';
                rankDecorator = '<i class="fas fa-star"></i>'; // Ikon khusus peringkat 4
                subtitle = 'Emas Legenda';
            }
            
            listEl.innerHTML += `
                <div class="leader-item ${rankClass} ${isMeClass}" style="animation-delay: ${index * 0.1}s">
                    <div class="leader-rank">${rankDecorator}</div>
                    <img src="${user.profilePictureUrl || '../assets/default-avatar.png'}" 
                        class="leader-avatar" alt="${user.username}">
                    <div class="leader-name">
                        ${user.username} ${isMeClass ? '(Anda)' : ''}
                        ${rank <= 4 ? `<span style="display:block; font-size:10px; opacity: 0.8;">${subtitle}</span>` : ''}
                    </div>
                    <div class="leader-score">${user.score.toLocaleString()} XP</div>
                </div>
            `;
        });
    } catch (err) {
        console.error('Leaderboard Error:', err);
        listEl.innerHTML = `<p class="error-mini">Gagal memuat peringkat: ${err.message}</p>`;
    }
}

// Inisialisasi Event Listener untuk Tab Leaderboard
function initLeaderboardEvents() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Hapus class active dari semua tombol di grup leaderboard
            tabBtns.forEach(b => b.classList.remove('active'));
            // Tambah active ke yang diklik
            e.target.classList.add('active');
            
            const timeframe = e.target.getAttribute('data-time');
            fetchLeaderboard(timeframe);
        });
    });
    // Menambahkan efek interaksi mouse mengikuti arah cahaya pada kartu legenda
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.rank-1, .rank-2, .rank-3');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });
}

// Panggil di dalam initApp() profil.js atau di bagian bawah file
initLeaderboardEvents();
fetchLeaderboard(); // Ambil default (all-time)

const userPin = document.getElementById('user-rank-pin');

function handleUserRankPinning() {
    const originalRow = document.querySelector('.leader-item.user-current-row');
    const scrollContainer = document.querySelector('.leaderboard-list'); 
    
    // Ambil kedua target pin
    const pinTop = document.getElementById('user-rank-pin-top');
    const pinBottom = document.getElementById('user-rank-pin-bottom');
    
    if (!originalRow || !scrollContainer || !pinTop || !pinBottom) return;

    const rowTop = originalRow.offsetTop;
    const rowHeight = originalRow.offsetHeight;
    const rowBottom = rowTop + rowHeight;

    const containerScrollTop = scrollContainer.scrollTop;
    const containerVisibleHeight = scrollContainer.clientHeight;
    const containerScrollBottom = containerScrollTop + containerVisibleHeight;

    // Bersihkan semua state sebelum pengecekan
    pinTop.style.display = 'none';
    pinBottom.style.display = 'none';
    pinTop.classList.remove('pin-top');
    pinBottom.classList.remove('pin-bottom');
    pinTop.innerHTML = '';
    pinBottom.innerHTML = '';

    // 1. CEK ATAS: Jika sudah tenggelam ke atas
    if (rowBottom <= containerScrollTop) {
        pinTop.innerHTML = originalRow.innerHTML;
        // Ambil semua class dari kartu asli (rank-1, user-current-row, dll)
        pinTop.className = 'user-rank-pin pin-top ' + originalRow.className.replace('leader-item', '');
        pinTop.style.display = 'flex';
    } 
    // 2. CEK BAWAH: Jika berada di bawah jendela
    else if (rowTop >= containerScrollBottom) {
        pinBottom.innerHTML = originalRow.innerHTML;
        // Salin class yang sama ke wadah bawah
        pinBottom.className = 'user-rank-pin pin-bottom ' + originalRow.className.replace('leader-item', '');
        pinBottom.style.display = 'flex';
    }
}

// Inisialisasi event listener
const leaderboardListEl = document.getElementById('leaderboard-list');
if (leaderboardListEl) {
    leaderboardListEl.addEventListener('scroll', handleUserRankPinning);
}

// =======================================================
// FUNGSI UTAMA: FETCH RESEP PENGGUNA
// =======================================================

/**
 * Mengambil resep publik milik pengguna.
 * @param {string} userId - ID pengguna yang resepnya akan diambil.
 * @param {boolean} reset - Jika true, hapus konten container sebelum merender.
 */
async function fetchUserRecipes(userId, reset = false) {
    if (isLoadingRecipes) return;

    // --- TAMBAHKAN INI ---
    await backendUrlReady; // Tunggu URL backend siap
    const finalRecipesUrl = `${API_BASE_URL}/recipes/user`; // Susun URL di sini
    // ---------------------

    if (reset) {
        currentPage = 1;
        userRecipesListEl.innerHTML = `<div class="loading-recipes-state"><i class="fas fa-spinner fa-spin"></i> Memuat resep publik...</div>`;
        loadMoreBtn.style.display = 'none';
    }

    isLoadingRecipes = true;
    
    const offset = (currentPage - 1) * RECIPES_PER_PAGE; 
    // Gunakan variabel finalRecipesUrl yang baru dibuat
    const url = `${finalRecipesUrl}/${userId}?limit=${RECIPES_PER_PAGE}&offset=${offset}`;

    if (loadMoreBtn && !reset) loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';
    
    try {
        const res = await fetch(url, { method: 'GET' });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.msg || 'Gagal memuat resep pengguna.');
        }

        const data = await res.json();
        const recipes = data.recipes || [];
        const totalRecipes = data.total || 0;
        
        if (reset) {
            userRecipesListEl.innerHTML = ''; 
        }

        renderUserRecipes(recipes);

        // Perbarui state halaman
        currentPage++;
        
        const hasMore = data.hasMore;
        updatePaginationControls(hasMore, totalRecipes);

    } catch (error) {
        console.error('Error saat mengambil resep pengguna:', error);
        if (reset) {
             userRecipesListEl.innerHTML = `<div class="loading-recipes-state">Gagal memuat resep: ${error.message}</div>`;
        }
        loadMoreBtn.style.display = 'none';
    } finally {
        isLoadingRecipes = false;
        if (loadMoreBtn) loadMoreBtn.textContent = 'Muat Lebih Banyak Resep';
    }
}

/**
 * Membuat dan merender card resep (menggunakan asumsi dari resep.js).
 */
function createRecipeCard(recipe) {
    const timeTotal = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    const ratingValue = recipe.avgRating || 0;
    const starHTML = createRatingStarsHTML(ratingValue);
    const categoryDisplay = recipe.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    let imageUrl = recipe.imageUrl || 'https://via.placeholder.com/400x300?text=Resep';
    
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
        imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}`;
    }

    // Menggunakan kelas card resep standar (asumsi ada di main.css atau resep.css)
    return `
        <!--<a href="resep_detail.html?id=${recipe._id}" class="recipe-card">
            <div class="card-image-wrapper">
                <img src="${imageUrl}" alt="${recipe.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Gagal+Muat'">
                <span class="category-badge">${categoryDisplay}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${recipe.title}</h3>
                <div class="card-meta">
                    <span class="time"><i class="far fa-clock"></i> ${timeTotal} Menit</span>
                    <span class="likes"><i class="fas fa-heart"></i> ${recipe.likesCount || 0}</span>
                </div>
            </div>
        </a>-->

        <a href="resep_detail.html?id=${recipe._id}" class="recipe-card">
            <div class="card-image">
                <img src="${imageUrl}" alt="${recipe.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Foto+Resep'">
                <span class="category-badge">${categoryDisplay}</span>
            </div>
            <div class="card-info">
                <h3>${recipe.title}</h3>
                <div class="card-more-info">
                    <p class="duration"><i class="far fa-clock"></i> ${timeTotal} Menit</p>
                    <span class="save-recipe-for-like"><i class="fas fa-heart"></i> ${recipe.likesCount || 0}</span>
                    <p class="star-rating">
                        ${starHTML} 
                        <span class="rating-number">${ratingValue.toFixed(1)}</span>
                    </p>
                </div>
            </div>
        </a>
    `;
}

function renderUserRecipes(recipesArray) {
    if (recipesArray.length === 0 && currentPage === 1) {
        userRecipesListEl.innerHTML = `<div class="loading-recipes-state">Pengguna ini belum memublikasikan resep apapun.</div>`;
        return;
    }
    
    // Hapus loading state jika ada sebelum menambahkan resep
    if (userRecipesListEl.querySelector('.loading-recipes-state')) {
        userRecipesListEl.innerHTML = '';
    }

    const newRecipeHTML = recipesArray.map(createRecipeCard).join('');
    userRecipesListEl.insertAdjacentHTML('beforeend', newRecipeHTML);
}

// Fungsi untuk membuat HTML bintang rating (disalin dari resep_detail.js)
function createRatingStarsHTML(ratingValue) {
    let starsHTML = '';
    const rating = parseFloat(ratingValue) || 0;

    for (let i = 1; i <= 5; i++) {
        // Logika Bintang Full
        if (i <= Math.floor(rating)) {
            starsHTML += '<i class="fas fa-star active"></i>';
        } 
        // Logika Bintang Setengah (Jika sisa desimal >= 0.3 dan < 0.8)
        else if (i === Math.ceil(rating) && (rating % 1 >= 0.3 && rating % 1 < 0.8)) {
            starsHTML += '<i class="fas fa-star-half-alt active"></i>';
        }
        // Logika Pembulatan ke Atas (Jika desimal >= 0.8, dianggap bintang penuh)
        else if (i === Math.ceil(rating) && (rating % 1 >= 0.8)) {
            starsHTML += '<i class="fas fa-star active"></i>';
        }
        // Bintang Kosong
        else {
            starsHTML += '<i class="far fa-star"></i>';
        }
    }
    return starsHTML;
}

function updatePaginationControls(hasMore, totalRecipes) {
    if (totalRecipes === 0) {
        loadMoreBtnContainer.style.display = 'none';
        return;
    }
    
    if (!hasMore) {
        loadMoreBtnContainer.style.display = 'none'; 
    } else {
        loadMoreBtnContainer.style.display = 'block'; 
        loadMoreBtn.disabled = false;
    }
}


// =======================================================
// INIT & EVENT LISTENERS
// =======================================================

function initApp() {
    // Pastikan Navbar dan Auth UI diperbarui
    updateAuthUI(); 
    
    // --- Ambil ID dari URL ---
    const urlId = getUrlParameter('id');
    const loggedInUser = getAuthUser();
    
    // Gunakan _id (dengan underscore) sesuai dengan log localStorage Anda tadi
    let profileIdToLoad = urlId || (loggedInUser ? (loggedInUser._id || loggedInUser.id) : null);

    if (!profileIdToLoad) {
        renderErrorState("Silakan login untuk melihat profil Anda.");
        return;
    }

    if (!urlId && loggedInUser) {
        // Jika tidak ada ID di URL, muat profil pengguna yang sedang login
        profileIdToLoad = loggedInUser._id;
        // Juga pastikan link "Profil Saya" di navbar terarah dengan benar
        const myProfileLink = document.getElementById('my-profile-link');
        if (myProfileLink) myProfileLink.href = `lihat_profil.html?id=${profileIdToLoad}`;
    } else if (!urlId && !loggedInUser) {
        // Jika tidak ada ID di URL DAN tidak ada user yang login
        renderErrorState("Anda belum masuk dan tidak ada profil yang ditentukan untuk dilihat. Silakan <a href='daftar_atau_login.html'>Masuk</a>.");
        loadingState.style.display = 'none';
        return;
    }
    
    // 1. Fetch Profil
    if (profileIdToLoad) {
        fetchUserProfile(profileIdToLoad);
    }
    
    // 2. Event Listeners (Navbar Standar SajiLe)
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => { hamburgerBtn.classList.toggle('active'); navMenu.classList.toggle('active'); });
    }

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

    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('active'); });
        document.addEventListener('click', (e) => { 
            if (profileDropdown && !profileDropdown.contains(e.target) && profilePicBtn && !profilePicBtn.contains(e.target)) {
                 profileDropdown.classList.remove('active'); 
            }
        });
    }
    
    // Logika Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                window.location.href = '../index.html';
            }
        });
    }
    
    // Logika Load More
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            if (targetUserId) {
                fetchUserRecipes(targetUserId, false); // Muat halaman selanjutnya
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initApp);