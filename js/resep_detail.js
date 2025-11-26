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

    // --- 2. Scroll Animation (Fade In) ---
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
    
    // --- 3. Tombol Save/Favorite Logic ---
    const btnSave = document.getElementById('btn-save');
    const heartIcon = btnSave.querySelector('i');

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
    
    // --- 4. Kalkulator Porsi (Serving Calculator) Logic ---
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
    
    // --- 5. Print Recipe Logic ---
    const btnPrint = document.getElementById('btn-print');
    btnPrint.addEventListener('click', () => {
        // Logika print (Menggunakan window.print() yang memicu dialog cetak browser)
        window.print(); 
        console.log("Mencetak resep...");
        
        // Di lingkungan nyata, CSS khusus untuk print akan digunakan
    });

});