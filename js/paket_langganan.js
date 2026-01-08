// =======================================================
// P5 Project/js/paket_langganan.js
// =======================================================

document.addEventListener('selectstart', function(e) {
    e.preventDefault();
});

document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

import { getAuthUser, getAuthToken } from './authManager.js';
import { API_BASE_URL } from './config.js';

async function handleSubscription(packageType) {
    const user = getAuthUser();
    const token = getAuthToken();

    // 1. Validasi Login
    if (!user || !token) {
        Swal.fire({
            icon: 'warning',
            title: 'Akses Terbatas',
            text: 'Silakan masuk ke akun SajiLe Anda terlebih dahulu.',
            confirmButtonText: 'Masuk / Daftar',
            confirmButtonColor: '#2ecc71',
            showCancelButton: true
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'daftar_atau_login.html';
        });
        return;
    }

    // 2. Metadata Paket
    const packageInfo = {
        'starter_taster': { name: 'Taster Pass', price: 24900, period: 7 },
        'starter_pro':    { name: 'Quick Pro', price: 44900, period: 7 },
        'premium_home':   { name: 'Home Cook', price: 69900, period: 30 },
        'premium_elite':  { name: 'Elite Chef', price: 89900, period: 30 },
        'legend_year':    { name: 'Mastery Year', price: 899900, period: 365 },
        'legend_eternal': { name: 'Eternal Legend', price: 3499900, period: 1825 }
    };

    const selected = packageInfo[packageType];
    let quantity = 1; // Default jumlah beli

    // 3. Logika SweetAlert dengan Counter
    const isLegend = packageType === 'legend';

    const { value: confirmed } = await Swal.fire({
        title: 'Konfirmasi Pembayaran',
        html: `
            <div style="text-align: left; font-size: 0.9rem;">
                <p>Anda memilih <b>${selected.name}</b></p>
                
                ${!isLegend ? `
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin: 20px 0; background: #f0f2f5; padding: 15px; border-radius: 12px;">
                    <button id="minus-qty" style="width: 40px; height: 40px; border-radius: 50%; border: none; background: #e74c3c; color: white; cursor: pointer; font-weight: bold;"><i class="fas fa-minus"></i></button>
                    <div style="text-align: center;">
                        <span id="qty-display" style="font-size: 1.5rem; font-weight: bold; display: block;">1</span>
                        <small style="color: #666;">Jumlah Paket</small>
                    </div>
                    <button id="plus-qty" style="width: 40px; height: 40px; border-radius: 50%; border: none; background: #2ecc71; color: white; cursor: pointer; font-weight: bold;"><i class="fas fa-plus"></i></button>
                </div>
                ` : '<p style="text-align:center; color: #f1c40f;"><b><i class="fas fa-crown"></i> Akses Permanen</b></p>'}

                <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #2ecc71;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Total Durasi:</span>
                        <b id="total-days">${selected.period} Hari</b>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 1.2rem; color: #2ecc71;">
                        <span>Total Bayar:</span>
                        <b id="total-price">Rp ${selected.price.toLocaleString('id-ID')}</b>
                    </div>
                </div>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#2ecc71',
        confirmButtonText: 'Konfirmasi & Bayar',
        didOpen: () => {
            if (isLegend) return;

            const btnMinus = Swal.getHtmlContainer().querySelector('#minus-qty');
            const btnPlus = Swal.getHtmlContainer().querySelector('#plus-qty');
            const qtyDisplay = Swal.getHtmlContainer().querySelector('#qty-display');
            const priceDisplay = Swal.getHtmlContainer().querySelector('#total-price');
            const daysDisplay = Swal.getHtmlContainer().querySelector('#total-days');

            btnPlus.addEventListener('click', () => {
                quantity++;
                updateModal();
            });

            btnMinus.addEventListener('click', () => {
                if (quantity > 1) {
                    quantity--;
                    updateModal();
                }
            });

            function updateModal() {
                qtyDisplay.innerText = quantity;
                priceDisplay.innerText = `Rp ${(selected.price * quantity).toLocaleString('id-ID')}`;
                daysDisplay.innerText = `${selected.period * quantity} Hari`;
            }
        }
    });

    if (confirmed) {
        Swal.fire({
            title: 'Memproses Transaksi...',
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const response = await fetch(`${API_BASE_URL}/users/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    packageType: packageType,
                    quantity: quantity // Kirim jumlah paket ke backend
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.msg);

            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: `Paket ${selected.name} (${quantity} unit) telah aktif.`,
            });

            localStorage.setItem('authUser', JSON.stringify(data.user));
            window.location.href = 'profil.html';
        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    }
}

