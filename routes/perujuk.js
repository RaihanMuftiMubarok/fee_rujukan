const express = require("express");
const router = express.Router();
const Model_Perujuk = require('../model/Model_Perujuk.js');
const Model_Users = require('../model/Model_Users.js');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');

// ==========================================
// KONFIGURASI UPLOAD KHUSUS FILE EXCEL
// Tidak mengubah konfigurasi upload gambar
// ==========================================

const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // Maksimal 5 MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        if (ext === '.xlsx' || ext === '.xls') {
            return cb(null, true);
        }

        cb(new Error('File harus berformat Excel .xlsx atau .xls'));
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/anggota_bpd')
    },
    filename: (req, file, cb) => {
        console.log(file)
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage
})

router.get('/', async (req, res, next) => {
    try {
        // let id = req.session.userId;
        // let Data = await Model_Users.getId(id);
        // let page = parseInt(req.query.page) || 1;  // halaman aktif (default 1)
        // let limit = 10;                            // data per halaman
        // let offset = (page - 1) * limit;
        let rows = await Model_Perujuk.getAll();
        // let rows = await Model_Perujuk.getPaginated(limit, offset);
        // let total = await Model_Perujuk.getCount();
        // let totalPages = Math.ceil(total / limit);

        res.render('perujuk/index', {
            data: rows,
            // currentPage: page,
            // totalPages: totalPages,
            // data2: Data,
            // user: {
            //     nama: req.session.nama,
            //     foto: req.session.foto,
            //     role: req.session.role,
            // },
        });
    } catch (error) {
        console.log(error);
        res.redirect("/loginAdmin");
    }
});

router.get('/users', async function (req, res, next) {
    try {
        let rows = await Model_Perujuk.getAll();
        res.render('anggota_bpd/users/index', {
            data: rows,
            user: {
                nama: req.session.nama,
                foto: req.session.foto,
                role: req.session.role,
            },
        });
    } catch (error) {
        console.error("Error:", error);
        req.flash('invalid', 'Terjadi kesalahan saat memuat data anggota_bpd');
        res.redirect('/anggota_bpd');
    }
});




router.get('/create', async function (req, res, next) {
    try {
        // let level_users = req.session.level;
        let id = req.session.userId;
        let Data = await Model_Perujuk.getAll();
        // if(Data[0].level_users == "2") {
        res.render('perujuk/create', {
            nama_perujuk: '',
            jenis_perujuk: '',
            no_telepon: '',
            alamat: '',
            status_aktif: '',

            data: Data,
        })
        // }
        // else if (Data[0].level_users == "1"){
        //     req.flash('failure', 'Anda bukan admin');
        //     res.redirect('/sevice')
        // }
    } catch (error) {
        console.log(error);
    }
})

router.post('/store', async function (req, res, next) {
    try {
        let { nama_perujuk,
            jenis_perujuk,
            no_telepon,
            alamat,
            status_aktif,
        } = req.body;

        let Data = {
            nama_perujuk,
            jenis_perujuk,
            no_telepon,
            alamat,
            status_aktif,

        }

        await Model_Perujuk.Store(Data);
        req.flash('success', 'Berhasil menyimpan data');
        res.redirect('/perujuk');
    } catch (error) {
        req.flash('error', 'Terjadi kesalahan pada fungsi');
        console.error("Error terjadi di:");
        console.error(error.stack);
        res.redirect('/perujuk');
    }
});



router.get("/edit/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        let rows = await Model_Perujuk.getId(id);
        let rows2 = await Model_Perujuk.getAll();
        if (rows.length > 0) {
            res.render("perujuk/edit", {
                id: id,
                data: rows[0],
                data_perujuk: rows2,
            });
        } else {
            req.flash("error", "perujuk not found");
            res.redirect("/perujuk");
        }
    } catch (error) {
        next(error);
    }
});


// router.post("/update/:id", async (req, res, next) => {
//     try {
//         const id = req.params.id;

