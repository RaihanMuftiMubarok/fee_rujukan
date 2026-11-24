
const express = require('express');
const router = express.Router();

const Model_Transaksi = require('../model/Model_Transaksi');
const connection = require('../config/database');

const BASE_URL = '/transaksi_fee_rujukan';


// ======================================================
// HELPER ROUTE
// ======================================================

function queryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function createValidationError(message) {
    const error = new Error(message);
    error.code = 'ERR_VALIDATION';
    return error;
}

// Validasi ID tanpa mengubah BIGINT menjadi Number.
function normalizeId(value, label, required = false) {
    const raw = String(value ?? '').trim();

    if (!raw) {
        if (required) {
            throw createValidationError(`${label} wajib dipilih.`);
        }

        return null;
    }

    if (!/^[1-9]\d*$/.test(raw)) {
        throw createValidationError(`${label} tidak valid.`);
    }

    return raw;
}

function validDateOnly(value) {
    if (!value) return true;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return !isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

// Mengambil satu data master yang masih aktif.
async function getActiveRow(sql, id, label) {
    if (!id) return null;

    const rows = await queryAsync(sql, [id]);

    if (rows.length === 0) {
        throw createValidationError(
            `${label} tidak ditemukan atau sudah tidak aktif.`
        );
    }

    return rows[0];
}

// Pesan error yang aman ditampilkan kepada pengguna.
function getPublicError(error, defaultMessage) {

    const messages = {
        ERR_VALIDATION: error.message,
        ERR_NOMINAL_INVALID: 'Nominal fee tidak valid.',
        ERR_STATUS_INVALID: 'Status pembayaran tidak valid.',
        ERR_DATA_PENCAIRAN: 'Periode dan petugas pencair wajib dipilih.',
        ERR_PERIODE_NOT_FOUND: 'Periode anggaran tidak ditemukan.',
        ERR_SALDO_TIDAK_CUKUP:
            'Saldo periode tidak mencukupi. Sisa anggaran harus tetap lebih dari Rp0.',
        ERR_TRANSAKSI_NOT_FOUND: 'Data transaksi tidak ditemukan.',
        ERR_TRANSAKSI_SUDAH_CAIR:
            'Transaksi sudah dicairkan sebelumnya atau statusnya telah berubah.',
        ERR_UPDATE_FINANSIAL:
            'Data nominal dan pencairan tidak boleh diubah melalui proses update biasa.'
    };

    return messages[error.code] || defaultMessage;
}


// ======================================================
// 1. HALAMAN INDEX TRANSAKSI
// ======================================================

router.get('/', async (req, res, next) => {
    try {

        // ==========================================
        // 1. Validasi filter dari URL
        // ==========================================

        let status_pembayaran = String(
            req.query.status_pembayaran ?? ''
        );

        if (!['OFFSITE', 'ONSITE'].includes(status_pembayaran)) {
            status_pembayaran = '';
        }

        let tahun = String(req.query.tahun ?? '');

        if (!/^\d{4}$/.test(tahun) ||
            Number(tahun) < 2000 ||
            Number(tahun) > 2100) {
            tahun = '';
        }

        let bulan = String(req.query.bulan ?? '');

        if (
            bulan !== '' &&
            (!/^\d{1,2}$/.test(bulan) ||
             Number(bulan) < 1 ||
             Number(bulan) > 12)
        ) {
            bulan = '';
        }

        const filters = {
            status_pembayaran,
            tahun,
            bulan
        };


        // ==========================================
        // 2. Pagination
        // ==========================================

        const limit = 10;

        let currentPage = Number.parseInt(req.query.page, 10);

        if (!Number.isInteger(currentPage) || currentPage < 1) {
            currentPage = 1;
        }

        // Hitung total data sesuai filter
        const totalData =
            await Model_Transaksi.getCountFiltered(filters);

        const totalPages = Math.max(
            1,
            Math.ceil(totalData / limit)
        );

        // Jika nomor halaman melebihi total halaman
        currentPage = Math.min(currentPage, totalPages);

        const offset = (currentPage - 1) * limit;

        // Ambil data sesuai filter dan halaman
        const transaksi = await Model_Transaksi.getFiltered(
            filters,
            limit,
            offset
        );


        // ==========================================
        // 3. Data pilihan dropdown
        // ==========================================

        const periode = await queryAsync(
            `SELECT *
             FROM periode_fee_rujukan
             ORDER BY tahun DESC, bulan DESC, nomor_periode DESC`
        );

        const petugas = await queryAsync(
            `SELECT *
             FROM master_petugas
             WHERE status_aktif = 1
             ORDER BY nama_petugas ASC`
        );

        const tahunList =
            await Model_Transaksi.getAvailableYears();


        // ==========================================
        // 4. Query string untuk pagination
        //    agar filter tidak hilang
        // ==========================================

        const queryParams = new URLSearchParams();

        if (filters.status_pembayaran) {
            queryParams.set(
                'status_pembayaran',
                filters.status_pembayaran
            );
        }

        if (filters.bulan) {
            queryParams.set('bulan', filters.bulan);
        }

        if (filters.tahun) {
            queryParams.set('tahun', filters.tahun);
        }

        const filterQuery = queryParams.toString();


        // ==========================================
        // 5. Kirim ke view
        // ==========================================

        res.render('transaksi_fee_rujukan/index', {

            data: transaksi,

            listPeriode: periode,
            listPetugas: petugas,
            tahunList,

            filters,
            filterQuery,

            currentPage,
            totalPages,
            totalData,
            limit,

            success: req.flash('success'),
            error: req.flash('error')

        });

    } catch (error) {

        console.error('Error halaman index transaksi:', error);

        next(error);
    }
});


// ======================================================
// 2. HALAMAN CREATE TRANSAKSI
// ======================================================

router.get('/create', async (req, res, next) => {
    try {

        const perujuk = await queryAsync(
            `SELECT *
             FROM master_perujuk
             WHERE status_aktif = 1
             ORDER BY nama_perujuk ASC`
        );

        const ruang = await queryAsync(
            `SELECT *
             FROM master_ruang
             WHERE status_aktif = 1
             ORDER BY nama_ruang ASC`
        );

        const dx = await queryAsync(
            `SELECT *
             FROM master_dx
             WHERE status_aktif = 1
             ORDER BY kode_dx ASC`
        );

        const petugas = await queryAsync(
            `SELECT *
             FROM master_petugas
             WHERE status_aktif = 1
             ORDER BY nama_petugas ASC`
        );

        const periode = await queryAsync(
            `SELECT *
             FROM periode_fee_rujukan
             ORDER BY tahun DESC, bulan DESC, nomor_periode DESC`
        );

        res.render('transaksi_fee_rujukan/create', {
            perujuk,
            ruang,
            dx,
            petugas,
            periode,

            error: req.flash('error')
        });

    } catch (error) {
        console.error('Error load form create transaksi:', error);
        next(error);
    }
});


// ======================================================
// 3. STORE TRANSAKSI
// Mendukung OFFSITE dan langsung ONSITE
// ======================================================

router.post('/store', async (req, res) => {
    try {

        const nama_pasien = String(
            req.body.nama_pasien ?? ''
        ).trim();

        const no_rm = String(
            req.body.no_rm ?? ''
        ).trim();

        const status_pasien = String(
            req.body.status_pasien ?? ''
        ).trim().toUpperCase();

        const tanggal_mrs = String(
            req.body.tanggal_mrs ?? ''
        ).trim();

        const status_pembayaran = String(
            req.body.status_pembayaran ?? ''
        ).trim().toUpperCase();

        const nominal_fee = String(
            req.body.nominal_fee ?? ''
        ).trim();

        const keterangan = String(
            req.body.keterangan ?? ''
        ).trim();


        // ----------------------------------------------
        // Validasi data dasar
        // ----------------------------------------------

        if (!nama_pasien) {
            throw createValidationError('Nama pasien wajib diisi.');
        }

        if (nama_pasien.length > 150) {
            throw createValidationError('Nama pasien maksimal 150 karakter.');
        }

        if (no_rm.length > 50) {
            throw createValidationError('Nomor RM maksimal 50 karakter.');
        }

        if (!['OFFSITE', 'ONSITE'].includes(status_pembayaran)) {
            throw createValidationError('Status pembayaran tidak valid.');
        }

        // Status pasien sesuai pilihan pada form.
        if (
            status_pasien &&
            !['BPJS', 'UMUM', 'BPP'].includes(status_pasien)
        ) {
            throw createValidationError('Status pasien tidak valid.');
        }

        // Nominal DECIMAL(15,2), wajib positif.
        if (
            !/^\d{1,13}(\.\d{1,2})?$/.test(nominal_fee) ||
            Number(nominal_fee) <= 0
        ) {
            throw createValidationError(
                'Nominal fee harus berupa angka lebih besar dari nol.'
            );
        }

        if (!validDateOnly(tanggal_mrs)) {
            throw createValidationError('Tanggal MRS tidak valid.');
        }


        // ----------------------------------------------
        // Validasi ID dari form
        // ----------------------------------------------

        const id_perujuk = normalizeId(
            req.body.id_perujuk,
            'Perujuk',
            true
        );

        const id_ruang = normalizeId(
            req.body.id_ruang,
            'Ruang'
        );

        const id_dx = normalizeId(
            req.body.id_dx,
            'Diagnosis'
        );

        const id_petugas_penerima = normalizeId(
            req.body.id_petugas_penerima,
            'Petugas penerima'
        );


        // ----------------------------------------------
        // Validasi master perujuk
        // ----------------------------------------------

        const perujuk = await getActiveRow(
            `SELECT id_perujuk, nama_perujuk, nama_perujuk_excel
             FROM master_perujuk
             WHERE id_perujuk = ?
             AND status_aktif = 1`,
            id_perujuk,
            'Perujuk'
        );


        // ----------------------------------------------
        // Validasi master ruang
        // ----------------------------------------------

        const ruang = await getActiveRow(
            `SELECT id_ruang, nama_ruang
             FROM master_ruang
             WHERE id_ruang = ?
             AND status_aktif = 1`,
            id_ruang,
            'Ruang'
        );


        // ----------------------------------------------
        // Validasi master diagnosis
        // ----------------------------------------------

        const dx = await getActiveRow(
            `SELECT id_dx, kode_dx, nama_kategori
             FROM master_dx
             WHERE id_dx = ?
             AND status_aktif = 1`,
            id_dx,
            'Diagnosis'
        );


        // ----------------------------------------------
        // Validasi petugas penerima
        // ----------------------------------------------

        const petugasPenerima = await getActiveRow(
            `SELECT id_petugas, nama_petugas
             FROM master_petugas
             WHERE id_petugas = ?
             AND status_aktif = 1`,
            id_petugas_penerima,
            'Petugas penerima'
        );


        // ----------------------------------------------
        // Persiapkan data pencairan
        // ----------------------------------------------

        let id_periode = null;
        let id_petugas_pencair = null;
        let petugasPencair = null;

        if (status_pembayaran === 'ONSITE') {

            id_periode = normalizeId(
                req.body.id_periode,
                'Periode',
                true
            );

            id_petugas_pencair = normalizeId(
                req.body.id_petugas_pencair,
                'Petugas pencair',
                true
            );

            petugasPencair = await getActiveRow(
                `SELECT id_petugas, nama_petugas
                 FROM master_petugas
                 WHERE id_petugas = ?
                 AND status_aktif = 1`,
                id_petugas_pencair,
                'Petugas pencair'
            );
        }


        // ----------------------------------------------
        // Data yang akan disimpan
        // ----------------------------------------------

        const Data = {
            nama_pasien,
            no_rm: no_rm || null,
            status_pasien: status_pasien || null,

            id_perujuk,
            id_ruang,
            tanggal_mrs: tanggal_mrs || null,
            id_dx,

            nominal_fee,

            id_petugas_penerima,

            status_pembayaran,

            id_periode,
            id_petugas_pencair,

            keterangan: keterangan || null
        };


        // Store akan melakukan pemeriksaan saldo
        // jika status_pembayaran adalah ONSITE.
        await Model_Transaksi.Store(Data);

        req.flash(
            'success',
            'Berhasil menyimpan data transaksi fee rujukan.'
        );

        return res.redirect(BASE_URL);

    } catch (error) {

        console.error('Error store transaksi:', error);

        req.flash(
            'error',
            getPublicError(error, 'Gagal menyimpan transaksi fee rujukan.')
        );

        return res.redirect(`${BASE_URL}/create`);
    }
});


// ======================================================
// 4. PROSES CAIRKAN OFFSITE MENJADI ONSITE
// ======================================================

router.post('/cairkan/:id', async (req, res) => {

    const id_fee = String(req.params.id ?? '').trim();

    try {

        if (!/^[1-9]\d*$/.test(id_fee)) {
            throw createValidationError('ID transaksi tidak valid.');
        }

        const id_periode = normalizeId(
            req.body.id_periode,
            'Periode',
            true
        );

        const id_petugas_pencair = normalizeId(
            req.body.id_petugas_pencair,
            'Petugas pencair',
            true
        );


        // Pastikan petugas masih aktif.
        await getActiveRow(
            `SELECT id_petugas
             FROM master_petugas
             WHERE id_petugas = ?
             AND status_aktif = 1`,
            id_petugas_pencair,
            'Petugas pencair'
        );


        // Model akan:
        // 1. Mengunci transaksi.
        // 2. Memastikan status masih OFFSITE.
        // 3. Mengunci periode.
        // 4. Memeriksa sisa anggaran.
        // 5. Mengubah status menjadi ONSITE.
        // 6. COMMIT jika semua berhasil.

        await Model_Transaksi.Cairkan(
            id_fee,
            id_periode,
            id_petugas_pencair
        );

        req.flash(
            'success',
            'Fee rujukan berhasil dicairkan dan status berubah menjadi ONSITE.'
        );

        return res.redirect(BASE_URL);

    } catch (error) {

        console.error('Error cairkan fee:', error);

        req.flash(
            'error',
            getPublicError(error, 'Gagal memproses pencairan fee.')
        );

        return res.redirect(BASE_URL);
    }
});


// ======================================================
// 5. HAPUS TRANSAKSI
// Hanya transaksi OFFSITE
// ======================================================

router.post('/delete/:id', async (req, res) => {

    const id_fee = String(req.params.id ?? '').trim();

    try {

        if (!/^[1-9]\d*$/.test(id_fee)) {
            throw createValidationError('ID transaksi tidak valid.');
        }

        const result = await Model_Transaksi.Delete(id_fee);

        if (result.affectedRows === 0) {

            const transaksi = await Model_Transaksi.getById(id_fee);

            if (!transaksi) {
                req.flash('error', 'Data transaksi tidak ditemukan.');
            } else {
                req.flash(
                    'error',
                    'Transaksi yang sudah ONSITE tidak dapat dihapus.'
                );
            }

            return res.redirect(BASE_URL);
        }

        req.flash(
            'success',
            'Berhasil menghapus transaksi OFFSITE.'
        );

        return res.redirect(BASE_URL);

    } catch (error) {

        console.error('Error delete transaksi:', error);

        req.flash(
            'error',
            getPublicError(error, 'Gagal menghapus data transaksi.')
        );

        return res.redirect(BASE_URL);
    }
});


module.exports = router;
