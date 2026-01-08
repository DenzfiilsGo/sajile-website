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
import { API_BASE_URL } from '../js/config.js';
// 🔑 Tambahkan getAuthToken dan updateAuthUI dari authManager.js
import { getAuthToken, updateAuthUI, removeAuthToken } from './authManager.js'; // <-- BARIS INI HARUS DIPERBARUI
const authToken = getAuthToken();

const MAX_FILE_SIZE_BYTES = 400 * 1024; // 400 KB

// Asumsi Cropper sudah tersedia secara global melalui tag <script> di HTML
let Cropper = window.Cropper;

document.addEventListener('DOMContentLoaded', async () => {
    // --- Elemen DOM ---
    const body = document.body;
    const navAuthLinks = document.querySelector('.nav-auth-links');
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
    const logoutBtn = document.getElementById('logout-btn');
    const submitBtn = document.getElementById('submit-recipe-btn');

    // Navbar Elements
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const themeToggle = document.getElementById('theme-toggle');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');

    // ⭐⭐ ELEMEN ALERT MODAL ⭐⭐
    const customAlertModal = document.getElementById('custom-alert-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalOkBtn = document.getElementById('modal-ok-btn');
    const uploadedFileSizeEl = document.getElementById('uploaded-file-size');
    // ⭐⭐ END ELEMEN ALERT MODAL ⭐⭐

    // Form Elements
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imageInput = document.getElementById('image');
    const btnUpload = document.getElementById('btn-upload-image');
    const previewHero = document.getElementById('image-preview-hero');
    const dropZone = document.getElementById('image-upload-zone');
    // Asumsi: const btnUpload = document.getElementById('btn-upload-image');

    // ⭐⭐ ELEMEN CROP MODAL BARU ⭐⭐
    const cropModal = document.getElementById('crop-modal');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropConfirmBtn = document.getElementById('crop-confirm-btn');
    const cropCancelBtn = document.getElementById('crop-cancel-btn');
    const cropperToolbar = document.querySelector('.cropper-toolbar');

    // ⭐⭐ VARIABEL GLOBAL CROPPER & FILE ⭐⭐
    let cropper = null;
    let originalFile = null; 
    let croppedFileBlob = null; // File Blob yang sudah di-crop, ini yang akan di-submit

    // --- Helper Response Aman ---
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

    // --- Cek Token & User ---
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('authUser');

    if (!token || !userStr) {
        alert("Anda harus Login untuk mengunggah resep!");
        window.location.href = 'daftar_atau_login.html';
        return;
    }

    // Helper: cek apakah token JWT telah kedaluwarsa (decode payload tanpa library)
    function isTokenExpired(jwtToken) {
        if (!jwtToken) return true;
        try {
            const parts = jwtToken.split('.');
            if (parts.length !== 3) return true;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (!payload.exp) return false;
            // exp is in seconds
            return payload.exp * 1000 < Date.now();
        } catch (err) {
            console.warn('Gagal decode token untuk cek expiry', err);
            return false; // jika gagal decode, jangan assume expired (kecuali anda mau)
        }
    }

    // Cek Status UI
    if (navAuthLinks) navAuthLinks.style.display = 'none';
    if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'block';

    function forceLogoutAndRedirect(message = 'Sesi Anda berakhir. Silakan login kembali.') {
        try {
            localStorage.removeItem('authToken');
        } catch (e) {}
        alert(message);
        // beri jeda singkat supaya alert terbaca lalu redirect
        setTimeout(() => {
            window.location.href = 'daftar_atau_login.html';
        }, 300);
    }

    isTokenExpired(token); // Cek apakah token sudah expired

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
    // 2. LOGIKA MODAL PERINGATAN KUSTOM (DIPINDAHKAN KE ATAS)
    // ========================================================

    // --- Helper untuk menampilkan Alert Modal (Jika ukuran file terlalu besar) ---
    function showAlertModal(uploadedSizeKB) {
        if (customAlertModal && modalMessage && uploadedFileSizeEl) {
            // Perbarui pesan dan ukuran yang diunggah
            uploadedFileSizeEl.textContent = `${(uploadedSizeKB).toFixed(2)} KB`;
            modalMessage.innerHTML = `Ukuran file Anda melebihi batas ${MAX_FILE_SIZE_BYTES/1024} KB. <br>Ukuran file yang diunggah: <span id="uploaded-file-size">${(uploadedSizeKB).toFixed(2)} KB</span>.`;
            
            customAlertModal.classList.add('active');
            document.body.style.overflow = 'hidden'; 

            if (modalOkBtn) {
                modalOkBtn.onclick = () => {
                    customAlertModal.classList.remove('active');
                    document.body.style.overflow = '';
                };
            }
        }
    }

    // ========================================================
    // 4. STANDAR WAJIB: FADE IN ANIMATION
    // ========================================================
    const observerOptions = { threshold: 0.15 };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // =======================================================
    // ⭐ LOGIKA CROP FOTO UTAMA ⭐
    // =======================================================

    function openCropModal(file) {
        if (!file || !cropModal || !imageToCrop) return;

        originalFile = file;

        // Buat URL sementara
        const fileURL = URL.createObjectURL(file);
        imageToCrop.src = fileURL;

        cropModal.classList.add('active');
        document.body.style.overflow = 'hidden'; 

        // Hancurkan instance Cropper lama jika ada
        if (cropper) {
            cropper.destroy();
        }

        // ⭐ PERBAIKAN: Panggil Cropper melalui window.Cropper ⭐
        setTimeout(() => {
            if (window.Cropper) {
                cropper = new window.Cropper(imageToCrop, {
                    aspectRatio: 16 / 9, 
                    viewMode: 1, 
                    responsive: true,
                    movable: true,
                    zoomable: true,
                    rotatable: true,
                    scalable: true,
                    autoCropArea: 0.9 
                });
            } else {
                console.error("Cropper.js tidak ditemukan. Pastikan CDN dimuat dengan benar.");
                cropCancelBtn.click(); // Tutup modal jika gagal
            }
        }, 300);
    }

    // --- Logika Tombol Toolbar ---
    function attachCropperListeners() {
        if (cropperToolbar) {
            cropperToolbar.addEventListener('click', (e) => {
                const button = e.target.closest('.tool-btn');
                if (!button || button.classList.contains('disabled')) return;
                
                const method = button.getAttribute('data-method');
                const option = button.getAttribute('data-option');
                let value;

                if (!cropper) return;
                
                switch (method) {
                    case 'rotate':
                        value = parseFloat(option);
                        cropper.rotate(value);
                        break;
                    case 'scaleX':
                        // Flip Horizontal
                        value = parseFloat(button.getAttribute('data-value')) || 1;
                        value = value === -1 ? 1 : -1;
                        cropper.scaleX(value);
                        button.setAttribute('data-value', value);
                        break;
                    case 'scaleY':
                        // Flip Vertikal
                        value = parseFloat(button.getAttribute('data-value')) || 1;
                        value = value === -1 ? 1 : -1;
                        cropper.scaleY(value);
                        button.setAttribute('data-value', value);
                        break;
                    case 'reset':
                        cropper.reset();
                        document.querySelectorAll('.tool-btn[data-method^="scale"]').forEach(btn => btn.setAttribute('data-value', '1'));
                        break;
                    case 'clear':
                        cropper.clear();
                        break;
                }
            });
        }
    }

    // --- Konfirmasi Crop ---
    if (cropConfirmBtn) {
        cropConfirmBtn.addEventListener('click', () => {
            if (!cropper || !originalFile) return;
            
            // Dapatkan gambar yang sudah di-crop sebagai Blob
            cropper.getCroppedCanvas().toBlob((blob) => {
                if (!blob) {
                    alert('Gagal membuat gambar yang di-crop.');
                    return;
                }
                
                // Buat objek File baru
                const croppedFile = new File([blob], originalFile.name, { type: blob.type, lastModified: Date.now() });
                croppedFileBlob = croppedFile; // Simpan file untuk di-submit

                // Perbarui pratinjau dengan gambar yang sudah di-crop
                renderPreview(croppedFile);

                // Tutup & Bersihkan
                cropper.destroy();
                cropper = null;
                cropModal.classList.remove('active');
                document.body.style.overflow = '';
                URL.revokeObjectURL(imageToCrop.src); 
                
            }, originalFile.type, 0.9); 
        });
    }

    // --- Pembatalan Crop/Upload ---
    if (cropCancelBtn) {
        cropCancelBtn.addEventListener('click', () => {
            // Tutup & Bersihkan
            if(cropper) cropper.destroy();
            cropper = null;
            cropModal.classList.remove('active');
            document.body.style.overflow = '';
            URL.revokeObjectURL(imageToCrop.src);

            // Bersihkan variabel file dan UI
            imageInput.value = ''; 
            originalFile = null;
            croppedFileBlob = null;
            
            imagePreviewContainer.innerHTML = '';
            document.getElementById('image-status').textContent = "Belum Ada Foto";
            document.getElementById('image-status').style.color = 'var(--text-light)';
        });
    }

    // ========================================================
    // 5. LOGIKA FORMULIR DINAMIS & VALIDASI UKURAN FILE
    // ========================================================
    
    // KONTANSTA BATAS UKURAN FILE: 400 KB (102400 Bytes)
    const MAX_FILE_SIZE_BYTES = 400 * 1024; // 100 KB

    // Fungsi helper untuk render preview
    function renderPreview(file) {
        if (!file || !file.type.startsWith('image/')) {
            return false;
        }

        // >>> LOGIKA PEMBATASAN UKURAN FILE (100 KB) <<<
        if (file.size > MAX_FILE_SIZE_BYTES) {
            const uploadedSizeKB = file.size / 1024;
            
            // PANGGIL MODAL KUSTOM (Akan berfungsi karena modal sudah diinisialisasi)
            showAlertModal(uploadedSizeKB); 

            // Reset Input File (Penting agar file yang salah tidak terkirim)
            imageInput.value = '';
            
            // Reset Preview
            const statusEl = document.getElementById('image-status');
            if(previewHero) {
                previewHero.innerHTML = '<i class="fas fa-camera fa-3x"></i><p>Pilih atau tarik foto resep</p>';
            }
            if(statusEl) {
                statusEl.textContent = "Foto Belum Terpilih";
                statusEl.style.color = "var(--danger-color)";
            }
            return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Update di Hero Section
            previewHero.innerHTML = `
                <img src="${e.target.result}" alt="Pratinjau Resep" 
                style="width:100%; height:100%; object-fit:cover; border-radius:15px;">
            `;
            // Update status di Meta Bar
            const statusEl = document.getElementById('image-status');
            if(statusEl) {
                statusEl.textContent = "Foto Terpilih";
                statusEl.style.color = "var(--primary-color)";
            }
        };
        reader.readAsDataURL(file);
        return true; // Berhasil preview
    }

    // 1. Trigger dari tombol "Pilih Foto"
    if(btnUpload) {
        btnUpload.addEventListener('click', () => imageInput.click());
    }

    // --- Ganti Event Listener Input File ---
    if(imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                if (!file.type.startsWith('image/')) {
                    alert('Hanya file gambar (JPEG/PNG) yang didukung.');
                    imageInput.value = ''; // Reset input file
                } else if (file.size > MAX_FILE_SIZE_BYTES) {
                    // ⭐ LOGIKA CEK UKURAN FILE DIKEMBALIKAN ⭐
                    const uploadedSizeKB = file.size / 1024;
                    showAlertModal(uploadedSizeKB);
                    imageInput.value = ''; // Reset input file
                    // ⭐ END LOGIKA CEK UKURAN FILE ⭐
                } else {
                    openCropModal(file); 
                }
            }
        });
    }

    // 3. Drag & Drop Logic
    if (dropZone) {
        // Efek visual saat drag
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--primary-color)';
                dropZone.style.backgroundColor = 'rgba(46, 204, 113, 0.1)';
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '';
                dropZone.style.backgroundColor = '';
            });
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length) {
                const file = e.dataTransfer.files[0];
                if (!file.type.startsWith('image/')) {
                    alert('Hanya file gambar yang didukung.');
                    return;
                } 
                if (file.size > MAX_FILE_SIZE_BYTES) {
                    const uploadedSizeKB = file.size / 1024;
                    showAlertModal(uploadedSizeKB);
                    return;
                }
                
                imageInput.files = e.dataTransfer.files; 
                openCropModal(file); 
            }
        });
        
        // Klik pada dropzone juga membuka file explorer
        dropZone.addEventListener('click', () => imageInput.click());
    }


    // --- B. Porsi (Serving Size Spinner) - Tidak Berubah ---
    const servingInput = document.getElementById('serving_size');
    const btnServingDown = document.getElementById('serving-down');
    const btnServingUp = document.getElementById('serving-up');

    if(servingInput && btnServingDown && btnServingUp) {
        btnServingDown.addEventListener('click', () => {
            let val = parseInt(servingInput.value) || 1;
            if(val > 1) servingInput.value = val - 1;
        });
        btnServingUp.addEventListener('click', () => {
            let val = parseInt(servingInput.value) || 1;
            if(val < 50) servingInput.value = val + 1;
        });
    }


    // --- C. Bahan-bahan Dinamis (Ingredients) - Tidak Berubah ---
    const ingredientsContainer = document.getElementById('ingredients-container');
    const addIngredientBtn = document.getElementById('add-ingredient-btn');

    function addIngredientRow(isInitial = false) {
        const div = document.createElement('div');
        div.className = 'ingredient-input-group fade-in visible';
        
        div.innerHTML = `
            <input type="text" name="ingredient_qty" placeholder="Jumlah:" required style="flex: 0.5;">
            <input type="text" name="ingredient_unit" placeholder="Unit:" required style="flex: 0.5;">
            <input type="text" name="ingredient_name" placeholder="Nama Bahan:" required style="flex: 2;">
            <button type="button" class="remove-btn" title="Hapus"><i class="fas fa-times"></i></button>
        `;

        const removeBtn = div.querySelector('.remove-btn');
        if (isInitial) {
            removeBtn.style.display = 'none';
        } else {
            removeBtn.addEventListener('click', () => div.remove());
        }

        ingredientsContainer.appendChild(div);
    }

    if(addIngredientBtn) {
        addIngredientBtn.addEventListener('click', () => addIngredientRow());
        addIngredientRow(true);
    }

    // --- E. Alat-alat Dinamis (Tools) ---
    const toolsContainer = document.getElementById('tools-container');
    const addToolBtn = document.getElementById('add-tool-btn');

    function addToolRow(isInitial = false) {
        const div = document.createElement('div');
        div.className = 'tool-input-group fade-in visible';
        
        div.innerHTML = `
            <input type="text" name="tool_name" placeholder="Nama Alat:" required style="flex: 3;">
            <button type="button" class="remove-btn" title="Hapus"><i class="fas fa-times"></i></button>
        `;

        const removeBtn = div.querySelector('.remove-btn');
        if (isInitial) {
            removeBtn.style.display = 'none';
        } else {
            removeBtn.addEventListener('click', () => div.remove());
        }

        toolsContainer.appendChild(div);
    }

    if(addToolBtn) {
        addToolBtn.addEventListener('click', () => addToolRow());
        addToolRow(true); // Tambahkan satu baris alat di awal
    }


    // --- D. Langkah-langkah Dinamis (Steps) - Tidak Berubah ---
    const stepsContainer = document.getElementById('steps-container');
    const addStepBtn = document.getElementById('add-step-btn');

    function updateStepNumbers() {
        const steps = stepsContainer.querySelectorAll('.step-input-group');
        steps.forEach((step, index) => {
            const numberBadge = step.querySelector('.step-number-display');
            if(numberBadge) numberBadge.textContent = index + 1;
        });
    }

    function addStepRow(isInitial = false) {
        const div = document.createElement('div');
        div.className = 'step-input-group fade-in visible';
        
        div.innerHTML = `
            <div class="step-number-display">0</div>
            <input type="text" name="step_description" placeholder="Deskripsi Langkah:" required style="flex: 3;">
            <button type="button" class="remove-btn" title="Hapus"><i class="fas fa-times"></i></button>
        `;

        const removeBtn = div.querySelector('.remove-btn');
        if (isInitial) {
            removeBtn.style.display = 'none';
        } else {
            removeBtn.addEventListener('click', () => {
                div.remove();
                updateStepNumbers();
            });
        }

        stepsContainer.appendChild(div);
        updateStepNumbers();
    }

    if(addStepBtn) {
        addStepBtn.addEventListener('click', () => addStepRow());
        addStepRow(true);
    }


    // --- PERBARUI LOGIC SUBMIT FORM (PENTING!) ---
    // Gunakan 'croppedFileBlob' yang sudah diisi saat konfirmasi crop
    const recipeForm = document.getElementById('recipe-form'); // Asumsi form memiliki ID 'recipe-form'
    if (recipeForm) {
        recipeForm.addEventListener('submit', initSubmitHandler);
    }


    // ========================================================
    // 6. SUBMIT FORMULIR KE API (FINAL VALIDATION)
    // ========================================================
    // ========================================================
    // 6. SUBMIT FORMULIR KE API (VERSI AMAN)
    // ========================================================
    
    async function initSubmitHandler() {
        if(submitBtn) {
            // sebelum mulai proses upload (letakkan di paling atas handler submit)
            const token = localStorage.getItem('authToken');
            if (!token || isTokenExpired(token)) {
                forceLogoutAndRedirect('Token Anda sudah kedaluwarsa. Silakan login ulang untuk mengunggah resep.');
                return;
            }
            
            submitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                // Cek file gambar yang sudah di-crop
                if (!croppedFileBlob) {
                    alert('Harap unggah dan konfirmasi crop foto resep Anda.');
                    return;
                }
                // Cek Token lagi saat klik
                const currentToken = localStorage.getItem('authToken');
                if (!currentToken || isTokenExpired(currentToken)) {
                    alert('Sesi berakhir. Silakan login ulang.');
                    window.location.href = 'daftar_atau_login.html';
                    return;
                }
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengunggah...';
                submitBtn.disabled = true;
                
                try {
                    // Buat FormData baru
                    const formData = new FormData(recipeForm);
                    // Hapus file lama dari FormData jika ada
                    formData.delete('image');
                    
                    // --- 1. Kumpulkan Data dan Validasi Field Sederhana WAJIB ---
                    const title = document.getElementById('title').value.trim();
                    const description = document.getElementById('description').value.trim();
                    const category = document.getElementById('category').value;
                    const servingSizeElement = document.getElementById('serving_size');
                    const cookTimeElement = document.getElementById('cook-time');
                    const prepTimeElement = document.getElementById('prep-time');
                    
                    // 💡 Perubahan: Lakukan pemeriksaan null dan berikan nilai default jika elemen tidak ditemukan
                    const servingSize = servingSizeElement ? servingSizeElement.value.trim() : '4'; 
                    const cookTime = cookTimeElement ? cookTimeElement.value.trim() : '30';
                    const prepTime = prepTimeElement ? prepTimeElement.value.trim() : '15';

                    if (!title || !description || !category || !servingSize || !cookTime || !prepTime) {
                        throw new Error("Harap isi SEMUA informasi dasar resep (judul, deskripsi, kategori, porsi, waktu masak & persiapan).");
                    }
                    
                    // Append Simple Fields
                    formData.set('title', title);
                    formData.set('description', description);
                    formData.set('category', category); // <--- INI PERBAIKAN UTAMANYA
                    formData.set('servingSize', servingSize);
                    formData.set('cookTime', cookTime);
                    formData.set('prepTime', prepTime);

                    
                    // --- 2. Validasi & Kumpulkan Gambar WAJIB ---
                    const imageInput = document.getElementById('image');
                    const uploadedFile = imageInput.files[0];
                    
                    if(!uploadedFile) {
                        throw new Error("Wajib menyertakan foto resep!");
                    }
                    
                    // Batas ukuran file 100 KB (102400 bytes)
                    const MAX_FILE_SIZE_BYTES = 102400; 
                    if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
                        // Cukup dilempar karena showCustomAlert sudah dipanggil saat pemilihan file
                        throw new Error(`Foto melebihi batas 100 KB. Mohon pilih ulang foto.`);
                    }

                    // ⭐ APPEND FILE YANG SUDAH DI-CROP ⭐
                    formData.append('image', croppedFileBlob, croppedFileBlob.name);
                    // ⭐ END PERUBAHAN SUBMIT ⭐
                    
                    // --- 3. Validasi & Kumpulkan Konten Array (Bahan, Alat, Langkah) WAJIB ---
                    
                    // Bahan-bahan (Ingredients)
                    const ingredientElements = document.querySelectorAll('.ingredient-input-group');
                    const ingredients = [];
                    ingredientElements.forEach(group => {
                        const qty = group.querySelector('[name="ingredient_qty"]').value.trim();
                        const unit = group.querySelector('[name="ingredient_unit"]').value.trim();
                        const name = group.querySelector('[name="ingredient_name"]').value.trim();
                        // Hanya tambahkan jika NAMA dan JUMLAH terisi.
                        if (name && qty) { 
                            ingredients.push({ quantity: qty, unit: unit, name: name });
                        }
                    });

                    if (ingredients.length === 0) {
                        throw new Error("Resep harus memiliki minimal satu Bahan yang lengkap (Jumlah dan Nama Bahan).");
                    }
                    formData.append('ingredients', JSON.stringify(ingredients));

                    
                    // Alat-alat (Tools)
                    const toolElements = document.querySelectorAll('.tool-input-group');
                    const tools = [];
                    toolElements.forEach(group => {
                        const name = group.querySelector('[name="tool_name"]').value.trim();
                        if (name) {
                            tools.push(name);
                        }
                    });

                    if (tools.length === 0) {
                        throw new Error("Resep harus memiliki minimal satu Alat yang digunakan.");
                    }
                    formData.append('tools', JSON.stringify(tools));

                    
                    // Langkah-langkah (Steps)
                    const stepElements = document.querySelectorAll('[name="step_description"]');
                    const steps = Array.from(stepElements).map(el => el.value.trim()).filter(s => s !== "");

                    if (steps.length === 0) {
                        throw new Error("Resep harus memiliki minimal satu Langkah (Deskripsi Langkah).");
                    }
                    formData.append('steps', JSON.stringify(steps));
                    
                    // --- 2. FETCH KE API DINAMIS ---
                    const API_RECIPES_URL = `${API_BASE_URL}/recipes`;
                    const response = await fetch(API_RECIPES_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${currentToken}` 
                        },
                        body: formData,
                        credentials: 'include'
                    });

                    // Gunakan Helper Aman
                    const result = await handleApiResponseSecure(response);

                    if (result.ok) {
                        alert("Resep berhasil diunggah! Mengalihkan...");
                        window.location.href = `resep_detail.html?id=${result.data.id || result.data.recipe?._id}`;
                    } else {
                        throw new Error(result.data.msg || "Gagal mengunggah resep.");
                    }

                    // Jika server mengembalikan 401 (Unauthorized) => token kemungkinan kedaluwarsa / invalid
                    if (response.status === 401) {
                        const serverMsg = result && (result.msg || result.message) ? (result.msg || result.message) : 'Sesi tidak valid.';
                        if (/kedaluwarsa|expired|token/i.test(serverMsg)) {
                            // Token expired
                            forceLogoutAndRedirect('Token kedaluwarsa. Silakan login ulang.');
                            return;
                        } else {
                            // Token invalid (signature mismatch etc.) — juga logout untuk keamanan
                            forceLogoutAndRedirect('Token tidak valid. Silakan login ulang.');
                            return;
                        }
                    }

                    // untuk error lain, munculkan pesan dari server bila ada
                    throw new Error((result && (result.msg || result.message)) || 'Gagal mengunggah resep.');

                } catch (error) {
                    console.error(error);
                    alert("Terjadi kesalahan: " + error.message);
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    }

    // --- STARTUP LOGIC ---
    // Kita perlu menunggu API_BASE_URL sebelum mengizinkan submit (meskipun form bisa diisi dulu)
    if (API_BASE_URL) {
        initSubmitHandler();
    } else {
        window.addEventListener('backend-url-changed', initSubmitHandler);
    }

    // --- Navbar & Dark Mode (Standar) ---
    // (Tempel logika Navbar & Dark Mode standar di sini)
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => { hamburgerBtn.classList.toggle('active'); navMenu.classList.toggle('active'); });
    }
    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('active'); });
        document.addEventListener('click', (e) => { if (!profileDropdown.contains(e.target) && !profilePicBtn.contains(e.target)) profileDropdown.classList.remove('active'); });
    }
    if (themeToggle) {
        const savedTheme = localStorage.getItem('sajile_theme') || 'light';
        document.body.dataset.theme = savedTheme;
        const icon = themeToggle.querySelector('i');
        if(icon) { icon.classList.toggle('fa-sun', savedTheme === 'dark'); icon.classList.toggle('fa-moon', savedTheme === 'light'); }
        themeToggle.addEventListener('click', () => {
            const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
            document.body.dataset.theme = newTheme;
            localStorage.setItem('sajile_theme', newTheme);
            if(icon) { icon.classList.toggle('fa-moon'); icon.classList.toggle('fa-sun'); }
        });
    }

    // Panggil event listener Cropper saat DOM dimuat
    attachCropperListeners();
});