//         let {
//             nama_perujuk,
//             jenis_perujuk,
//             no_telepon,
//             alamat,
//             status_aktif
//         } = req.body;



//         let Data = {
//             nama_perujuk,
//             jenis_perujuk,
//             no_telepon,
//             alamat,
//             status_aktif

//         }
//         console.log(req.body);
//         console.log(Data);
//         await Model_Perujuk.Update(id, Data);
//         req.flash("success", "Berhasil mengupdate data perujuk");
//         res.redirect("/perujuk");
//     } catch (error) {
//         console.log(error);
//     }
// });

// ==========================================
// UPDATE DATA PERUJUK
// URL: POST /perujuk/update/:id
// ==========================================

router.post("/update/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Validasi ID dari URL.
        if (!Number.isInteger(id) || id <= 0) {
            req.flash("error", "ID perujuk tidak valid.");
            return res.redirect("/perujuk");
        }

        // Ambil data dari form edit.
        const nama_perujuk = String(
            req.body.nama_perujuk ?? ""
        ).trim();

        const jenis_perujuk = String(
            req.body.jenis_perujuk ?? ""
        ).trim().toUpperCase();

        const no_telepon = String(
            req.body.no_telepon ?? ""
        ).trim();

        const alamat = String(
            req.body.alamat ?? ""
        ).trim();

        const statusRaw = String(
            req.body.status_aktif ?? ""
        );

        // Validasi kolom wajib.
        if (!nama_perujuk) {
            req.flash("error", "Nama perujuk wajib diisi.");
            return res.redirect(`/perujuk/edit/${id}`);
        }

        if (nama_perujuk.length > 150) {
            req.flash("error", "Nama perujuk maksimal 150 karakter.");
            return res.redirect(`/perujuk/edit/${id}`);
        }

        const jenisValid = [
            "INDIVIDU",
            "INSTANSI",
            "KELOMPOK"
        ];

        if (!jenisValid.includes(jenis_perujuk)) {
            req.flash("error", "Jenis perujuk tidak valid.");
            return res.redirect(`/perujuk/edit/${id}`);
        }

        if (!["0", "1"].includes(statusRaw)) {
            req.flash("error", "Status perujuk tidak valid.");
            return res.redirect(`/perujuk/edit/${id}`);
        }

        if (no_telepon.length > 30) {
            req.flash("error", "Nomor telepon maksimal 30 karakter.");
            return res.redirect(`/perujuk/edit/${id}`);
        }

        // Nilai kosong disimpan sebagai NULL pada kolom opsional.
        const Data = {
            nama_perujuk: nama_perujuk,
            jenis_perujuk: jenis_perujuk,
            no_telepon: no_telepon || null,
            alamat: alamat || null,
            status_aktif: Number(statusRaw)
        };

        // Sengaja tidak mengubah nama_asli_excel dan id_instansi.
        // Kedua kolom tersebut tidak diedit melalui form ini.
        console.log("ID perujuk yang diperbarui:", id);
        console.log("Data update perujuk:", Data);

        await Model_Perujuk.Update(id, Data);

        req.flash("success", "Berhasil mengupdate data perujuk.");
        return res.redirect("/perujuk");

    } catch (error) {
        console.error("Error update data perujuk:", error);

        req.flash(
            "error",
            "Gagal mengupdate data perujuk. Periksa log server."
        );

        return res.redirect("/perujuk");
    }
});

router.get('/delete/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        await Model_Perujuk.Delete(id);
        req.flash('success', 'Berhasil menghapus data perujuk');
        res.redirect('/perujuk');
    } catch (error) {
        req.flash("error", "Gagal menghapus data perujuk");
        res.redirect("/perujuk");
    }
});

