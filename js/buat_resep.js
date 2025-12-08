// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

document.addEventListener('DOMContentLoaded', async () => {
    // Deklarasi Fungsi dan Variabel
    const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
    const logoutBtn = document.getElementById('logout-btn');


    // =======================================================
    // 1. LOGIKA CEK LOGIN
    // =======================================================
    // Ambil URL backend dari /backend_url.json (fallback ke localhost)
    async function loadBackendBaseUrl() {
        const DEFAULT = 'http://localhost:5000'; // fallback lokal
        try {
            const res = await fetch('/backend_url.json', { cache: 'no-cache' });
            if (!res.ok) return DEFAULT;
            const data = await res.json();
            if (!data || !data.url) return DEFAULT;
            // pastikan tidak ada trailing slash
            return data.url.replace(/\/$/, '');
        } catch (err) {
            console.warn('Gagal memuat backend_url.json, gunakan fallback:', err);
            return DEFAULT;
        }
    }

    const BACKEND_BASE_URL = await loadBackendBaseUrl();
    console.log('Menggunakan backend base URL:', BACKEND_BASE_URL);
    const API_RECIPES_URL = `${BACKEND_BASE_URL}/api/recipes`;
    
    const token = localStorage.getItem('authToken'); // Kunci yang dikonfirmasi benar
    
    if (!token) {
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

    function checkLoginState() {
        const token = localStorage.getItem('authToken'); // Gunakan 'authToken'

        if (token) {
            // User Login: Sembunyikan tombol masuk, Tampilkan profil
            if (navAuthLinks) navAuthLinks.style.display = 'none';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'block';
        } else {
            // User Belum Login: Tampilkan tombol masuk, Sembunyikan profil
            if (navAuthLinks) navAuthLinks.style.display = 'block';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        }
    }

    // Panggil saat halaman dimuat
    checkLoginState();
    isTokenExpired(token); // Cek apakah token sudah expired

    // Logika Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken');
                window.location.reload(); // Refresh untuk update UI
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
    // 2. LOGIKA MODAL PERINGATAN KUSTOM (DIPINDAHKAN KE ATAS)
    // ========================================================
    const modal = document.getElementById('custom-alert-modal');
    const modalOkBtn = document.getElementById('modal-ok-btn');
    const uploadedFileSizeElement = document.getElementById('uploaded-file-size');

    // Menampilkan Modal Kustom
    function showCustomAlert(uploadedSizeKB) {
        uploadedFileSizeElement.textContent = uploadedSizeKB.toFixed(2) + " KB";
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Nonaktifkan scrolling
    }

    // Event Listener untuk tombol "Oke" pada modal
    if(modalOkBtn) {
        modalOkBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto'; // Aktifkan kembali scrolling
        });
    }

    // =======================================================
    // 3. STANDAR WAJIB: NAVBAR, HAMBURGER & DARK MODE
    // (Tidak ada perubahan di bagian ini)
    // =======================================================
    const body = document.body;
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


    // ========================================================
    // 5. LOGIKA FORMULIR DINAMIS & VALIDASI UKURAN FILE
    // ========================================================
    
    // KONTANSTA BATAS UKURAN FILE: 100 KB (102400 Bytes)
    const MAX_FILE_SIZE_BYTES = 102400; 

    // --- A. Pratinjau Gambar (Hero & Form) ---
    const imageInput = document.getElementById('image');
    const btnUpload = document.getElementById('btn-upload-image');
    const previewHero = document.getElementById('image-preview-hero');
    const dropZone = document.getElementById('image-upload-zone');

    // Fungsi helper untuk render preview
    function renderPreview(file) {
        if (!file || !file.type.startsWith('image/')) {
            return false;
        }

        // >>> LOGIKA PEMBATASAN UKURAN FILE (100 KB) <<<
        if (file.size > MAX_FILE_SIZE_BYTES) {
            const uploadedSizeKB = file.size / 1024;
            
            // PANGGIL MODAL KUSTOM (Akan berfungsi karena modal sudah diinisialisasi)
            showCustomAlert(uploadedSizeKB); 

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

    // 2. Event saat file dipilih via Input
    if(imageInput) {
        imageInput.addEventListener('change', (e) => {
            if(e.target.files[0]) renderPreview(e.target.files[0]);
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

        // Handle drop file
        dropZone.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) {
                // HANYA assign file jika validasi berhasil
                if(renderPreview(file)) {
                    imageInput.files = e.dataTransfer.files; 
                }
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


    // --- E. Update Field Count (Meta Bar) - Tidak Berubah ---
    const form = document.getElementById('recipe-form');
    if(form) {
        form.addEventListener('input', () => {
            const filled = form.querySelectorAll('input:valid, textarea:valid, select:valid').length;
            const counter = document.getElementById('field-count');
            if(counter) counter.textContent = filled;
        });
    }


    // ========================================================
    // 6. SUBMIT FORMULIR KE API (FINAL VALIDATION)
    // ========================================================
    const submitBtn = document.getElementById('submit-recipe-btn');

    if(submitBtn) {
        // sebelum mulai proses upload (letakkan di paling atas handler submit)
        const token = localStorage.getItem('authToken');
        if (!token || isTokenExpired(token)) {
            forceLogoutAndRedirect('Token Anda sudah kedaluwarsa. Silakan login ulang untuk mengunggah resep.');
            return;
        }
        
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengunggah...';
            submitBtn.disabled = true;
            
            try {
                const formData = new FormData();
                
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
                formData.append('title', title);
                formData.append('description', description);
                formData.append('category', category);
                formData.append('servingSize', servingSize);
                formData.append('cookTime', cookTime);
                formData.append('prepTime', prepTime);

                
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

                formData.append('image', uploadedFile);

                
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
                

                // --- 4. Kirim ke API ---
                const response = await fetch(API_RECIPES_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}` 
                    },
                    body: formData
                });

                // Coba parse JSON, tapi aman jika response kosong/invalid
                let result = null;
                try {
                    result = await response.json();
                } catch (e) {
                    // ignore JSON parse error
                }

                if (response.ok) {
                    alert("Resep berhasil diunggah! Mengalihkan...");
                    window.location.href = `resep_detail.html?id=${result && (result.id || result.recipe?._id) || ''}`;
                    return;
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

});