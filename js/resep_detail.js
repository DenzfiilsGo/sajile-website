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

let currentUserId = null;

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

async function checkLoginState(navAuthLinks, profileDropdownWrapper, btnSaveSignIn, btnSave, body) {
    // ✅ PERBAIKAN: Menggunakan kunci 'authToken'
    const token = localStorage.getItem('authToken');
    // ✅ PERBAIKAN: Menggunakan kunci 'authUser'
    const userDataJSON = localStorage.getItem('authUser');
    
    // Asumsi: Token valid jika ada dan data pengguna ada
    if (token && userDataJSON) {
        currentUserId = userDataJSON._id;
        // Logika sederhana: anggap token dan data di LS valid
        if (navAuthLinks) navAuthLinks.style.display = 'none'
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (btnSaveSignIn) btnSaveSignIn.style.display = 'none';
        if (btnSave) btnSave.style.display = 'inline-block';
        if (body) body.dataset.loggedIn = 'true';

        // ⭐ Panggil fungsi untuk memperbarui UI profil ⭐
        updateUserProfileUI();
    } else {
        if (navAuthLinks) navAuthLinks.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        if (btnSaveSignIn) btnSaveSignIn.style.display = !btnSaveSignIn;
        if (btnSave) btnSave.style.display = 'none';
        if (body) body.dataset.loggedIn = 'false';
    }
}

// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
import { API_AUTH_URL, API_BASE_URL, PUBLIC_BACKEND_URL } from '../js/config.js';
import { validateToken } from './authManager.js'; // Pastikan ini diimpor!