router.get('/detail/:id_perujuk', async (req, res) => {
    try {
        const id = req.params.id_perujuk;
        const perujuk = await Model_Perujuk.getById(id);

        if (!perujuk) {
            req.flash('invalid', 'perujuk tidak ditemukan');
            return res.redirect('/users');
        }

        res.render('perujuk/users/detail', {
            perujuk,
            recentPosts,
            user: {
                nama: req.session.nama,
                foto: req.session.foto,
                role: req.session.role,
            },
        });

    } catch (err) {
        console.error(err);
        req.flash('invalid', 'Terjadi kesalahan saat memuat perujuk');
        res.redirect('/users');
    }
});


// ==========================================
// FUNGSI NORMALISASI NAMA
// ==========================================

function normalisasiNama(nama) {
    return String(nama || '')
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim();
}

// ==========================================
// KLASIFIKASI OTOMATIS JENIS PERUJUK
// ==========================================

function klasifikasiPerujuk(nama) {
    const teks = normalisasiNama(nama).toUpperCase();

    // Kata kunci instansi didahulukan karena
    // nama instansi kadang memuat nama individu.
    const kataInstansi = [
        /\bPKM\b/,
        /\bPUSKESMAS\b/,
        /\bRS\b/,
        /\bRSI\b/,
        /\bRUMAH SAKIT\b/,
        /\bKLINIK\b/,
        /\bPRAKTEK\b/,
        /\bPRAKTIK\b/,
        /\bPOLINDES\b/,
        /\bPOSKESDES\b/,
        /\bPONKESDES\b/,
        /\bPONED\b/,
        /\bPONKES\b/,
        /\bPUSKEMAS\b/,
        /\bDINAS\b/,
        /\bINSTANSI\b/,
        /\bLABORATORIUM\b/,
        /\bAPOTEK\b/,
        /\bBPM\b/,
        /\bPMB\b/,
        /\bPANTI\b/
    ];

    // Kata kunci kelompok atau tim perujuk.
    const kataKelompok = [
        /\bTIM\b/,
        /\bKELOMPOK\b/,
        /\bKADER\b/,
        /\bDRIVER\b/,
        /\bPERAWAT\b/,
        /\bBIDAN DAN\b/,
        /\bDOKTER DAN\b/
    ];

    // Gelar atau sapaan yang sering digunakan
    // pada nama individu.
    const kataIndividu = [
        /\bDR\b/,
        /\bDOKTER\b/,
        /\bBDN\b/,
        /\bBIDAN\b/,
        /\bNY\b/,
        /\bNN\b/,
        /\bTN\b/,
        /\bTUAN\b/,
        /\bNYONYA\b/,
        /\bBAPAK\b/,
        /\bIBU\b/,
        /\bSUSTER\b/,
        /\bPERAWAT\b/
    ];

    if (kataInstansi.some(regex => regex.test(teks))) {
        return {
            jenis_perujuk: 'INSTANSI',
            keterangan: 'Terdeteksi kata kunci instansi',
            perlu_diperiksa: false
        };
    }

    if (kataKelompok.some(regex => regex.test(teks))) {
        return {
            jenis_perujuk: 'KELOMPOK',
            keterangan: 'Terdeteksi kata kunci kelompok/tim',
            perlu_diperiksa: false
        };
    }

    if (kataIndividu.some(regex => regex.test(teks))) {
        return {
            jenis_perujuk: 'INDIVIDU',
            keterangan: 'Terdeteksi sapaan atau gelar individu',
            perlu_diperiksa: false
        };
    }

    // Default bukan berarti pasti individu.
    // Admin harus memeriksa hasil yang ambigu.
    return {
        jenis_perujuk: 'INDIVIDU',
        keterangan: 'Tidak ditemukan kata kunci yang jelas',
        perlu_diperiksa: true
    };
}

// ==========================================
// DAFTAR KECAMATAN UNTUK DETEKSI ALAMAT
// Sesuaikan jika ada pengirim dari wilayah lain.
// ==========================================

