document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Dark Mode Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggle.querySelector('i');

    if(localStorage.getItem('theme') === 'dark') {
        body.setAttribute('data-theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    themeToggle.addEventListener('click', () => {
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    });
    
    // --- 2. Hamburger Menu & Vertical Dropdown Logic (Wajib Sesuai Standar) ---
    // Menggunakan standar wajib yang Anda simpan: [2025-11-27]
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const verticalDropdown = document.getElementById('vertical-dropdown');
    
    hamburgerMenu.addEventListener('click', () => {
        verticalDropdown.classList.toggle('active');
        const isExpanded = verticalDropdown.classList.contains('active');
        const iconElement = hamburgerMenu.querySelector('i');

        if (isExpanded) {
            iconElement.classList.remove('fa-bars');
            iconElement.classList.add('fa-times');
        } else {
            iconElement.classList.remove('fa-times');
            iconElement.classList.add('fa-bars');
        }
    });


    // --- 3. Scroll Animation (Fade In) ---
    const observerOptions = {
        threshold: 0.15 
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(el => observer.observe(el));
    
    // --- 4. Tombol Save/Favorite Logic ---
    const btnSave = document.getElementById('btn-save');
    
    // Cek status di localStorage saat memuat (simulasi)
    let isSaved = localStorage.getItem('rendang_favorite') === 'true';
    updateSaveButton();

    btnSave.addEventListener('click', () => {
        isSaved = !isSaved; // Toggle status
        localStorage.setItem('rendang_favorite', isSaved);
        updateSaveButton();
        
        if (isSaved) {
            console.log("Resep disimpan ke Favorit!");
        } else {
            console.log("Resep dihapus dari Favorit!");
        }
    });

    function updateSaveButton() {
        const heartIcon = btnSave.querySelector('i');
        if (isSaved) {
            btnSave.classList.add('active');
            heartIcon.classList.remove('far'); // Hati kosong
            heartIcon.classList.add('fas'); // Hati penuh
            btnSave.innerHTML = `<i class="fas fa-heart"></i> Tersimpan`;
        } else {
            btnSave.classList.remove('active');
            heartIcon.classList.remove('fas'); // Hati penuh
            heartIcon.classList.add('far'); // Hati kosong
            btnSave.innerHTML = `<i class="far fa-heart"></i> Simpan ke Favorit`;
        }
    }
    
    // --- 5. Kalkulator Porsi (Serving Calculator) Logic ---
    const btnIncrease = document.getElementById('increase-serving');
    const btnDecrease = document.getElementById('decrease-serving');
    const multiplierDisplay = document.getElementById('serving-multiplier');
    const ingredientsList = document.getElementById('ingredients-list');
    const servingSize = document.getElementById('serving-size');

    let multiplier = 1;
    const baseServing = 6; // Porsi awal resep

    // Fungsi untuk mengupdate kuantitas bahan
    function updateIngredients() {
        const listItems = ingredientsList.querySelectorAll('li');
        listItems.forEach(item => {
            const originalQty = parseFloat(item.getAttribute('data-original-qty'));
            const qtyElement = item.querySelector('.qty');
            
            // Mengekstrak unit dari teks (misal: "1000 gr" -> " gr")
            const textContent = qtyElement.textContent;
            const unitMatch = textContent.match(/[a-zA-Z\s]+$/); // Cari unit di akhir string
            const unit = unitMatch ? unitMatch[0].trim() : '';

            // Hitung kuantitas baru
            const newQty = (originalQty * multiplier);

            // Tampilkan kuantitas baru dan update porsi di metadata
            qtyElement.textContent = `${newQty} ${unit}`;
        });
        
        multiplierDisplay.textContent = `${multiplier}x`;
        servingSize.textContent = `${baseServing * multiplier}`;
    }

    btnIncrease.addEventListener('click', () => {
        if (multiplier < 4) { // Batasi maksimal 4x
            multiplier++;
            updateIngredients();
        }
    });

    btnDecrease.addEventListener('click', () => {
        if (multiplier > 1) { // Batasi minimal 1x
            multiplier--;
            updateIngredients();
        }
    });
    
    // --- 6. Print Recipe Logic ---
    const btnPrint = document.getElementById('btn-print');
    btnPrint.addEventListener('click', () => {
        window.print(); 
        console.log("Mencetak resep...");
    });


    // --- 7. Logika Komentar Dinamis & Rating Bintang (Dengan Desimal) ---
    const commentList = document.getElementById('comment-list');
    const commentTextarea = document.getElementById('comment-textarea');
    const submitCommentBtn = document.getElementById('submit-comment');
    const ratingInputContainer = document.getElementById('rating-input');
    const ratingStars = document.querySelectorAll('.rating-input .star');
    const ratingText = document.getElementById('rating-text');
    const commentCountDisplay = document.getElementById('comment-count');
    
    let currentRating = 0.0;
    // Ambil jumlah komentar awal yang ada di HTML (3 komentar simulasi)
    let currentCommentCount = commentList.querySelectorAll('.comment-item').length; 
    
    // Fungsi utilitas untuk warna avatar acak
    function getRandomColor() {
        const colors = ['ffb3ba', 'b3d4ff', 'c2ffb3', 'fffeb3', 'e6b3ff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // ** a. Logika Input Rating Bintang (Hover & Klik Desimal)**
    
    ratingInputContainer.addEventListener('mousemove', (e) => {
        const numStars = ratingStars.length;
        let hoverRating = 0.0;
        
        for(let i = 0; i < numStars; i++) {
            const starRect = ratingStars[i].getBoundingClientRect();
            if (e.clientX >= starRect.left && e.clientX <= starRect.right) {
                const starWidth = ratingStars[i].offsetWidth;
                const starX = e.clientX - starRect.left;
                
                if (starX < starWidth / 2) {
                    hoverRating = i + 0.5; // Setengah kiri (x.5)
                } else {
                    hoverRating = i + 1.0; // Penuh (x.0)
                }
                break; 
            } else if (e.clientX > starRect.right) {
                hoverRating = i + 1.0;
            }
        }
        
        hoverRating = Math.min(5.0, hoverRating);
        updateStarDisplay(hoverRating, true);
    });

    ratingInputContainer.addEventListener('mouseleave', () => {
        updateStarDisplay(currentRating); // Kembali ke rating yang sudah dipilih
    });

    ratingInputContainer.addEventListener('click', (e) => {
        const numStars = ratingStars.length;
        let newRating = 0.0;
        
        for(let i = 0; i < numStars; i++) {
            const starRect = ratingStars[i].getBoundingClientRect();
            if (e.clientX >= starRect.left && e.clientX <= starRect.right) {
                const starWidth = ratingStars[i].offsetWidth;
                const starX = e.clientX - starRect.left;
                
                if (starX < starWidth / 2) {
                    newRating = i + 0.5;
                } else {
                    newRating = i + 1.0;
                }
                break;
            } else if (e.clientX > starRect.right) {
                newRating = i + 1.0;
            }
        }
        
        currentRating = Math.min(5.0, newRating); // Simpan rating desimal yang dipilih
        updateStarDisplay(currentRating);
    });

    // ** b. Fungsi updateStarDisplay yang diperbaiki **
    function updateStarDisplay(ratingValue, isHover = false) { 
        ratingStars.forEach(star => {
            const starValue = parseFloat(star.getAttribute('data-rating'));
            const iconElement = star.querySelector('i');
            
            // 1. Atur Bintang Penuh (FAS)
            if (starValue <= Math.floor(ratingValue)) {
                iconElement.className = 'fas fa-star';
                star.classList.add('filled');
            } 
            // 2. Atur Bintang Setengah (FAS-HALF-ALT)
            else if (starValue === Math.ceil(ratingValue) && (ratingValue * 10) % 10 === 5) {
                iconElement.className = 'fas fa-star-half-alt';
                star.classList.add('filled');
            }
            // 3. Atur Bintang Kosong (FAR)
            else {
                iconElement.className = 'far fa-star';
                star.classList.remove('filled');
            }
        });
        
        ratingText.textContent = ` (${ratingValue.toFixed(1)}/5)`; 
    }

    // c. Fungsi untuk membuat elemen bintang rating (Sudah benar dan mendukung desimal)
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


    // d. Logika Kirim Ulasan (Disederhanakan karena fokus ke Edit/Hapus)
    submitCommentBtn.addEventListener('click', () => {
        const commentText = commentTextarea.value.trim();
        
        if (commentText === "") {
            alert("Ulasan tidak boleh kosong!");
            return;
        }

        if (currentRating === 0.0) { 
            alert("Harap berikan rating bintang!");
            return;
        }

        // --- Simulasi Komentar Baru sebagai Milik Pengguna ---
        currentCommentCount++;
        const newCommentId = currentCommentCount; // Gunakan counter sebagai ID unik sementara
        const userName = "Pengguna Baru"; 
        const userAvatarText = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(); 
        const avatarColor = getRandomColor(); 
        
        const newCommentHTML = `
            <div class="comment-item user-comment" data-comment-id="${newCommentId}">
                <div class="comment-avatar">
                    <img src="https://placehold.co/50x50/ffc107/000?text=${userAvatarText}" alt="Avatar ${userName}">
                </div>
                <div class="comment-body">
                    <h4>${userName} <span style="color: #2ecc71; font-size: 0.8em;">(Anda)</span></h4>
                    <div class="rating" data-stars="${currentRating.toFixed(1)}">
                        ${createRatingStarsHTML(currentRating)} (${currentRating.toFixed(1)}/5)
                    </div>
                    <p class="comment-text-content">${commentText}</p>
                    <div class="comment-actions">
                        <button class="edit-comment-btn" data-edit-count="0" data-comment-id="${newCommentId}">Edit (1x)</button>
                        <button class="delete-comment-btn" data-comment-id="${newCommentId}">Hapus</button>
                    </div>
                </div>
            </div>
        `;

        // Tambahkan ke DOM (Paling atas)
        commentList.insertAdjacentHTML('afterbegin', newCommentHTML);
        commentCountDisplay.textContent = commentList.querySelectorAll('.comment-item').length; // Hitung ulang

        // Reset form
        commentTextarea.value = '';
        currentRating = 0.0;
        updateStarDisplay(0.0);
    });
    
    // Init: Update tampilan rating untuk komentar yang sudah ada
    const existingRatings = commentList.querySelectorAll('.rating');
    existingRatings.forEach(ratingEl => {
        const ratingValue = parseFloat(ratingEl.getAttribute('data-stars'));
        // Pastikan HTML bintang terupdate saat DOM dimuat
        ratingEl.innerHTML = createRatingStarsHTML(ratingValue) + ` (${ratingValue.toFixed(1)}/5)`; 
    });

    // Pastikan rating awal (0.0/5) ditampilkan saat dimuat
    updateStarDisplay(0.0);

    // ========================================================
    // --- 8. LOGIKA EDIT SATU KALI & HAPUS KOMENTAR SENDIRI ---
    // ========================================================
    
    const editModal = document.getElementById('editCommentModal');
    const editCommentTextarea = document.getElementById('edit-comment-textarea');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const closeBtn = document.querySelector('.close-btn');
    let currentEditCommentId = null; 

    // ** a. Event Listener untuk Tombol Edit & Hapus (Menggunakan delegation) **
    commentList.addEventListener('click', (e) => {
        // Logika Hapus Komentar
        if (e.target.classList.contains('delete-comment-btn')) {
            const commentId = e.target.getAttribute('data-comment-id');
            deleteComment(commentId);
            return;
        }

        // Logika Edit Komentar
        if (e.target.classList.contains('edit-comment-btn')) {
            const editButton = e.target;
            const commentId = editButton.getAttribute('data-comment-id');
            const editCount = parseInt(editButton.getAttribute('data-edit-count'));

            if (editCount >= 1) {
                alert("Anda hanya diizinkan mengedit komentar ini satu kali.");
                return;
            }

            openEditModal(commentId);
        }
    });

    // ** b. Fungsi Hapus Komentar **
    function deleteComment(commentId) {
        if (confirm("Apakah Anda yakin ingin menghapus ulasan ini? Aksi ini tidak dapat dibatalkan.")) {
            const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
            if (commentItem) {
                commentItem.remove();
                
                // Update jumlah komentar
                currentCommentCount = commentList.querySelectorAll('.comment-item').length;
                commentCountDisplay.textContent = currentCommentCount;
                console.log(`Komentar ID ${commentId} telah dihapus.`);
            }
        }
    }
    
    // ** c. Logika Modal Edit **
    function openEditModal(commentId) {
        const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
        const commentTextElement = commentItem.querySelector('.comment-text-content');

        if (!commentItem || !commentTextElement) {
            alert("Komentar tidak ditemukan.");
            return;
        }
        
        currentEditCommentId = commentId;
        editCommentTextarea.value = commentTextElement.textContent.trim();
        editModal.style.display = 'block';
    }

    // Tutup modal ketika tombol 'x' diklik
    closeBtn.onclick = function() {
        editModal.style.display = 'none';
        currentEditCommentId = null;
    }

    // Tutup modal ketika klik di luar modal
    window.onclick = function(event) {
        if (event.target == editModal) {
            editModal.style.display = 'none';
            currentEditCommentId = null;
        }
    }
    
    // ** d. Logika Simpan Hasil Edit **
    saveEditBtn.addEventListener('click', () => {
        const newText = editCommentTextarea.value.trim();
        if (newText.length < 5) {
            alert("Ulasan terlalu pendek!");
            return;
        }

        if (!currentEditCommentId) return;

        const commentItem = document.querySelector(`.comment-item[data-comment-id="${currentEditCommentId}"]`);
        const commentTextElement = commentItem.querySelector('.comment-text-content');
        const editButton = commentItem.querySelector('.edit-comment-btn');

        // 1. Update Konten Komentar di DOM
        commentTextElement.textContent = newText;

        // 2. Terapkan Batasan Edit
        editButton.setAttribute('data-edit-count', '1');
        editButton.disabled = true; // Nonaktifkan tombol
        editButton.textContent = 'Diedit (Selesai)';
        editButton.style.opacity = '0.7';

        // 3. Tutup Modal
        editModal.style.display = 'none';
        currentEditCommentId = null;
        alert("Ulasan berhasil diperbarui!");
    });
    
    // ========================================================
    // Init: Pastikan tombol edit yang sudah diedit sebelumnya nonaktif saat reload (Simulasi)
    document.querySelectorAll('.edit-comment-btn[data-edit-count="1"]').forEach(btn => {
        btn.disabled = true;
        btn.textContent = 'Diedit (Selesai)';
        btn.style.opacity = '0.7';
    });

}); // Akhir DOMContentLoaded