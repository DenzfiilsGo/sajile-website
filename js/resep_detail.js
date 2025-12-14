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

// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
import { API_AUTH_URL, API_BASE_URL, PUBLIC_BACKEND_URL } from '../js/config.js'; 

document.addEventListener('DOMContentLoaded', async () => {
    // Deklarasi Fungsi dan Variabel
    const body = document.body;
    const navAuthLinks = document.querySelector('.nav-auth-links');
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
    const logoutBtn = document.getElementById('logout-btn');
    const recipeDetailContainer = document.querySelector('.main-wrapper'); // Pastikan ini ada di HTML Anda
    let currentMultiplier = 1;
    let originalServingSize = null;

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
            console.error("Gagal parse JSON. Respons teks:", responseText);
            return { ok: false, data: { msg: 'Kesalahan format respons dari server' } };
        }
    }

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

    // Toggle Dropdown Profil (Untuk Desktop)
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
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

    // ========================================================
    // 2. FUNGSI KALKULATOR PORSI BARU
    // ========================================================

    function updateServings(newMultiplier) {
        // Batasi porsi minimal (misalnya 0.5x)
        if (newMultiplier < 0.5) return; 
        
        // Batasi porsi maksimal (misalnya 10x)
        if (newMultiplier > 10) return; 

        currentMultiplier = newMultiplier;

        // 1. Update Serving Multiplier display (e.g., 1x, 1.5x, 2x)
        const multiplierDisplay = document.getElementById('serving-multiplier');
        if (multiplierDisplay) {
            multiplierDisplay.textContent = `${newMultiplier % 1 === 0 ? newMultiplier.toFixed(0) : newMultiplier.toFixed(1)}x`;
        }

        // 2. Update Serving Size display (e.g., 4 Porsi -> 6 Porsi)
        const servingSizeDisplay = document.getElementById('serving-size');
        if (servingSizeDisplay && originalServingSize !== null) {
            const newSize = originalServingSize * newMultiplier;
            // Tampilkan angka bulat untuk ukuran porsi
            servingSizeDisplay.textContent = newSize.toFixed(0); 
        }

        // 3. Update Ingredient Quantities
        const ingredientItems = document.querySelectorAll('#ingredients-list li');
        
        ingredientItems.forEach(item => {
            const originalQtyStr = item.getAttribute('data-original-qty');
            const unit = item.getAttribute('data-unit') || '';
            const qtySpan = item.querySelector('.qty');
            
            if (originalQtyStr && qtySpan) {
                const isNumeric = !isNaN(parseFloat(originalQtyStr));

                if (isNumeric) {
                    const originalQty = parseFloat(originalQtyStr);
                    const newQty = originalQty * newMultiplier;
                    
                    // Formatting: Tampilkan 1 desimal jika bukan bilangan bulat
                    let formattedQty = newQty % 1 === 0 ? newQty.toFixed(0) : newQty.toFixed(1);
                    
                    qtySpan.textContent = `${formattedQty} ${unit}`;
                } else {
                    // Jika quantity adalah string (misal 'Secukupnya'), jangan ubah
                    qtySpan.textContent = originalQtyStr;
                }
            }
        });
    }

    function attachServingCalculatorListeners() {
        const decreaseBtn = document.getElementById('decrease-serving');
        const increaseBtn = document.getElementById('increase-serving');

        if (decreaseBtn && increaseBtn) {
            // Mengurangi porsi 0.5x
            decreaseBtn.addEventListener('click', () => {
                updateServings(currentMultiplier - 0.5); 
            });

            // Menambah porsi 0.5x
            increaseBtn.addEventListener('click', () => {
                updateServings(currentMultiplier + 0.5); 
            });
        }
    }

    // ========================================================
    // FUNGSI INTI: AMBIL DAN RENDER DETAIL RESEP
    // ========================================================

    async function fetchRecipeDetails(recipeId) {
        if (!API_BASE_URL) {
            console.error("URL Backend belum dimuat.");
            return;
        }
        
        const url = `${API_BASE_URL}/recipes/${recipeId}`;
        console.log('1. [DEBUG] Fetching recipe details:', url);

        try {
            const res = await fetch(url, { credentials: 'include' });
            console.log('2. [DEBUG] Status Response HTTP:', res.status, res.statusText);
            const result = await handleApiResponseSecure(res);

            if (result.ok) {
                console.log('3. [DEBUG] ✅ Data Resep Berhasil Diambil!');
                console.log('4. [DEBUG] Objek Data Resep (cek isi):', result.data);
                console.log('5. [DEBUG] Title Resep:', result.data.title);
                console.log('6. [DEBUG] Jumlah Bahan:', result.data.ingredients ? result.data.ingredients.length : 0);
                renderRecipe(result.data);
                // ⭐ SET NILAI AWAL & RENDER ⭐
                originalServingSize = parseInt(result.data.servingSize) || 1; // Ambil nilai porsi asli
                currentMultiplier = 1; // Pastikan multiplier kembali ke 1x
                renderRecipe(result.data);
                
                // ⭐ PASANG LISTENER PADA ELEMEN YANG BARU DI-RENDER ⭐
                attachServingCalculatorListeners(); 
                // ⭐ END PERBAIKAN ⭐
                observeFadeInElements(); // Panggil observer setelah render selesai
                // 👇👇 LOG KONTROL KONTEN HTML (Memverifikasi rendering) 👇👇
                const container = document.getElementById('recipe-detail-container');
                if (container) {
                    // Log ini akan muncul *setelah* renderRecipe selesai
                    console.log('7. [DEBUG] Kontainer HTML telah diupdate. Cek innerHTML:', container.innerHTML.substring(0, 50) + '...');
                }
            } else {
                console.error('3. [DEBUG] ❌ Gagal Memuat Resep (API Error):', result.data.msg);
                recipeDetailContainer.innerHTML = `<p>Gagal memuat resep: ${result.data.msg || 'Terjadi kesalahan'}</p>`;
            }

        } catch (err) {
            console.error("3. [DEBUG] 🛑 Kesalahan Koneksi/Parsing:", err);
            recipeDetailContainer.innerHTML = `<p>Kesalahan koneksi saat memuat resep.</p>`;
        }
    }

    function renderRecipe(recipe) {
        if (!recipeDetailContainer) return;

        // Gambar Aman
        let imageUrl = recipe.imageUrl || 'https://via.placeholder.com/800x400?text=SajiLe';
        if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
            imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}`;
        }

        const timeTotal = (recipe.prepTime || 0) + (recipe.cookTime || 0);
        const category = (recipe.category || 'Umum').replace('_', ' ').toUpperCase();
        const author = recipe.createdBy ? recipe.createdBy.username : 'Anonim';
        
        // ⭐ PERBAIKAN UTAMA: SIMPAN DATA ASLI DI ATTRIBUTE 'data-original-qty' ⭐
        const ingredientsHTML = (recipe.ingredients || []).map(ing => {
            const rawQty = ing.quantity;
            const isNumeric = !isNaN(parseFloat(rawQty));
            const originalQty = isNumeric ? parseFloat(rawQty) : rawQty;
            const unit = ing.unit || '';
            
            // Tampilan awal (1x), format bilangan bulat jika tidak ada desimal
            const initialDisplay = isNumeric 
                ? `${originalQty % 1 === 0 ? originalQty.toFixed(0) : originalQty.toFixed(1)} ${unit}` 
                : rawQty;

            return `<li data-original-qty="${originalQty}" data-unit="${unit}">
                <span class="qty">${initialDisplay}</span> 
                <strong>${ing.name}</strong>
            </li>`;
        }).join('');
        // ⭐ END PERBAIKAN renderRecipe ⭐

        const stepsHTML = (recipe.steps || []).map((step, idx) => 
            `<div class="step-item"><span class="step-num">${idx+1}</span><p>${step}</p></div>`
        ).join('');

        const toolsHTML = (recipe.tools && recipe.tools.length > 0) 
            ? `<div class="recipe-tools"><strong>Alat:</strong> ${recipe.tools.join(', ')}</div>` 
            : '';

        if ()
        // Template HTML Detail
        recipeDetailContainer.innerHTML = `
            <section class="recipe-hero fade-in">
                <h1>${recipe.title}</h1>
                <p>${recipe.description}</p>
                
                <div class="recipe-image-container">
                    <img src="${imageUrl}" alt="${recipe.title}">
                </div>


                <div class="recipe-actions">
                    <button id="btn-save" class="btn-save logged-in-only" data-saved="false" style="display:none;">
                        <i class="far fa-heart"></i> Simpan ke Favorit
                    </button>
                    <button id="btn-save-login" class="btn-save logged-out-only">
                        <i class="far fa-heart"></i> Login untuk Simpan
                    </button>

                    <button id="btn-print" class="btn-primary">
                        <i class="fas fa-print"></i> Cetak Resep
                    </button>
                </div>
            </section>


        
            <section class="recipe-meta-bar fade-in delay-1">
                <div class="meta-item">
                    <i class="far fa-clock"></i>
                    <p>Total Waktu: <span>${recipe.cookTime}</span> Jam</p>
                </div>
                <div class="meta-item">
                    <i class="fas fa-utensils"></i>
                    <p><span id="serving-size">${recipe.servingSize}</span> Porsi</p>
                </div>
                <div class="meta-item">
                    <i class="fas fa-chart-line"></i>
                    <p>Tingkat Kesulitan: <span>Sulit</span></p>
                </div>
            </section>



            <section class="recipe-content-grid">
                

                <aside class="left-column">
                    

                    <div class="section-card fade-in delay-2">
                        <h2>Bahan-bahan</h2>


                        <div class="serving-calculator">
                            <p>Ubah Porsi:</p>
                            <button id="decrease-serving"><i class="fas fa-minus"></i></button>
                            <span id="serving-multiplier">1x</span>
                            <button id="increase-serving"><i class="fas fa-plus"></i></button>
                        </div>

                        <ul class="ingredients-list" id="ingredients-list">
                            ${ingredientsHTML}
                        </ul>
                    </div>

                    <div class="section-card fade-in delay-3">
                        <h2>Nilai Gizi Per Porsi</h2>
                        <div class="nutrition-facts">
                            <table>
                                <tr><th>Kalori</th><td>450 kcal</td></tr>
                                <tr><th>Protein</th><td>35 g</td></tr>
                                <tr><th>Lemak</th><td>30 g</td></tr>
                                <tr><th>Karbohidrat</th><td>10 g</td></tr>
                                <tr><th>Serat</th><td>2 g</td></tr>
                            </table>
                        </div>
                    </div>

                </aside>
                

                <main class="right-column">
                    

                    <div class="section-card fade-in delay-4">
                        <h2>Langkah-langkah Memasak</h2>
                        <ol class="steps-list">
                            ${stepsHTML}
                        </ol>
                    </div>
                </main>
            </section>
        `;
    }

    // =======================================================
    // 2. STARTUP LOGIC
    // =======================================================
    function initPage() {
        console.log('⚡ Detail Page Init');
        checkLoginState();

        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('id');
        if (recipeId) {
            fetchRecipeDetails(recipeId);
        } else {
            if(recipeDetailContainer) recipeDetailContainer.innerHTML = "<p>ID resep tidak ditemukan.</p>";
        }
    }

    if (API_BASE_URL) {
        initPage();
    } else {
        window.addEventListener('backend-url-changed', initPage);
    }

    // =======================================================
    // 3. STANDAR WAJIB: NAVBAR, HAMBURGER & DARK MODE
    // (Tidak ada perubahan di bagian ini)
    // =======================================================
    const themeToggle = document.getElementById('theme-toggle');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');

    // A. Dark Mode Logic
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
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

    // B. Hamburger Menu Logic
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            const isExpanded = navMenu.classList.contains('active');
            hamburgerBtn.setAttribute('aria-expanded', isExpanded);
        });
    }

    // FUNGSI BARU: Pindahkan logika observer ke fungsi terpisah
    function observeFadeInElements() {
        const observerOptions = { threshold: 0.15 };

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            });
        }, observerOptions);

        // Amati semua elemen yang memiliki kelas 'fade-in'
        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    }
});