function kunciKecamatan(teks) {
    return normalisasiNama(teks)
        .toUpperCase()
        .replace(/^(KECAMATAN|KEC\.?)\s*/, '')
        .replace(/[.,]/g, ' ')
        .replace(/[-_/]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const DAFTAR_KECAMATAN = new Set([
    'Ambunten',
    'Arjasa',
    'Batang-Batang',
    'Batuputih',
    'Batuan',
    'Bluto',
    'Dasuk',
    'Dungkek',
    'Ganding',
    'Gapura',
    'Gayam',
    'Giligenting',
    'Guluk-Guluk',
    'Kalianget',
    'Kalianget Timur',
    'Kalianget Barat',
    'Kangayan',
    'Lenteng',
    'Manding',
    'Masalembu',
    'Nonggunong',
    'Pasongsongan',
    'Pragaan',
    'Raas',
    'Rubaru',
    'Saronggi',
    'Sapeken',
    'Talango',
    'Kota Sumenep'
].map(kunciKecamatan));

function adalahKecamatan(teks) {
    const kunci = kunciKecamatan(teks);

    if (DAFTAR_KECAMATAN.has(kunci)) {
        return true;
    }

    // Mendukung format seperti "GAPURA SUMENEP".
    const tanpaKabupaten = kunci.replace(/\s+SUMENEP$/, '');

    return DAFTAR_KECAMATAN.has(tanpaKabupaten);
}


// ==========================================
// PARSING NAMA, ALAMAT, DAN NOMOR TELEPON
// ==========================================

function parseDataPengirim(value) {
    // Simpan teks asli sebelum melakukan pemisahan.
    const namaAsliExcel = String(value ?? '').trim();

    // Mendeteksi nomor berawalan 0, 62, atau +62.
    // Mendukung nomor yang menggunakan spasi, titik,
    // tanda kurung, atau tanda hubung.
    const polaTelepon = /(?:\+?62|0)(?:[\s().-]*\d){7,13}/g;

    const kandidatTelepon = [
        ...namaAsliExcel.matchAll(polaTelepon)
    ]
        .map(match => match[0].trim())
        .filter(nomor => {
            const jumlahDigit = nomor.replace(/\D/g, '').length;

            return jumlahDigit >= 9 && jumlahDigit <= 15;
        });

    // Hilangkan nomor telepon dari teks nama/alamat.
    let teks = namaAsliExcel;

    for (const nomor of kandidatTelepon) {
        teks = teks.replace(nomor, ' ');
    }

    teks = normalisasiNama(teks)
        .replace(/\s*\/\s*/g, ' / ')
        .replace(/(?:\s*\/\s*)+$/, '')
        .trim();

    const bagian = teks
        .split('/')
        .map(item => normalisasiNama(item))
        .filter(Boolean);

    let indeksAlamat = -1;

    // Cari nama kecamatan pada bagian setelah nama pengirim.
    // Pencarian dari belakang mendukung format:
    // NAMA / INSTANSI / KECAMATAN / TELEPON
    for (let i = bagian.length - 1; i >= 1; i--) {
        if (adalahKecamatan(bagian[i])) {
            indeksAlamat = i;
            break;
        }
    }

    let namaPerujuk = teks;
    let alamat = null;

    if (indeksAlamat >= 1) {
        namaPerujuk = bagian
            .slice(0, indeksAlamat)
            .join(' / ')
            .trim();

        // Pertahankan bagian setelah kecamatan bila ada,
        // misalnya keterangan alamat tambahan.
        alamat = bagian
            .slice(indeksAlamat)
            .join(' / ')
            .trim() || null;
    }

    const nomorUnik = [...new Set(kandidatTelepon)];

    return {
        nama_asli_excel: namaAsliExcel,
        nama_perujuk: namaPerujuk,
        alamat: alamat,
        no_telepon: nomorUnik.length
            ? nomorUnik.join(', ')
            : null
    };
}

// ==========================================
// FORM UPLOAD EXCEL
// URL: GET /perujuk/import
// ==========================================

router.get('/import', (req, res) => {
    res.render('perujuk/import', {
        mode: 'upload',
        rows: [],
        hasil: null,
        error: null
    });
});


// Middleware upload Excel agar error file dapat
// ditampilkan pada halaman impor.
function handleExcelUpload(req, res, next) {
    excelUpload.single('file_excel')(req, res, (err) => {
        if (err) {
            return res.status(400).render('perujuk/import', {
                mode: 'upload',
                rows: [],
                hasil: null,
                error: err.message || 'Gagal mengunggah file Excel.'
            });
        }

        next();
    });
}


// ==========================================
// BACA EXCEL DAN TAMPILKAN PREVIEW
// URL: POST /perujuk/import/preview
// ==========================================

router.post('/import/preview', handleExcelUpload, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).render('perujuk/import', {
                mode: 'upload',
                rows: [],
                hasil: null,
                error: 'Silakan pilih file Excel terlebih dahulu.'
            });
        }

        // Membaca Excel dari buffer memori.
        const workbook = XLSX.read(req.file.buffer, {
            type: 'buffer'
        });

        const namaSheet = workbook.SheetNames[0];

        if (!namaSheet) {
            throw new Error('File Excel tidak memiliki sheet.');
        }

        const worksheet = workbook.Sheets[namaSheet];

        // Membaca baris pertama sebagai header.
        const dataExcel = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            raw: false
        });

        if (dataExcel.length === 0) {
            throw new Error('Tidak ditemukan data pada file Excel.');
        }

        // Cari header NAMA PENGIRIM, tanpa terpengaruh
        // huruf besar/kecil dan spasi berlebih.
        const headerNama = Object.keys(dataExcel[0]).find(key => {
            return normalisasiNama(key).toUpperCase() === 'NAMA PENGIRIM';
        });

        if (!headerNama) {
            throw new Error(
                'Header "NAMA PENGIRIM" tidak ditemukan. Periksa nama kolom Excel.'
            );
        }

        const rows = [];

        dataExcel.forEach((item, index) => {
            const nilaiExcel = item[headerNama];

            if (!normalisasiNama(nilaiExcel)) {
                return;
            }

            // Pisahkan nama, alamat, telepon, dan simpan teks asli.
            const parsed = parseDataPengirim(nilaiExcel);

            if (!parsed.nama_perujuk) {
                return;
            }

            // Klasifikasi menggunakan nama yang sudah dipisahkan
            // dari alamat dan nomor telepon.
            const klasifikasi = klasifikasiPerujuk(parsed.nama_perujuk);

            rows.push({
                baris_excel: index + 2,

                nama_asli_excel: parsed.nama_asli_excel,
                nama_perujuk: parsed.nama_perujuk,
                alamat: parsed.alamat,
                no_telepon: parsed.no_telepon,

                jenis_perujuk: klasifikasi.jenis_perujuk,
                keterangan: klasifikasi.keterangan,
                perlu_diperiksa: klasifikasi.perlu_diperiksa
            });
        });

        if (rows.length === 0) {
            throw new Error(
                'Tidak ada nama pengirim yang dapat diimpor.'
            );
        }

        // Batas pengaman jumlah data untuk satu kali impor.
        if (rows.length > 2000) {
            throw new Error(
                'Maksimal 2.000 baris data per proses impor. Pecah file menjadi beberapa bagian.'
            );
        }

        return res.render('perujuk/import', {
            mode: 'preview',
            rows,
            hasil: null,
            error: null
        });

    } catch (err) {
        console.error('Error preview impor perujuk:', err);

        return res.status(400).render('perujuk/import', {
            mode: 'upload',
            rows: [],
            hasil: null,
            error: err.message || 'Gagal membaca file Excel.'
        });
    }
});


