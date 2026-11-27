const express = require("express");
const router = express.Router();
const Model_Periode = require('../model/Model_Periode.js');
const Model_Users = require('../model/Model_Users.js');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const ExcelJS = require('exceljs');






router.get('/', async (req, res, next) => {
    try {
        // let id = req.session.userId;
        // let Data = await Model_Users.getId(id);
        // let page = parseInt(req.query.page) || 1;  // halaman aktif (default 1)
        // let limit = 10;                            // data per halaman
        // let offset = (page - 1) * limit;
        let rows = await Model_Periode.getAll();
        // let rows = await Model_Periode.getPaginated(limit, offset);
        // let total = await Model_Periode.getCount();
        // let totalPages = Math.ceil(total / limit);

        res.render('periode/index', {
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

// ======================================================
// HALAMAN REKAP PERIODE
// URL: /periode/rekap
// ======================================================

router.get('/rekap', async (req, res, next) => {

    try {

        // ==========================================
        // Validasi filter tahun
        // ==========================================

        const tahunRaw = String(req.query.tahun ?? '').trim();

        let tahun = '';

        if (
            /^\d{4}$/.test(tahunRaw) &&
            Number(tahunRaw) >= 2000 &&
            Number(tahunRaw) <= 2100
        ) {
            tahun = Number(tahunRaw);
        }


        // ==========================================
        // Validasi filter bulan
        // ==========================================

        const bulanRaw = String(req.query.bulan ?? '').trim();

        let bulan = '';

        if (/^(?:[1-9]|1[0-2])$/.test(bulanRaw)) {
            bulan = Number(bulanRaw);
        }


        // ==========================================
        // Ambil rekap periode
        // ==========================================

        const filters = {
            tahun,
            bulan
        };

        const data = await Model_Periode.getRekap(filters);

        // Ambil daftar tahun untuk dropdown
        const tahunList = await Model_Periode.getYears();


        // ==========================================
        // Tampilkan halaman
        // ==========================================

        res.render('periode/rekap', {

            data,

            tahunList,

            filters,

            success: req.flash('success'),
            error: req.flash('error')

        });

    } catch (error) {

        console.error('Error halaman rekap periode:', error);

        next(error);

    }

});

router.get('/users', async function (req, res, next) {
    try {
        let rows = await Model_Periode.getAll();
        res.render('periode/users/index', {
            data: rows,
            user: {
                nama: req.session.nama,
                foto: req.session.foto,
                role: req.session.role,
            },
        });
    } catch (error) {
        console.error("Error:", error);
        req.flash('invalid', 'Terjadi kesalahan saat memuat data periode');
        res.redirect('/periode');
    }
});




router.get('/create', async function (req, res, next) {
    try {
        // let level_users = req.session.level;
        let id = req.session.userId;
        let Data = await Model_Periode.getAll();
        // if(Data[0].level_users == "2") {
        res.render('periode/create', {
            tahun: '',
            bulan: '',
            nomor_periode: '',
            uang_muka: '',
            keterangan: '',
            
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

router.post('/store', async (req, res) => {
    try {
        const tahun = Number(req.body.tahun);
        const bulan = Number(req.body.bulan);
        const nomor_periode = Number(req.body.nomor_periode);
        const uang_muka = Number(req.body.uang_muka);
        const keterangan = String(req.body.keterangan ?? '').trim();

        if (
            !Number.isInteger(tahun) ||
            !Number.isInteger(bulan) ||
            bulan < 1 ||
            bulan > 12 ||
            !Number.isInteger(nomor_periode) ||
            nomor_periode < 1 ||
            !Number.isFinite(uang_muka) ||
            uang_muka <= 0
        ) {
            req.flash('error', 'Data periode tidak valid. Periksa kembali form.');
            return res.redirect('/periode/create');
        }

        const Data = {
            tahun,
            bulan,
            nomor_periode,
            uang_muka,
            keterangan: keterangan || null
        };

        await Model_Periode.Store(Data);

        req.flash('success', 'Berhasil menyimpan data periode.');
        return res.redirect('/periode');

    } catch (error) {
        console.error('Error menyimpan periode:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            req.flash('error', 'Periode tersebut sudah terdaftar.');
            return res.redirect('/periode/create');
        }

        req.flash('error', 'Gagal menyimpan data periode.');
        return res.redirect('/periode/create');
    }
});



router.get("/edit/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        let rows = await Model_Periode.getId(id);
        let rows2 = await Model_Periode.getAll();
        if (rows.length > 0) {
            res.render("periode/edit", {
                id: id,
                data: rows[0],
                data_periode: rows2,
            });
        } else {
            req.flash("error", "periode not found");
            res.redirect("/periode");
        }
    } catch (error) {
        next(error);
    }
});


// router.post("/update/:id", async (req, res, next) => {
//     try {
//         const id = req.params.id;

//         let {
//             tahun,
//             bulan,
//             nomor_periode,
//             keterangan
//         } = req.body;



//         let Data = {
//             tahun,
//             bulan,
//             nomor_periode,
//             keterangan

//         }
//         console.log(req.body);
//         console.log(Data);
//         await Model_Periode.Update(id, Data);
//         req.flash("success", "Berhasil mengupdate data petugas");
//         res.redirect("/periode");
//     } catch (error) {
//         console.log(error);
//     }
// });
router.post("/update/:id", async (req, res) => {
    const id = req.params.id;

    try {
        // Validasi ID
        if (!/^\d+$/.test(id) || id === '0') {
            req.flash("error", "ID periode tidak valid.");
            return res.redirect("/periode");
        }

        // Ambil data dari form
        const tahun = Number(req.body.tahun);
        const bulan = Number(req.body.bulan);
        const nomor_periode = Number(req.body.nomor_periode);
        const uang_muka = Number(req.body.uang_muka);
        const keterangan = String(req.body.keterangan ?? "").trim();

        // Validasi data
        if (
            !Number.isInteger(tahun) ||
            !Number.isInteger(bulan) ||
            bulan < 1 ||
            bulan > 12 ||
            !Number.isInteger(nomor_periode) ||
            nomor_periode < 1 ||
            !Number.isFinite(uang_muka) ||
            uang_muka <= 0
        ) {
            req.flash("error", "Data periode tidak valid.");
            return res.redirect(`/periode/edit/${id}`);
        }

        // Pastikan data periode tersedia
        const rows = await Model_Periode.getId(id);

        if (rows.length === 0) {
            req.flash("error", "Data periode tidak ditemukan.");
            return res.redirect("/periode");
        }

        const Data = {
            tahun,
            bulan,
            nomor_periode,
            uang_muka,
            keterangan: keterangan || null
        };

        await Model_Periode.Update(id, Data);

        req.flash("success", "Berhasil mengupdate data periode.");
        return res.redirect("/periode");

    } catch (error) {
        console.error("Error update data periode:", error);

        if (error.code === 'ER_DUP_ENTRY') {
            req.flash("error", "Kombinasi tahun, bulan, dan nomor periode sudah digunakan.");
            return res.redirect(`/periode/edit/${id}`);
        }

        req.flash("error", "Gagal mengupdate data periode.");
        return res.redirect(`/periode/edit/${id}`);
    }
});

router.post('/delete/:id', async (req, res) => {
    const id = req.params.id;

    try {
        if (!/^\d+$/.test(id) || id === '0') {
            req.flash('error', 'ID periode tidak valid.');
            return res.redirect('/periode');
        }

        const rows = await Model_Periode.getId(id);

        if (rows.length === 0) {
            req.flash('error', 'Data periode tidak ditemukan.');
            return res.redirect('/periode');
        }

        await Model_Periode.Delete(id);

        req.flash('success', 'Berhasil menghapus data periode.');
        return res.redirect('/periode');

    } catch (error) {
        console.error('Error menghapus periode:', error);

        if (
            error.code === 'ER_ROW_IS_REFERENCED_2' ||
            error.errno === 1451
        ) {
            req.flash(
                'error',
                'Periode tidak dapat dihapus karena sudah digunakan oleh transaksi.'
            );
            return res.redirect('/periode');
        }

        req.flash('error', 'Gagal menghapus data periode.');
        return res.redirect('/periode');
    }
});

// ======================================================
// DETAIL PERIODE
// URL: /periode/detail/:id_periode
// ======================================================

router.get('/detail/:id_periode', async (req, res, next) => {

    try {

        // ID dipertahankan sebagai string karena BIGINT UNSIGNED.
        const id_periode = String(
            req.params.id_periode ?? ''
        );

        // Validasi ID
        if (!/^[1-9]\d*$/.test(id_periode)) {

            req.flash('error', 'ID periode tidak valid.');

            return res.redirect('/periode/rekap');
        }


        // Ambil ringkasan periode
        const periode = await Model_Periode.getRekapById(
            id_periode
        );


        // Jika periode tidak ditemukan
        if (!periode) {

            req.flash('error', 'Data periode tidak ditemukan.');

            return res.redirect('/periode/rekap');
        }


        // Ambil semua transaksi ONSITE pada periode tersebut
        const transaksi = await Model_Periode.getTransaksiByPeriode(
            id_periode
        );


        // Tampilkan halaman detail
        res.render('periode/detail', {

            periode,
            transaksi,

            success: req.flash('success'),
            error: req.flash('error')

        });


    } catch (error) {

        console.error('Error halaman detail periode:', error);

        next(error);

    }

});

// ======================================================
// EXPORT REKAP PERIODE KE EXCEL
// URL: /periode/rekap/export?tahun=2026&bulan=10
// ======================================================

router.get('/rekap/export', async (req, res) => {

    try {

        // ==========================================
        // 1. VALIDASI TAHUN DAN BULAN
        // ==========================================

        const tahunRaw = String(req.query.tahun ?? '').trim();
        const bulanRaw = String(req.query.bulan ?? '').trim();

        if (!/^\d{4}$/.test(tahunRaw)) {

            req.flash(
                'error',
                'Pilih tahun terlebih dahulu sebelum ekspor Excel.'
            );

            return res.redirect('/periode/rekap');
        }

        if (!/^(?:[1-9]|1[0-2])$/.test(bulanRaw)) {

            req.flash(
                'error',
                'Pilih bulan terlebih dahulu sebelum ekspor Excel.'
            );

            return res.redirect('/periode/rekap?tahun=' + tahunRaw);
        }

        const tahun = Number(tahunRaw);
        const bulan = Number(bulanRaw);

        if (tahun < 2000 || tahun > 2100) {

            req.flash('error', 'Tahun yang dipilih tidak valid.');

            return res.redirect('/periode/rekap');
        }


        // ==========================================
        // 2. AMBIL SEMUA PERIODE BULAN TERPILIH
        // ==========================================

        const periodeList = await Model_Periode.getRekap({
            tahun,
            bulan
        });

        if (periodeList.length === 0) {

            req.flash(
                'error',
                'Tidak ada periode yang terdaftar pada bulan dan tahun tersebut.'
            );

            return res.redirect(
                `/periode/rekap?tahun=${tahun}&bulan=${bulan}`
            );
        }


        // ==========================================
        // 3. PERSIAPAN EXCEL
        // ==========================================

        const workbook = new ExcelJS.Workbook();

        workbook.creator = 'Sistem Informasi Fee Rujukan';
        workbook.lastModifiedBy = 'Admin Fee Rujukan';
        workbook.created = new Date();
        workbook.modified = new Date();

        workbook.subject = 'Rekap Fee Rujukan Rumah Sakit';
        workbook.title = `Daftar Fee Rujukan ${tahun}`;


        const namaBulan = [
            '',
            'JANUARI',
            'FEBRUARI',
            'MARET',
            'APRIL',
            'MEI',
            'JUNI',
            'JULI',
            'AGUSTUS',
            'SEPTEMBER',
            'OKTOBER',
            'NOVEMBER',
            'DESEMBER'
        ];

        const namaBulanTerpilih = namaBulan[bulan];

        // Satu worksheet untuk satu bulan
        const worksheet = workbook.addWorksheet(
            `ONSITE ${namaBulanTerpilih}`
        );


        // ==========================================
        // 4. PENGATURAN HALAMAN DAN KOLOM
        // ==========================================

        worksheet.properties.defaultRowHeight = 17;

        worksheet.columns = [
            { width: 5 },   // A - NO
            { width: 43 },  // B - NAMA PENGIRIM
            { width: 35 },  // C - NAMA PX
            { width: 14 },  // D - NO. RM
            { width: 12 },  // E - STATUS
            { width: 15 },  // F - RUANG
            { width: 14 },  // G - TGL. MRS
            { width: 15 },  // H - DX
            { width: 17 },  // I - JML
            { width: 25 },  // J - PETUGAS PENERIMA
            { width: 25 }   // K - PETUGAS PENCAIR
        ];

        worksheet.pageSetup = {
            paperSize: 9,
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,

            margins: {
                left: 0.25,
                right: 0.25,
                top: 0.50,
                bottom: 0.50,
                header: 0.20,
                footer: 0.20
            }
        };


        // ==========================================
        // 5. STYLE EXCEL
        // ==========================================

        const thinBorder = {
            top: {
                style: 'thin',
                color: { argb: 'FF000000' }
            },
            left: {
                style: 'thin',
                color: { argb: 'FF000000' }
            },
            bottom: {
                style: 'thin',
                color: { argb: 'FF000000' }
            },
            right: {
                style: 'thin',
                color: { argb: 'FF000000' }
            }
        };

        const titleFont = {
            name: 'Bookman Old Style',
            size: 11,
            bold: true
        };

        const headerFont = {
            name: 'Bookman Old Style',
            size: 10,
            bold: true
        };

        const bodyFont = {
            name: 'Arial',
            size: 10
        };

        const summaryFont = {
            name: 'Bookman Old Style',
            size: 11,
            bold: true
        };


        // Helper memberikan border pada seluruh kolom A:K
        function applyBorder(row) {

            for (let col = 1; col <= 11; col++) {

                row.getCell(col).border = thinBorder;

                row.getCell(col).alignment = {
                    vertical: 'middle',
                    wrapText: true
                };

            }
        }


        // Helper menambahkan judul dengan merge B:J
        function addTitle(text) {

            const row = worksheet.addRow([]);

            const rowNumber = row.number;

            worksheet.mergeCells(
                `B${rowNumber}:J${rowNumber}`
            );

            const cell = worksheet.getCell(`B${rowNumber}`);

            cell.value = text;
            cell.font = titleFont;

            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle'
            };

            row.height = 20;

            return row;
        }


        // Helper konversi tanggal MySQL menjadi Date Excel
        function parseExcelDate(value) {

            if (!value) return null;

            if (
                value instanceof Date &&
                !isNaN(value.getTime())
            ) {

                return new Date(
                    value.getFullYear(),
                    value.getMonth(),
                    value.getDate()
                );

            }

            const raw = String(value).substring(0, 10);

            const match = raw.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

            if (!match) return null;

            return new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            );

        }


        // ==========================================
        // 6. HEADER TABEL
        // ==========================================

        const headers = [
            'NO',
            'NAMA PENGIRIM',
            'NAMA PX',
            'NO. RM',
            'STATUS',
            'RUANG',
            'TGL. MRS',
            'DX',
            'JML',
            'PETUGAS PENERIMA RUJUKAN',
            'PETUGAS YANG MENCAIRKAN'
        ];


        // ==========================================
        // 7. BUAT BLOK UNTUK SETIAP PERIODE
        // ==========================================

        for (const periode of periodeList) {

            // Ambil transaksi ONSITE pada periode ini
            const transaksi =
                await Model_Periode.getTransaksiExportByPeriode(
                    periode.id_periode
                );


            // --------------------------------------
            // A. JUDUL LAPORAN
            // --------------------------------------

            addTitle(
                'DAFTAR TRANSPORT PENGIRIM PASIEN RAWAT INAP DAN TINDAKAN UNTUK PASIEN UMUM & BPJS'
            );

            addTitle(
                `BULAN ${namaBulanTerpilih} ${tahun}`
            );

            addTitle(
                `PERIODE ${String(periode.nomor_periode).padStart(2, '0')}`
            );


            // --------------------------------------
            // B. HEADER KOLOM
            // --------------------------------------

            const headerRow = worksheet.addRow(headers);

            headerRow.height = 34;

            for (let col = 1; col <= 11; col++) {

                const cell = headerRow.getCell(col);

                cell.font = headerFont;

                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle',
                    wrapText: true
                };

                cell.border = thinBorder;

            }


            // --------------------------------------
            // C. DATA TRANSAKSI
            // --------------------------------------

            let nomor = 1;
            let totalFee = 0;

            if (transaksi.length > 0) {

                transaksi.forEach(item => {

                    const nominal = Number(item.nominal_fee || 0);

                    totalFee += nominal;

                    const row = worksheet.addRow([

                        nomor++,

                        item.nama_perujuk || '',

                        item.nama_pasien || '',

                        item.no_rm != null
                            ? String(item.no_rm)
                            : '',

                        item.status_pasien || '',

                        item.nama_ruang || '',

                        parseExcelDate(item.tanggal_mrs),

                        item.kode_dx || '',

                        nominal,

                        item.nama_petugas_penerima || '',

                        item.nama_petugas_pencair || ''

                    ]);

                    row.height = 20;

                    applyBorder(row);

                    // Format nomor RM sebagai teks
                    row.getCell(4).numFmt = '@';

                    // Format tanggal
                    row.getCell(7).numFmt = 'dd/mm/yyyy';

                    // Format nominal rupiah tanpa simbol Rp
                    row.getCell(9).numFmt = '#,##0;[Red]-#,##0';

                    // Perataan kolom
                    row.getCell(1).alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    };

                    row.getCell(4).alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    };

                    row.getCell(5).alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    };

                    row.getCell(7).alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    };

                    row.getCell(9).alignment = {
                        horizontal: 'right',
                        vertical: 'middle'
                    };

                });

            } else {

                // Periode kosong tetap dimasukkan ke Excel
                const emptyRow = worksheet.addRow([
                    null,
                    'BELUM ADA TRANSAKSI ONSITE'
                ]);

                const rowNumber = emptyRow.number;

                worksheet.mergeCells(
                    `B${rowNumber}:K${rowNumber}`
                );

                emptyRow.getCell(2).font = {
                    name: 'Arial',
                    size: 10,
                    italic: true
                };

                emptyRow.getCell(2).alignment = {
                    horizontal: 'center',
                    vertical: 'middle'
                };

                applyBorder(emptyRow);

            }


            // --------------------------------------
            // D. RINGKASAN PERIODE
            // --------------------------------------

            const uangMuka = Number(periode.uang_muka || 0);

            const lebihKurangBayar = uangMuka - totalFee;


            function addSummary(label, nominal) {

                const values = Array(11).fill(null);

                values[1] = label;
                values[8] = nominal;

                const row = worksheet.addRow(values);

                row.height = 19;

                applyBorder(row);

                row.getCell(2).font = summaryFont;

                row.getCell(9).font = summaryFont;

                row.getCell(9).numFmt = '#,##0;[Red]-#,##0';

                row.getCell(9).alignment = {
                    horizontal: 'right',
                    vertical: 'middle'
                };

            }


            addSummary('TOTAL', totalFee);

            addSummary('UANG MUKA', uangMuka);

            addSummary('LEBIH/KURANG BAYAR', lebihKurangBayar);


            // --------------------------------------
            // E. JARAK ANTAR PERIODE
            // --------------------------------------

            worksheet.addRow([]);
            worksheet.addRow([]);
            worksheet.addRow([]);

        }


        // ==========================================
        // 8. PENGATURAN AREA CETAK
        // ==========================================

        worksheet.pageSetup.printArea =
            `A1:K${worksheet.rowCount}`;


        // ==========================================
        // 9. GENERATE FILE EXCEL
        // ==========================================

        const buffer = await workbook.xlsx.writeBuffer();

        const namaFile =
            `DAFTAR FEE RUJUKAN ${namaBulanTerpilih} ${tahun}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${namaFile}"`
        );

        res.setHeader(
            'Content-Length',
            buffer.length
        );

        return res.send(Buffer.from(buffer));


    } catch (error) {

        console.error('Error export Excel rekap periode:', error);

        req.flash(
            'error',
            'Gagal membuat file Excel. Silakan periksa log server.'
        );

        return res.redirect('/periode/rekap');

    }

});

module.exports = router;