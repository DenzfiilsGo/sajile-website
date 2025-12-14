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

// P5 Project/html/resep.js (Sesuaikan path import jika perlu)

// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
import { PUBLIC_BACKEND_URL, API_AUTH_URL, API_BASE_URL } from '../js/config.js'; 

// Blokir seleksi teks via JavaScript (Sama)
document.addEventListener('selectstart', function(e) { e.preventDefault(); });
document.addEventListener('dragstart', function(e) { e.preventDefault(); });

document.addEventListener('DOMContentLoaded', async () => {
    // ✅ Gunakan API_BASE_URL yang diimpor dari config.js
    const API_RECIPES_URL = `${API_BASE_URL}/recipes`; // URL resep kita sekarang dinamis
    const RECIPES_PER_PAGE = 9;
    
    // --- Elemen DOM ---
    const body = document.body;
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = navMenu ? navMenu.querySelectorAll('.nav-links a') : []; 
    const themeToggle = document.getElementById('theme-toggle');
    const filterTags = document.querySelectorAll('.filter-tags .tag');
    const recipeGrid = document.querySelector('.recipe-grid');
    const recipeContainer = recipeGrid;
    const recipeCountDisplay = document.getElementById('recipe-count-display');

    let currentPage = 0;
    let totalRecipes = 0;
    let isLoading = false;
    let currentFilter = 'Semua';
    
    const loadMoreBtnContainer = document.querySelector('.load-more-btn-container');
    const loadMoreBtn = loadMoreBtnContainer ? loadMoreBtnContainer.querySelector('.btn-primary') : null;

    // --- SETUP INTERSECTION OBSERVER ---
    const observerOptions = { threshold: 0.15 }; 

    const observer = new IntersectionObserver((entries, observerInstance) => { 
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible'); // Ini mengubah opacity jadi 1
            observerInstance.unobserve(entry.target); 
        });
    }, observerOptions);

    // ============================================================
    // [PERBAIKAN UTAMA] - INI YANG HILANG SEBELUMNYA
    // Mengaktifkan animasi untuk elemen statis (Header, Search, CTA)
    // ============================================================
    const staticFadeElements = document.querySelectorAll('.fade-in');
    staticFadeElements.forEach(el => {
        observer.observe(el);
    });
    // ============================================================

    // ========================================================
    // LOGIKA CEK STATUS LOGIN (NAVBAR UI) - Diperbaiki
    // ========================================================
    const navAuthLinks = document.querySelector('.nav-auth-links');
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
    const logoutBtn = document.getElementById('logout-btn');

    // --- 2. Cek Status Login Saat Halaman Dimuat ---
    checkLoginState(navAuthLinks, profileDropdownWrapper, body); 

    // Logika Logout
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

    // ========================================================
    // FUNGSI UTAMA UNTUK MENGAMBIL DATA RESEP
    // ========================================================
    
    // --- Helper function untuk penanganan respons API yang aman (sama seperti di beranda.js) ---
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
            console.error("Gagal parse JSON. Respons teks:", responseText);
            return { ok: false, data: { msg: 'Kesalahan format respons dari server' } };
        }
    }
    

    async function fetchRecipes() {
        if (isLoading) return;
        isLoading = true;
        
        const offset = currentPage * RECIPES_PER_PAGE; 
        
        if (loadMoreBtn) loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';

        try {
            // URL resep sudah menggunakan API_BASE_URL yang dimuat dari config.js
            const url = `${API_BASE_URL}/recipes?limit=${RECIPES_PER_PAGE}&offset=${offset}`;
            console.log('Fetching:', url);
            
            const res = await fetch(url, { 
                cache: 'no-cache',
                credentials: 'include' // ✅ Tambahkan ini untuk konsistensi CORS
            });

            // ✅ Gunakan helper penanganan respons yang aman
            const result = await handleApiResponseSecure(res);

            if (!result.ok) {
                // Tangani error menggunakan pesan dari helper
                throw new Error(result.data.msg || 'Gagal memuat resep.');
            }

            const data = result.data; // Data JSON yang sudah di-parse
            const recipes = data.recipes || [];
            totalRecipes = data.total || 0;
            
            // 1. Render resep baru
            renderRecipes(recipes);

            // 2. Perbarui state halaman
            currentPage++;
            
            // 3. Cek apakah masih ada resep untuk dimuat (data.hasMore atau perbandingan)
            const hasMore = data.hasMore; 
            
            if (loadMoreBtnContainer) {
                if (!hasMore) {
                    loadMoreBtnContainer.style.display = 'none'; // Sembunyikan tombol
                    console.log('Semua resep telah dimuat.');
                } else {
                    loadMoreBtnContainer.style.display = 'flex'; // Pastikan terlihat
                    if (loadMoreBtn) loadMoreBtn.textContent = 'Muat Lebih Banyak Resep';
                }
            }

        } catch (error) {
            console.error('Error saat mengambil resep:', error);
            alert('Gagal memuat resep. Silakan coba lagi nanti.');
            if (loadMoreBtn) loadMoreBtn.textContent = 'Gagal Memuat Resep';
        } finally {
            isLoading = false;
            // Panggil kembali observer untuk animasi fade-in pada card baru
            document.querySelectorAll('.recipe-card:not(.visible)').forEach(el => observer.observe(el));
            // ✅ Panggil updatePaginationControls di sini setelah loading selesai
            updatePaginationControls();
        }
    }

    // Fungsi untuk merender HTML card resep
    function renderRecipes(recipesArray, append = false) {
        if (!recipesArray || recipesArray.length === 0) {
            if (currentPage > 0) { 
                recipeGrid.innerHTML = `<div class="empty-state">Tidak ada resep untuk filter ini.</div>`;
            }
            return;
        }

        const newRecipeHTML = recipesArray.map(recipe => {
            const ratingValue = recipe.avgRating || 0;
            const starHTML = createRatingStarsHTML(ratingValue);
            const shortDesc = recipe.description.length > 100 
                ? recipe.description.substring(0, 100) + '...' 
                : recipe.description;
            
            // 👇👇 PERBAIKAN DI FUNGSI INI 👇👇
            let imageUrl = recipe.imageUrl || 'https://via.placeholder.com/300x200?text=Resep';
            
            // Jika URL gambar dimulai dengan '/' dan bukan http:// atau https://
            if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
                imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}`;
            }
            
            // 👇👇 PERBAIKAN STRUKTUR HTML AGAR SESUAI DENGAN resep.html 👇👇
            const timeTotal = (recipe.prepTime || 0) + (recipe.cookTime || 0);
            const categoryDisplay = recipe.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

            return `
                <a href="resep_detail.html?id=${recipe._id}" class="recipe-card fade-in">
                    <div class="card-image">
                        <img src="${imageUrl}" alt="${recipe.title}" loading="lazy" onerror="this.src='via.placeholder.co'">
                        <span class="category-badge">${categoryDisplay}</span>
                        <button class="btn-fav" aria-label="Tambahkan ke Favorit"><i class="far fa-heart"></i></button>
                    </div>
                    <div class="card-info">
                        <h3>${recipe.title}</h3>
                        <p class="duration"><i class="far fa-clock"></i> ${timeTotal} Menit</p>
                    </div>
                </a>
            `;
            // 👆👆 SELESAI PERBAIKAN STRUKTUR HTML 👆👆
        }).join('');
        
        // ... (kode di bawah ini sama persis) ...
        if (append) {
            recipeGrid.insertAdjacentHTML('beforeend', newRecipeHTML);
        } else {
            recipeGrid.innerHTML = newRecipeHTML;
        }
        
        const newlyAddedElements = recipeGrid.querySelectorAll('.recipe-card:not(.visible)');
        newlyAddedElements.forEach(el => observer.observe(el));
    }
    
    // Fungsi untuk membuat markup HTML untuk satu resep (sekitar baris 265 di kode Anda)
    function createRecipeCard(recipe) {
        const timeTotal = (recipe.prepTime || 0) + (recipe.cookTime || 0);
        const categoryDisplay = recipe.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        // 👇👇 PERBAIKAN UTAMA DI SINI 👇👇
        // Pastikan URL gambar dimulai dengan PUBLIC_BACKEND_URL jika itu relatif
        let imageUrl = recipe.imageUrl || 'via.placeholder.com';
        
        // Jika URL gambar dimulai dengan '/' dan bukan http:// atau https://
        if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
            imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}`;
        }
        // 👆👆 SELESAI PERBAIKAN 👆👆


        return `
            <a href="resep_detail.html?id=${recipe._id}" class="recipe-card fade-in">
                <div class="card-image">
                    <img src="${imageUrl}" alt="${recipe.title}" loading="lazy" onerror="this.src='via.placeholder.co'">
                    <span class="category-badge">${categoryDisplay}</span>
                    <button class="btn-fav" aria-label="Tambahkan ke Favorit"><i class="far fa-heart"></i></button>
                </div>
                <div class="card-info">
                    <h3>${recipe.title}</h3>
                    <p class="duration"><i class="far fa-clock"></i> ${timeTotal} Menit</p>
                </div>
            </a>
        `;
    }

    // Fungsi untuk menambahkan resep ke kontainer
    function renderRecipes(recipes) {
        const html = recipes.map(createRecipeCard).join('');
        recipeContainer.insertAdjacentHTML('beforeend', html);
    }

    // Fungsi untuk mengupdate tombol Load More
    function updatePaginationControls() {
        if (loadMoreBtn) loadMoreBtn.disabled = false;
        
        const loadedCount = currentPage * RECIPES_PER_PAGE;
        const remainingCount = totalRecipes - loadedCount;
        
        if (recipeCountDisplay) {
            recipeCountDisplay.textContent = `Menampilkan ${Math.min(loadedCount, totalRecipes)} dari ${totalRecipes} Resep`;
        }

        if (loadMoreBtn) {
            if (loadedCount >= totalRecipes) {
                // Sembunyikan atau nonaktifkan jika semua sudah dimuat
                loadMoreBtn.style.display = 'none'; 
            } else {
                // Tampilkan kembali
                loadMoreBtn.style.display = 'block'; 
                loadMoreBtn.textContent = `Muat ${Math.min(remainingCount, RECIPES_PER_PAGE)} Resep Lagi`;
            }
        }
    }
    
    // Fungsi untuk membuat HTML bintang rating (disalin dari resep_detail.js)
    function createRatingStarsHTML(ratingValue) {
        let starsHTML = '';
        const fullStars = Math.floor(ratingValue);
        const hasHalfStar = (Math.round(ratingValue * 10) % 10) === 5; 

        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                starsHTML += '<i class="fas fa-star"></i>';
            } else if (hasHalfStar && i === fullStars + 1) {
                starsHTML += '<i class="fas fa-star-half-alt"></i>';
            } else {
                starsHTML += '<i class="far fa-star"></i>';
            }
        }
        return starsHTML;
    }


    // ========================================================
    // 4. Filter Logic (REAL - Memanggil API)
    // ========================================================
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', function() {
            filterTags.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.getAttribute('data-filter') || this.textContent.trim(); // ✅ Update filter global
            
            // ✅ Reset halaman ke 0 saat filter baru diterapkan
            currentPage = 0; 
            fetchRecipes(); // Panggil API untuk memuat ulang resep dari halaman 0
        });
    });

    // ========================================================
    // START UP LOGIC (LOGIKA UTAMA YANG MENUNGGU config.js)
    // ========================================================
    
    function initResepPage() {
        // Ini adalah fungsi inisialisasi yang menunggu URL dimuat
        console.log('⚡ Resep.js: Inisialisasi setelah URL backend dimuat:', API_BASE_URL);
        checkLoginState(); // Cek status login setelah URL siap
        fetchRecipes(); // Muat resep pertama kali (currentPage=0, filter default)

        // Event Listener untuk tombol "Muat Lebih Banyak Resep" (Diaktifkan di sini)
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // currentPage sudah diincrement di fetchRecipes() sebelumnya
                fetchRecipes(); 
            });
        }
    }

    // Terapkan pola event listener dari beranda.js untuk menunggu URL dimuat
    if (API_BASE_URL) {
        initResepPage();
    } else {
        // Jika config.js belum selesai, tunggu event kustom
        window.addEventListener('backend-url-changed', initResepPage);
    }

    // ========================================================
    // START UP LOGIC
    // ========================================================

    // --- 1. Navbar Toggle Logic (STANDAR WAJIB) ---
    // Memastikan desain navbar dan dropdown vertical menu sesuai standar wajib [2025-11-27]
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');

            if (navMenu.classList.contains('active')) {
                if (window.innerWidth <= 1024) {
                    document.body.style.overflow = 'hidden'; 
                }
            } else {
                document.body.style.overflow = ''; 
            }
        });
    }

    // Tutup menu jika link di dalam dropdown diklik
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(() => {
                if(hamburgerBtn) hamburgerBtn.classList.remove('active');
                if(navMenu) navMenu.classList.remove('active');
                document.body.style.overflow = '';
            }, 300);
        });
    });


    // --- 2. Dark Mode Toggle (Perbaiki nama LS key agar konsisten) ---
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
            const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
            body.dataset.theme = newTheme;
            localStorage.setItem('sajile_theme', newTheme);

            if (icon) {
                icon.classList.toggle('fa-moon');
                icon.classList.toggle('fa-sun');
            }
        });
    }
}); // Akhir DOMContentLoaded