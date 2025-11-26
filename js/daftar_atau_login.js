// Ambil elemen dari DOM
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

// Event Listener untuk tombol di Overlay
signUpButton.addEventListener('click', () => {
    // Menambah class untuk mengaktifkan animasi geser ke kanan (Tampilkan Register)
    container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
    // Menghapus class untuk mengembalikan ke posisi awal (Tampilkan Login)
    container.classList.remove("right-panel-active");
});

// Fitur Tambahan: Toggle Password Visibility (Mata)
function togglePassword() {
    const passwordInput = document.getElementById('loginPass');
    const toggleIcon = document.querySelector('.toggle-password');

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = "password";
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}