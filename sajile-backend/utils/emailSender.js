// utils/emailSender.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    pool: true,
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendVerificationEmail = async (email, verificationLink) => {
    // Buat versi aman (encoded) — ini hanya memastikan karakter tidak mengacaukan HTML
    const safeLink = encodeURI(verificationLink);

    const mailOptions = {
        from: `SajiLe Verification <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verifikasi Akun SajiLe Anda',
        // PENTING: tambahkan text fallback agar penerima selalu melihat URL secara langsung
        text: `Selamat datang di SajiLe!\n\nSilakan verifikasi akun Anda dengan mengunjungi link berikut:\n\n${verificationLink}\n\nLink berlaku 24 jam.`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: auto; background-color: #f9f9f9;">
                <h1 style="color: #4CAF50;">Selamat Datang di SajiLe!</h1>
                <p>Terima kasih telah mendaftar. Silakan klik tombol di bawah ini untuk mengaktifkan akun Anda:</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 25px auto 30px auto;">
                    <tr>
                        <td style="border-radius: 5px; background: #2ecc71; text-align: center;">
                            <a href="${safeLink}" target="_blank" rel="noopener noreferrer"
                                style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 12px 25px; border: 1px solid #2ecc71; border-radius: 5px; display: inline-block; font-weight: bold;">
                                Verifikasi Akun Sekarang
                            </a>
                        </td>
                    </tr>
                </table>

                <p style="margin-top: 20px; color: #555;">Atau salin link ini ke browser jika tombol tidak berfungsi:<br><small>${verificationLink}</small></p>

                <p style="margin-top: 20px; color: #555;">Link ini berlaku selama 24 jam. Jika Anda tidak mendaftar, abaikan email ini.</p>
                <p style="color: #555;">Hormat kami,<br>Tim SajiLe</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);

        // LOG DETAIL untuk debugging
        console.log('[EMAIL-SMTP-POOL] Sukses: Email dikirim ke', email);
        console.log('[EMAIL-SMTP-POOL] info:', {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            envelope: info.envelope,
            response: info.response,
        });

        return true;
    } catch (error) {
        console.error('[EMAIL-SMTP-POOL] GAGAL KRITIS: Gagal mengirim email verifikasi ke', email, 'Error:', error.message);
        if (error.code === 'EAUTH') {
            console.error('Periksa EMAIL_PASS di .env. Password aplikasi Gmail bisa salah/kadaluarsa.');
        }
        return false;
    }
};

module.exports = { sendVerificationEmail };