// FUNGSI COUNTDOWN & UPDATE UI TOMBOL
function updateSubscriptionUI() {
    const user = getAuthUser();
    if (!user) return;

    const membership = user.membership || 'free';
    const premiumUntil = user.premiumUntil ? new Date(user.premiumUntil) : null;
    const now = new Date();

    // 1. Mapping semua ID paket dari HTML ke Selector Tombol
    const buttons = {
        'starter_taster': document.querySelector('[data-package="starter_taster"] .btn-subscribe'),
        'starter_pro':    document.querySelector('[data-package="starter_pro"] .btn-subscribe'),
        'premium_home':   document.querySelector('[data-package="premium_home"] .btn-subscribe-main'),
        'premium_elite':  document.querySelector('[data-package="premium_elite"] .btn-subscribe-main'),
        'legend_year':    document.querySelector('[data-package="legend_year"] .btn-subscribe'),
        'legend_eternal': document.querySelector('[data-package="legend_eternal"] .btn-subscribe')
    };

    // 2. Loop semua tombol untuk mengatur status "Dipilih" atau "Aktif"
    Object.keys(buttons).forEach(key => {
        const btn = buttons[key];
        if (!btn) return;

        // Jika ini adalah paket yang sedang aktif digunakan user
        if (key === membership) {
            if (premiumUntil && premiumUntil > now) {
                const diff = premiumUntil - now;

                // Hitung Waktu Mundur
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                let countdownText = "";
                if (days > 0) {
                    countdownText = `${days} Hari lagi`;
                } else if (hours > 0) {
                    countdownText = `${hours} Jam lagi`;
                } else if (minutes > 0) {
                    countdownText = `${minutes} Menit`;
                } else {
                    countdownText = `${seconds} Detik`;
                }

                // Update Tampilan Tombol Aktif
                btn.innerHTML = `<i class="fas fa-clock"></i> Aktif: ${countdownText}`;
                btn.classList.add('active-plan');
                btn.style.backgroundColor = "#27ae60"; // Warna hijau sukses
                btn.disabled = true;
                btn.onclick = null;
            } else if (membership !== 'free') {
                // Jika sudah expired tapi masih tercatat di local (sebelum sync backend)
                btn.innerHTML = "Perbarui Paket";
                btn.classList.remove('active-plan');
                btn.disabled = false;
            }
        } else {
            // Untuk paket lain yang TIDAK dipilih, pastikan tombol normal
            // (Kecuali jika Anda ingin melarang downgrade/cross-grade saat masih aktif)
            btn.classList.remove('active-plan');
        }
    });

    // Khusus untuk Paket Free (karena tampilannya berbeda di HTML Anda)
    const freeCard = document.querySelector('[data-package="free"] .btn-subscribe-original');
    if (freeCard) {
        if (membership === 'free') {
            freeCard.innerText = "Paket Aktif";
            freeCard.style.backgroundColor = "#95a5a6";
            freeCard.disabled = true;
        } else {
            freeCard.innerText = "Gunakan Standar";
            freeCard.disabled = false;
        }
    }
}

// Jalankan saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    updateSubscriptionUI();
    // Update setiap 1 menit (atau 1 detik jika ingin countdown detik terlihat)
    setInterval(updateSubscriptionUI, 1000); 
});

window.handleSubscription = handleSubscription;