// ==========================================
// SIMPAN DATA HASIL PREVIEW
// URL: POST /perujuk/import/store
// ==========================================

router.post('/import/store', async (req, res) => {
    try {
        if (typeof req.body.rowsJson !== 'string') {
            throw new Error('Data preview tidak ditemukan. Silakan unggah ulang Excel.');
        }

        let rows;

        try {
            rows = JSON.parse(req.body.rowsJson);
        } catch (err) {
            throw new Error('Data preview tidak valid. Silakan unggah ulang Excel.');
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error('Tidak ada data untuk disimpan.');
        }

        if (rows.length > 2000) {
            throw new Error('Jumlah data melebihi batas 2.000 baris.');
        }

        const jenisValid = ['INDIVIDU', 'INSTANSI', 'KELOMPOK'];
        const dataValid = [];

        for (const row of rows) {
            const nama = normalisasiNama(row.nama_perujuk);
            const jenis = String(row.jenis_perujuk || '').toUpperCase();

            const namaAsliExcel = String(
                row.nama_asli_excel ?? row.nama_perujuk ?? ''
            ).trim();

            const alamat = normalisasiNama(row.alamat || '') || null;
            const noTelepon = normalisasiNama(row.no_telepon || '') || null;

            if (!nama) {
                continue;
            }

            if (!jenisValid.includes(jenis)) {
                throw new Error(`Jenis perujuk untuk "${nama}" tidak valid.`);
            }

            if (nama.length > 150) {
                throw new Error(
                    `Nama "${nama.substring(0, 40)}..." melebihi batas 150 karakter.`
                );
            }

            if (namaAsliExcel.length > 255) {
                throw new Error(
                    `Teks asli untuk "${nama.substring(0, 40)}..." melebihi 255 karakter.`
                );
            }

            if (noTelepon && noTelepon.length > 30) {
                throw new Error(
                    `Nomor telepon untuk "${nama}" melebihi batas 30 karakter.`
                );
            }

            dataValid.push({
                nama_perujuk: nama,
                nama_asli_excel: namaAsliExcel,
                jenis_perujuk: jenis,
                no_telepon: noTelepon,
                alamat: alamat,

                // Hubungan ke instansi belum ditentukan secara otomatis.
                id_instansi: null,

                status_aktif: 1
            });
        }

        if (dataValid.length === 0) {
            throw new Error('Tidak ada data valid untuk disimpan.');
        }

        // Ambil data existing untuk mencegah duplikat
        // berdasarkan nama, tanpa membedakan kapitalisasi.
        const dataExisting = await Model_Perujuk.getAll();

        const namaTersimpan = new Set(
            dataExisting.map(item =>
                normalisasiNama(item.nama_perujuk).toLocaleLowerCase('id-ID')
            )
        );

        const namaDalamImpor = new Set();

        let berhasil = 0;
        let duplikat = 0;
        let gagal = 0;

        const detailGagal = [];

        // Loop penyimpanan menggunakan Model_Perujuk.Store().
        for (const item of dataValid) {
            const namaKey = item.nama_perujuk.toLocaleLowerCase('id-ID');

            // Cek duplikat terhadap database dan baris impor.
            if (namaTersimpan.has(namaKey) || namaDalamImpor.has(namaKey)) {
                duplikat++;
                continue;
            }

            namaDalamImpor.add(namaKey);

            try {
                await Model_Perujuk.Store(item);

                berhasil++;

                // Cegah duplikat jika ada variasi yang muncul
                // dalam proses impor yang sama.
                namaTersimpan.add(namaKey);

            } catch (err) {
                gagal++;

                console.error(
                    `Gagal menyimpan perujuk "${item.nama_perujuk}":`,
                    err
                );

                detailGagal.push({
                    nama: item.nama_perujuk,
                    pesan: err.code === 'ER_DATA_TOO_LONG'
                        ? 'Data terlalu panjang.'
                        : 'Gagal disimpan ke database.'
                });
            }
        }

        return res.render('perujuk/import', {
            mode: 'result',
            rows: [],
            error: null,
            hasil: {
                total: dataValid.length,
                berhasil,
                duplikat,
                gagal,
                detailGagal
            }
        });

    } catch (err) {
        console.error('Error simpan impor perujuk:', err);

        return res.status(400).render('perujuk/import', {
            mode: 'upload',
            rows: [],
            hasil: null,
            error: err.message || 'Gagal menyimpan data impor.'
        });
    }
});

module.exports = router;