document.addEventListener('DOMContentLoaded', async () => {
    // Deklarasi Fungsi dan Variabel
    const body = document.body;
    const navAuthLinks = document.querySelector('.nav-auth-links');
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
    const logoutBtn = document.getElementById('logout-btn');
    const recipeDetailContainer = document.querySelector('.main-wrapper'); // Pastikan ini ada di HTML Anda
    const btnSaveSignIn = document.getElementById("btn-save-login")
    const btnSave = document.getElementById("btn-save")
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
    checkLoginState(navAuthLinks, profileDropdownWrapper, btnSaveSignIn, btnSave,body); 

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

    // File: js/resep_detail.js

    // ... (Import dan setup awal tetap sama) ...

    // =======================================================
    // 1. LOGIKA RATING BINTANG (Sesuai HTML Anda: span.star)
    // =======================================================
    let currentRating = 0;

    function initRatingSystem() {
        const stars = document.querySelectorAll('.rating-input .star');
        const ratingText = document.getElementById('rating-text');

        stars.forEach(star => {
            // Hover Effect
            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                updateStarVisuals(rating);
            });

            // Click Effect (Set Value)
            star.addEventListener('click', () => {
                currentRating = parseInt(star.getAttribute('data-rating'));
                updateStarVisuals(currentRating);
                if (ratingText) ratingText.textContent = ` (${currentRating}/5)`;
                
                // Highlight permanen
                stars.forEach(s => {
                    const r = parseInt(s.getAttribute('data-rating'));
                    if (r <= currentRating) s.classList.add('selected');
                    else s.classList.remove('selected');
                });
            });
        });

        // Reset visual saat mouse keluar (kecuali sudah diklik)
        document.querySelector('.rating-input').addEventListener('mouseleave', () => {
            updateStarVisuals(currentRating);
        });
    }

    // --------------------------------------------------------
    // A. HELPER: FUNGSI PEMBUAT BINTANG (Sesuai dengan HTML)
    // --------------------------------------------------------

    /**
     * Membuat HTML untuk bintang rating berdasarkan skor (misalnya 4.5).
     * @param {number} rating - Skor rating (0 hingga 5).
     * @returns {string} HTML string untuk bintang.
     */
    function createStarsHtml(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - Math.ceil(rating);

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star active"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt active"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>'; // Menggunakan far (outline) untuk bintang kosong
        }
        return stars;
    }

    function updateStarVisuals(rating) {
        const stars = document.querySelectorAll('.rating-input .star i');
        stars.forEach((icon, index) => {
            if (index < rating) {
                icon.classList.remove('far');
                icon.classList.add('fas'); // Bintang penuh
                icon.style.color = '#ffc107'; // Kuning
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far'); // Bintang kosong
                icon.style.color = '#ccc'; // Abu-abu
            }
        });
    }

    // --------------------------------------------------------
    // B. FUNGSI WAJIB: PEMBUAT KARTU KOMENTAR (Strict User Requirement)
    // --------------------------------------------------------

    /**
     * Membuat elemen kartu komentar sesuai struktur HTML yang diminta.
     * @param {object} comment - Objek komentar dari API.
     * @param {string|number} currentUserId - ID pengguna yang sedang login.
     * @returns {HTMLElement} Elemen <div> kartu komentar.
     */
    function createCommentCard(comment, currentUserId) {
        const isCurrentUserComment =
            String(comment.user?._id) === String(currentUserId);

        const commentDiv = document.createElement('div');
        commentDiv.className = isCurrentUserComment
            ? 'comment-item user-comment'
            : 'comment-item';

        commentDiv.setAttribute('data-comment-id', comment._id);
        commentDiv.setAttribute('data-user-id', comment.user._id);

        const isEdited = comment.isEdited === true;

        const userNameDisplay = isCurrentUserComment
            ? `Kamu <span style="color: var(--color-primary-dark); font-size: 0.8em;">(Anda)</span>`
            : comment.user.username;

        // ⭐ render bintang
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += i <= comment.rating
                ? '<i class="fas fa-star"></i>'
                : '<i class="far fa-star"></i>';
        }

        commentDiv.innerHTML = `
            <div class="comment-avatar">
                <img 
                    src="${comment.user.profilePictureUrl || 'https://placehold.co/50x50'}" 
                    alt="Avatar ${comment.user.username}">
            </div>

            <div class="comment-body">
                <h4>${userNameDisplay}</h4>

                <div class="rating" style="color:#ffc107; font-size:0.8rem;">
                    ${starsHTML} (${comment.rating}/5)
                </div>

                <p class="comment-text-content">${comment.content}</p>

                ${
                    isCurrentUserComment
                        ? `
                    <div class="comment-actions logged-in-only">
                        <button 
                            class="edit-comment-btn"
                            data-comment-id="${comment._id}"
                            ${isEdited ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}
                        >
                            ${isEdited ? 'Sudah Diedit' : 'Edit (1x)'}
                        </button>
                        <button 
                            class="delete-comment-btn"
                            data-comment-id="${comment._id}">
                            Hapus
                        </button>
                    </div>
                    `
                        : ''
                }
            </div>
        `;

        // 🔗 Event listener khusus komentar milik user
        if (isCurrentUserComment) {
            const editBtn = commentDiv.querySelector('.edit-comment-btn');
            const deleteBtn = commentDiv.querySelector('.delete-comment-btn');

            if (editBtn && !isEdited) {
                editBtn.addEventListener('click', () =>
                    handleEditComment(comment._id, comment.content, comment.rating)
                );
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', () =>
                    handleDeleteComment(comment._id, commentDiv)
                );
            }
        }

        return commentDiv;
    }

    // --------------------------------------------------------
    // C. LOGIKA PENGIRIMAN KOMENTAR (Memperbaiki Tombol Submit)
    // --------------------------------------------------------

    /**
     * Menangani proses pengiriman komentar ke API.
     */
    async function submitComment(recipeId, commentText, rating, currentUserId) {
        const authToken = localStorage.getItem('authToken'); // Asumsi token disimpan di localStorage
        const ratingValue = currentRating;

        if (!authToken) {
            alert('Anda harus login untuk mengirim komentar!');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    recipeId,
                    content: commentText,
                    rating
                })
            });

            const result = await response.json();

            if (response.ok) {
                console.log('Komentar berhasil dikirim:', result.comment);
                
                // 1. Ambil kontainer list komentar
                const commentsListContainer = document.getElementById('comment-list');
                
                // 2. Buat kartu komentar baru
                // Asumsi API mengembalikan semua data yang diperlukan (termasuk username dan PP URL)
                const newCommentCard = createCommentCard(result.comment, currentUserId);
                
                // 3. Masukkan kartu baru di bagian atas (prepend)
                if (commentsListContainer) {
                    commentsListContainer.prepend(newCommentCard); // Tambahkan di atas
                }
                
                // 4. Bersihkan formulir
                document.getElementById('comment-textarea').value = '';
                // Reset rating di UI
                // ... (Tambahkan logika reset rating UI Anda di sini)
                
                alert('Komentar berhasil ditambahkan!');
            } else {
                alert(`Gagal mengirim komentar: ${result.msg || 'Terjadi kesalahan.'}`);
            }
        } catch (error) {
            console.error('Error saat mengirim komentar:', error);
            alert('Kesalahan koneksi saat mencoba mengirim komentar.');
        }
    }

    /**
     * Inisialisasi Event Listener untuk formulir komentar.
     * ⭐ HARUS DIPANGGIL SETELAH FUNGSI RENDER UTAMA SELESAI.
     */
    function initCommentFormListener(recipeId, currentUserId) {
        if (!currentUserId) {
            console.warn('User belum login, form komentar tidak diaktifkan.');
            return;
        }
        const submitBtn = document.getElementById('submit-comment'); // Asumsi ID tombol submit adalah ini
        const commentInput = document.getElementById('comment-textarea'); // Asumsi ID textarea
        const ratingValue = currentRating;

        if (submitBtn && commentInput) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Asumsi nilai rating diambil dari elemen terpisah.
                // Anda perlu logika untuk mendapatkan rating yang dipilih (misalnya 4.5)
                const ratingValue = getSelectedRating(); // ⭐ Anda harus mendefinisikan fungsi ini!
                const commentText = commentInput.value.trim();

                if (!commentText || ratingValue === 0) {
                    alert('Rating dan Komentar tidak boleh kosong.');
                    return;
                }

                submitComment(recipeId, commentText, ratingValue, currentUserId);
            });
        } else {
            console.warn("Tombol Submit Komentar atau Textarea tidak ditemukan di DOM.");
        }
    }

    function handleLoginStateUI(isLoggedIn) {
        const commentForm = document.querySelector('.comment-form');
        if (!commentForm) console.error("commentForm tidak ditemukan atau null!")
        
        const loginRequired = document.querySelector('.comment-login-required');

        if (isLoggedIn) {
            console.log("Status Login: ✅ Menampilkan form rating.");
            if (commentForm) commentForm.style.display = 'block';
            if (loginRequired) loginRequired.style.display = 'none';

            // ⭐ PENTING: Inisialisasi sistem rating HANYA JIKA pengguna login!
            initRatingSystem(); 

        } else {
            console.log("Status Login: ❌ Menyembunyikan form rating.");
            if (commentForm) commentForm.style.display = 'none';
            if (loginRequired) loginRequired.style.display = 'block';
        }
    }

    initRatingSystem();

    // B. Load Komentar
    async function loadComments(recipeId) {
        try {
            const res = await fetch(`${API_BASE_URL}/comments/${recipeId}`);
            const result = await handleApiResponseSecure(res);
            
            if (result.ok) {
                renderComments(result.data);
            }
        } catch (err) { console.error(err); }
    }

    function renderComments(comments) {
        const list = document.getElementById('comment-list');
        const countSpan = document.getElementById('comment-count');

        if (!list) {
            console.error('[renderComments] comment-list tidak ditemukan');
            return;
        }

        // Update jumlah komentar
        if (countSpan) {
            countSpan.textContent = comments.length;
        }

        // Ambil user login
        const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
        const currentUserId = currentUser.id || currentUser._id;

        // Bersihkan list lama
        list.innerHTML = '';

        // Render satu per satu menggunakan createCommentCard
        comments.forEach(comment => {
            const commentCard = createCommentCard(comment, currentUserId);
            list.appendChild(commentCard);
        });

        // Pasang ulang event edit / hapus
        attachCommentActions();
    }

    // =======================================================
    // 3. LOGIKA MODAL EDIT (Sesuai HTML Modal Anda)
    // =======================================================
    function attachCommentActions() {
        const modal = document.getElementById('editCommentModal');
        const closeBtn = document.querySelector('.close-btn');
        const saveBtn = document.getElementById('save-edit-btn');
        const editTextarea = document.getElementById('edit-comment-textarea');
        let currentEditId = null;

        // A. Buka Modal Edit
        document.querySelectorAll('.edit-comment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.hasAttribute('disabled')) return; // Cegah jika sudah diedit
                
                currentEditId = btn.getAttribute('data-id');
                editTextarea.value = btn.getAttribute('data-content'); // Isi textarea dengan komentar lama
                modal.style.display = 'block';
            });
        });

        // B. Tutup Modal
        if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

        // C. Simpan Edit
        if(saveBtn) {
            saveBtn.onclick = async () => {
                if(!currentEditId) return;
                const newContent = editTextarea.value;
                const token = localStorage.getItem('authToken');

                try {
                    const res = await fetch(`${API_BASE_URL}/comments/${currentEditId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ content: newContent })
                    });

                    if (res.ok) {
                        modal.style.display = 'none';
                        window.location.reload(); // Refresh untuk update status "Sudah Diedit"
                    } else {
                        const err = await res.json();
                        alert(err.msg);
                    }
                } catch (e) { console.error(e); }
            };
        }

        // D. Hapus Komentar
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(!confirm("Hapus komentar ini?")) return;
                const id = btn.getAttribute('data-id');
                const token = localStorage.getItem('authToken');
                
                try {
                    const res = await fetch(`${API_BASE_URL}/comments/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if(res.ok) window.location.reload();
                } catch(e) { console.error(e); }
            });
        });
    }

    // ... (Panggil initRatingSystem di dalam initPage atau DOMContentLoaded) ...

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
                
                const BtnSave = document.getElementById("btn-save");
                const BtnSaveSignIn = document.getElementById("btn-save-login");
                // Panggil fungsi cek login dengan elemen yang baru diambil
                checkLoginState(navAuthLinks, profileDropdownWrapper, BtnSaveSignIn, BtnSave, body);
                // ⭐ PASANG LISTENER PADA ELEMEN YANG BARU DI-RENDER ⭐
                attachServingCalculatorListeners(); 

                // 👇👇 3. PERBAIKAN: PASANG LOGIKA KLIK FAVORIT DI SINI 👇👇
                // Cek apakah resep ini sudah difavoritkan oleh user (jika backend mengirim datanya)
                // result.data.isFavorited adalah asumsi properti dari backend
                if (result.data.isFavorited) {
                    setFavoriteButtonState(BtnSave, true);
                }

                // Pasang Event Listener
                attachFavoriteDetailListener(BtnSave, recipeId);
                // 👆👆 SELESAI PERBAIKAN 👆👆

                // ⭐ END PERBAIKAN ⭐
                observeFadeInElements(); // Panggil observer setelah render selesai
                // 👇👇 LOG KONTROL KONTEN HTML (Memverifikasi rendering) 👇👇
                const container = document.getElementById('recipe-detail-container');
                if (container) {
                    // Log ini akan muncul *setelah* renderRecipe selesai
                    console.log('7. [DEBUG] Kontainer HTML telah diupdate. Cek innerHTML:', container.innerHTML.substring(0, 50) + '...');
                }

                // di fetchRecipeDetails(), setelah renderRecipe(result.data)
                await loadComments(result.data._id);
                initCommentFormListener(result.data._id, currentUserId);
            } else {
                console.error('3. [DEBUG] ❌ Gagal Memuat Resep (API Error):', result.data.msg);
                recipeDetailContainer.innerHTML = `<p>Gagal memuat resep: ${result.data.msg || 'Terjadi kesalahan'}</p>`;
            }

        } catch (err) {
            console.error("3. [DEBUG] 🛑 Kesalahan Koneksi/Parsing:", err);
            recipeDetailContainer.innerHTML = `<p>Kesalahan koneksi saat memuat resep.</p>`;
        }
    }

    // ========================================================
    // 🆕 FUNGSI LOGIKA FAVORIT DETAIL (Tambahkan di resep_detail.js)
    // ========================================================
    
    function setFavoriteButtonState(btn, isSaved) {
        if (!btn) return;
        const icon = btn.querySelector('i');
        
        if (isSaved) {
            btn.classList.add('active');
            btn.setAttribute('data-saved', 'true');
            btn.innerHTML = `<i class="fas fa-heart"></i> Tersimpan`; // Ubah teks & ikon solid
        } else {
            btn.classList.remove('active');
            btn.setAttribute('data-saved', 'false');
            btn.innerHTML = `<i class="far fa-heart"></i> Simpan ke Favorit`; // Balik ke awal
        }
    }

    function attachFavoriteDetailListener(btn, recipeId) {
        if (!btn) return;

        // Gunakan replace logic untuk menghindari duplikasi listener
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Ambil ulang referensi tombol baru
        const activeBtn = document.getElementById('btn-save'); 

        activeBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('authToken');
            const user = localStorage.getItem('authUser');
            if (!token && !user) {
                alert("Sesi Anda habis. Silakan login kembali.");
                return;
            }

            const isCurrentlySaved = activeBtn.getAttribute('data-saved') === 'true';
            
            // 1. UI Optimistik (Langsung ubah tampilan)
            setFavoriteButtonState(activeBtn, !isCurrentlySaved);

            try {
                // 2. Panggil API
                const url = `${API_BASE_URL}/favorites`; // Sesuaikan endpoint!
                
                const res = await fetch(url, {
                    method: 'POST', // Asumsi: POST dengan body {recipeId} melakukan toggle otomatis
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ recipeId: recipeId })
                });

                if (!res.ok) throw new Error("Gagal update favorit");
                
                // Jika backend mengembalikan status spesifik, bisa diupdate lagi di sini
                // const data = await res.json();
                
            } catch (error) {
                console.error("Gagal update favorit:", error);
                alert("Gagal menyimpan. Periksa koneksi internet.");
                // Revert UI jika gagal
                setFavoriteButtonState(activeBtn, isCurrentlySaved);
            }
        });
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

        // Template HTML Detail
        recipeDetailContainer.innerHTML = `
            <section class="recipe-hero fade-in">
                <h1>${recipe.title}</h1>
                <p>${recipe.description}</p>
                
                <div class="recipe-image-container">
                    <img src="${imageUrl}" alt="${recipe.title}">
                </div>


                <div class="recipe-actions">
                    <button id="btn-save" class="btn-save logged-in-only" data-saved="false">
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

            <section class="comments-section fade-in">
                <h2>Ulasan Pengguna (<span id="comment-count">3</span>)</h2>
                
                <div class="comment-login-required logged-out-only section-card" style="text-align: center; padding: 20px;">
                    <p><i class="fas fa-lock"></i> Silakan **Masuk** atau **Daftar** untuk dapat memberikan ulasan dan rating resep ini.</p>
                    <a href="daftar_atau_login.html" class="btn-primary" style="margin-top: 10px;">Masuk/Daftar Sekarang</a>
                </div>

                <div class="comment-form section-card logged-in-only">
                    <h4>Tulis Ulasanmu</h4>
                    <div class="rating-input" id="rating-input">
                        <span data-rating="1" class="star"><i class="far fa-star"></i></span>
                        <span data-rating="2" class="star"><i class="far fa-star"></i></span>
                        <span data-rating="3" class="star"><i class="far fa-star"></i></span>
                        <span data-rating="4" class="star"><i class="far fa-star"></i></span>
                        <span data-rating="5" class="star"><i class="far fa-star"></i></span>
                        <span class="rating-text" id="rating-text"> (0/5)</span>
                    </div>
                    <textarea id="comment-textarea" placeholder="Bagikan pengalaman memasak dan ratingmu..."></textarea>
                    <button id="submit-comment" class="btn-primary">Kirim Ulasan</button>
                    <div style="clear: both;"></div>
                </div>

                <div class="comment-list" id="comment-list">
                    
                    <div class="comment-item user-comment" data-comment-id="1" data-user-id="current-user">
                        <div class="comment-avatar">
                            <img src="https://placehold.co/50x50/ffc107/000?text=KU" alt="Avatar Kamu">
                        </div>
                        <div class="comment-body">
                            <h4>Kamu <span style="color: var(--color-primary-dark); font-size: 0.8em;">(Anda)</span></h4>
                            <div class="rating" data-stars="5">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i> (5/5)
                            </div>
                            <p class="comment-text-content">Ini adalah rendang paling enak yang pernah saya buat! Resepnya mudah diikuti dan hasilnya super empuk. Sangat direkomendasikan!</p>
                            <div class="comment-actions logged-in-only"> <button class="edit-comment-btn" data-edit-count="0" data-comment-id="1">Edit</button>
                                <button class="delete-comment-btn" data-comment-id="1">Hapus</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="comment-item" data-comment-id="2" data-user-id="jane-doe">
                        <div class="comment-avatar">
                            <img src="https://placehold.co/50x50/ffb3ba/000?text=JD" alt="Avatar Jane Doe">
                        </div>
                        <div class="comment-body">
                            <h4>Jane Doe</h4>
                            <div class="rating" data-stars="4.5">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i> (4.5/5)
                            </div>
                            <p class="comment-text-content">Resepnya otentik dan rasanya luar biasa! Membutuhkan kesabaran, tapi hasilnya sepadan. Dagingnya empuk dan bumbunya kaya. Terima kasih SajiLe!</p>
                            </div>
                    </div>
                    
                    <div class="comment-item" data-comment-id="3" data-user-id="ahmad-putra">
                        <div class="comment-avatar">
                            <img src="https://placehold.co/50x50/b3d4ff/000?text=AP" alt="Avatar Ahmad Putra">
                        </div>
                        <div class="comment-body">
                            <h4>Ahmad Putra</h4>
                            <div class="rating" data-stars="4">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="far fa-star"></i> (4/5)
                            </div>
                            <p class="comment-text-content">Mantap! Saya kurangi sedikit cabai karena anak-anak ikut makan. Waktu memasak 3 jam memang pas untuk rendang yang sempurna.</p>
                            </div>
                    </div>

                </div>
            </section>
        `;
    }

    // =======================================================
    // 2. STARTUP LOGIC
    // =======================================================
    async function initPage() {
        console.log('⚡ Detail Page Init');
        checkLoginState();

        // 1. Cek status login terlebih dahulu
        // (validateToken akan mengembalikan data user jika valid, atau null jika gagal)
        const freshUser = await validateToken(); 
        const isUserLoggedIn = !!freshUser;
        const currentUserId = freshUser ? freshUser.id : null; // Ambil ID pengguna
        
        // 2. Perbarui UI berdasarkan status login
        handleLoginStateUI(isUserLoggedIn); // <-- INI YANG HILANG!

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