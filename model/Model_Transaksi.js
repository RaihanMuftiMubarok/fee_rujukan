
const connection = require('../config/database');

// ======================================================
// HELPER DATABASE
// ======================================================

function queryAsync(conn, sql, params = []) {
    return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

function buildFilterWhere(filters = {}) {
    const conditions = [];
    const params = [];

    // Filter OFFSITE / ONSITE
    if (filters.status_pembayaran) {
        conditions.push('t.status_pembayaran = ?');
        params.push(filters.status_pembayaran);
    }

    const tahun = filters.tahun
        ? Number(filters.tahun)
        : null;

    const bulan = filters.bulan
        ? Number(filters.bulan)
        : null;

    // Filter tahun dan bulan sekaligus
    if (tahun && bulan) {
        const tanggalAwal =
            `${tahun}-${String(bulan).padStart(2, '0')}-01`;

        const tanggalAkhirDate = new Date(
            Date.UTC(tahun, bulan, 1)
        );

        const tanggalAkhir = [
            tanggalAkhirDate.getUTCFullYear(),
            String(tanggalAkhirDate.getUTCMonth() + 1).padStart(2, '0'),
            '01'
        ].join('-');

        conditions.push(
            't.tanggal_mrs >= ? AND t.tanggal_mrs < ?'
        );

        params.push(tanggalAwal, tanggalAkhir);

    } else if (tahun) {

        // Hanya filter tahun
        conditions.push(
            't.tanggal_mrs >= ? AND t.tanggal_mrs < ?'
        );

        params.push(
            `${tahun}-01-01`,
            `${tahun + 1}-01-01`
        );

    } else if (bulan) {

        // Hanya filter bulan, mencakup semua tahun
        conditions.push('MONTH(t.tanggal_mrs) = ?');
        params.push(bulan);
    }

    const whereSQL = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    return {
        whereSQL,
        params
    };
}
function getConnection() {
    return new Promise((resolve, reject) => {
        connection.getConnection((err, conn) => {
            if (err) return reject(err);
            resolve(conn);
        });
    });
}

function createError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

// Menjalankan beberapa query dalam satu transaksi MySQL.
async function withTransaction(callback) {
    const conn = await getConnection();
    let transactionStarted = false;

    try {
        await new Promise((resolve, reject) => {
            conn.beginTransaction(err => {
                if (err) return reject(err);
                resolve();
            });
        });

        transactionStarted = true;

        const result = await callback(conn);

        await new Promise((resolve, reject) => {
            conn.commit(err => {
                if (err) return reject(err);
                resolve();
            });
        });

        transactionStarted = false;

        return result;

    } catch (error) {

        if (transactionStarted) {
            try {
                await new Promise((resolve, reject) => {
                    conn.rollback(err => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            } catch (rollbackError) {
                console.error('Gagal melakukan rollback:', rollbackError);
            }
        }

        throw error;

    } finally {
        conn.release();
    }
}

// Mengubah nominal menjadi satuan sen agar perhitungan
// DECIMAL tidak bergantung pada floating point.
function toCents(value) {
    const nominal = String(value ?? '').trim();

    if (!/^\d+(\.\d{1,2})?$/.test(nominal)) {
        throw createError(
            'ERR_NOMINAL_INVALID',
            'Nominal fee atau uang muka tidak valid.'
        );
    }

    const [whole, decimal = ''] = nominal.split('.');
    const cents = BigInt(whole) * 100n +
        BigInt((decimal + '00').slice(0, 2));

    return cents;
}

// Memastikan sisa anggaran setelah pencairan tetap lebih dari nol.
async function checkBudget(conn, id_periode, nominal_fee) {

    const periode = await queryAsync(
        conn,
        `SELECT id_periode, uang_muka
         FROM periode_fee_rujukan
         WHERE id_periode = ?
         FOR UPDATE`,
        [id_periode]
    );

    if (periode.length === 0) {
        throw createError(
            'ERR_PERIODE_NOT_FOUND',
            'Periode anggaran tidak ditemukan.'
        );
    }

    const rekap = await queryAsync(
        conn,
        `SELECT COALESCE(SUM(nominal_fee), 0) AS total_terpakai
         FROM transaksi_fee_rujukan
         WHERE id_periode = ?
         AND status_pembayaran = 'ONSITE'`,
        [id_periode]
    );

    const uangMuka = toCents(periode[0].uang_muka);
    const totalTerpakai = toCents(rekap[0].total_terpakai || 0);
    const feeBaru = toCents(nominal_fee);

    if (feeBaru <= 0n) {
        throw createError(
            'ERR_NOMINAL_INVALID',
            'Nominal fee harus lebih besar dari nol.'
        );
    }

    if (uangMuka - totalTerpakai - feeBaru <= 0n) {
        throw createError(
            'ERR_SALDO_TIDAK_CUKUP',
            'Saldo periode tidak mencukupi. Sisa anggaran harus tetap lebih dari Rp0.'
        );
    }

    return true;
}


// ======================================================
// MODEL TRANSAKSI
// ======================================================

class Model_Transaksi {

    // --------------------------------------------------
    // Mengambil semua transaksi dengan JOIN master
    // --------------------------------------------------

    static async getAll() {

        const sql = `
            SELECT
                t.*,

                p.nama_perujuk,

                r.nama_ruang,

                d.kode_dx,
                d.nama_kategori AS nama_kategori_dx,
                CONCAT_WS(' - ', d.kode_dx, d.nama_kategori) AS nama_dx,

                tp.nama_petugas AS nama_petugas_penerima_master,

                tc.nama_petugas AS nama_petugas_pencair_master,

                pr.tahun,
                pr.bulan,
                pr.nomor_periode

            FROM transaksi_fee_rujukan t

            LEFT JOIN master_perujuk p
                ON t.id_perujuk = p.id_perujuk

            LEFT JOIN master_ruang r
                ON t.id_ruang = r.id_ruang

            LEFT JOIN master_dx d
                ON t.id_dx = d.id_dx

            LEFT JOIN master_petugas tp
                ON t.id_petugas_penerima = tp.id_petugas

            LEFT JOIN master_petugas tc
                ON t.id_petugas_pencair = tc.id_petugas

            LEFT JOIN periode_fee_rujukan pr
                ON t.id_periode = pr.id_periode

            ORDER BY t.tanggal_mrs DESC, t.id_fee DESC
        `;

        return queryAsync(connection, sql);
    }


    // --------------------------------------------------
    // Menyimpan transaksi baru
    // Mendukung OFFSITE dan langsung ONSITE
    // --------------------------------------------------

    static async Store(Data) {

        if (!['OFFSITE', 'ONSITE'].includes(Data.status_pembayaran)) {
            throw createError(
                'ERR_STATUS_INVALID',
                'Status pembayaran tidak valid.'
            );
        }

        toCents(Data.nominal_fee);

        // Jika OFFSITE, tidak memerlukan periode dan petugas pencair.
        if (Data.status_pembayaran === 'OFFSITE') {

            const dataOffsite = {
                ...Data,
                id_periode: null,
                id_petugas_pencair: null
            };

            return queryAsync(
                connection,
                'INSERT INTO transaksi_fee_rujukan SET ?',
                [dataOffsite]
            );
        }

        // Jika langsung ONSITE, periode dan petugas pencair wajib ada.
        if (!Data.id_periode || !Data.id_petugas_pencair) {
            throw createError(
                'ERR_DATA_PENCAIRAN',
                'Periode dan petugas pencair wajib dipilih.'
            );
        }

        // Pemeriksaan saldo dan INSERT harus berada
        // dalam transaksi MySQL yang sama.
        return withTransaction(async conn => {

            await checkBudget(
                conn,
                Data.id_periode,
                Data.nominal_fee
            );

            const result = await queryAsync(
                conn,
                'INSERT INTO transaksi_fee_rujukan SET ?',
                [Data]
            );

            return result;
        });
    }

    

    // --------------------------------------------------
    // Mengambil transaksi berdasarkan ID
    // --------------------------------------------------

    static async getId(id) {

        return queryAsync(
            connection,
            'SELECT * FROM transaksi_fee_rujukan WHERE id_fee = ?',
            [id]
        );
    }


    static async getById(id) {

        const rows = await this.getId(id);

        return rows.length > 0 ? rows[0] : null;
    }


    // --------------------------------------------------
    // Update data non-keuangan
    // Tidak boleh mengubah nominal, periode, dan status.
    // --------------------------------------------------

    static async Update(id, Data) {

        const protectedFields = [
            'nominal_fee',
            'status_pembayaran',
            'id_periode',
            'id_petugas_pencair'
        ];

        const hasProtectedField = Object.keys(Data).some(field =>
            protectedFields.includes(field)
        );

        if (hasProtectedField) {
            throw createError(
                'ERR_UPDATE_FINANSIAL',
                'Data nominal dan pencairan tidak boleh diubah melalui Update biasa.'
            );
        }

        return queryAsync(
            connection,
            'UPDATE transaksi_fee_rujukan SET ? WHERE id_fee = ?',
            [Data, id]
        );
    }


    // --------------------------------------------------
    // Mencairkan transaksi OFFSITE menjadi ONSITE
    // Pemeriksaan status dan saldo dilakukan atomik.
    // --------------------------------------------------

    static async Cairkan(id_fee, id_periode, id_petugas_pencair) {

        if (!id_periode || !id_petugas_pencair) {
            throw createError(
                'ERR_DATA_PENCAIRAN',
                'Periode dan petugas pencair wajib dipilih.'
            );
        }

        return withTransaction(async conn => {

            // Kunci transaksi agar tidak dapat dicairkan dua kali.
            const transaksi = await queryAsync(
                conn,
                `SELECT id_fee, nominal_fee, status_pembayaran
                 FROM transaksi_fee_rujukan
                 WHERE id_fee = ?
                 FOR UPDATE`,
                [id_fee]
            );

            if (transaksi.length === 0) {
                throw createError(
                    'ERR_TRANSAKSI_NOT_FOUND',
                    'Data transaksi tidak ditemukan.'
                );
            }

            if (transaksi[0].status_pembayaran !== 'OFFSITE') {
                throw createError(
                    'ERR_TRANSAKSI_SUDAH_CAIR',
                    'Transaksi ini sudah dicairkan sebelumnya.'
                );
            }

            // Kunci periode, hitung total, lalu validasi saldo.
            await checkBudget(
                conn,
                id_periode,
                transaksi[0].nominal_fee
            );

            // Ubah status setelah semua pemeriksaan berhasil.
            const result = await queryAsync(
                conn,
                `UPDATE transaksi_fee_rujukan
                 SET status_pembayaran = 'ONSITE',
                     id_periode = ?,
                     id_petugas_pencair = ?
                 WHERE id_fee = ?
                 AND status_pembayaran = 'OFFSITE'`,
                [id_periode, id_petugas_pencair, id_fee]
            );

            if (result.affectedRows !== 1) {
                throw createError(
                    'ERR_TRANSAKSI_SUDAH_CAIR',
                    'Status transaksi sudah berubah. Silakan muat ulang halaman.'
                );
            }

            return result;
        });
    }


    // --------------------------------------------------
    // Menghapus transaksi
    // Hanya transaksi OFFSITE yang boleh dihapus.
    // --------------------------------------------------

    static async Delete(id) {

        return queryAsync(
            connection,
            `DELETE FROM transaksi_fee_rujukan
             WHERE id_fee = ?
             AND status_pembayaran = 'OFFSITE'`,
            [id]
        );
    }


    // --------------------------------------------------
    // Pagination
    // --------------------------------------------------

    static async getPaginated(limit, offset) {

        const sql = `
                SELECT
                    t.*,

                    p.nama_perujuk,

                    r.nama_ruang,

                    d.kode_dx,
                    d.nama_kategori AS nama_kategori_dx,
                    CONCAT_WS(' - ', d.kode_dx, d.nama_kategori) AS nama_dx,

                    tp.nama_petugas AS nama_petugas_penerima_master,

                    tc.nama_petugas AS nama_petugas_pencair_master,

                    pr.tahun,
                    pr.bulan,
                    pr.nomor_periode

                FROM transaksi_fee_rujukan t

                LEFT JOIN master_perujuk p
                    ON t.id_perujuk = p.id_perujuk

                LEFT JOIN master_ruang r
                    ON t.id_ruang = r.id_ruang

                LEFT JOIN master_dx d
                    ON t.id_dx = d.id_dx

                LEFT JOIN master_petugas tp
                    ON t.id_petugas_penerima = tp.id_petugas

                LEFT JOIN master_petugas tc
                    ON t.id_petugas_pencair = tc.id_petugas

                LEFT JOIN periode_fee_rujukan pr
                    ON t.id_periode = pr.id_periode

                ORDER BY t.tanggal_mrs DESC, t.id_fee DESC

            LIMIT ? OFFSET ?
        `;

        return queryAsync(
            connection,
            sql,
            [limit, offset]
        );
    }


    // --------------------------------------------------
    // Menghitung total transaksi
    // --------------------------------------------------

    static async getCount() {

        const result = await queryAsync(
            connection,
            'SELECT COUNT(*) AS total FROM transaksi_fee_rujukan'
        );

        return result[0].total;
    }

    static async getFiltered(filters = {}, limit = 10, offset = 0) {

    const { whereSQL, params } = buildFilterWhere(filters);

    const sql = `
        SELECT
            t.*,

            p.nama_perujuk,

            r.nama_ruang,

            d.kode_dx,
            d.nama_kategori AS nama_kategori_dx,
            CONCAT_WS(' - ', d.kode_dx, d.nama_kategori) AS nama_dx,

            tp.nama_petugas AS nama_petugas_penerima_master,

            tc.nama_petugas AS nama_petugas_pencair_master,

            pr.tahun,
            pr.bulan,
            pr.nomor_periode

        FROM transaksi_fee_rujukan t

        LEFT JOIN master_perujuk p
            ON t.id_perujuk = p.id_perujuk

        LEFT JOIN master_ruang r
            ON t.id_ruang = r.id_ruang

        LEFT JOIN master_dx d
            ON t.id_dx = d.id_dx

        LEFT JOIN master_petugas tp
            ON t.id_petugas_penerima = tp.id_petugas

        LEFT JOIN master_petugas tc
            ON t.id_petugas_pencair = tc.id_petugas

        LEFT JOIN periode_fee_rujukan pr
            ON t.id_periode = pr.id_periode

        ${whereSQL}

        ORDER BY t.tanggal_mrs DESC, t.id_fee DESC

        LIMIT ? OFFSET ?
    `;

    return queryAsync(
        connection,
        sql,
        [...params, limit, offset]
    );
}
static async getCountFiltered(filters = {}) {

    const { whereSQL, params } = buildFilterWhere(filters);

    const sql = `
        SELECT COUNT(*) AS total
        FROM transaksi_fee_rujukan t
        ${whereSQL}
    `;

    const result = await queryAsync(
        connection,
        sql,
        params
    );

    return Number(result[0].total);
}

static async getAvailableYears() {

    const sql = `
        SELECT DISTINCT YEAR(tanggal_mrs) AS tahun
        FROM transaksi_fee_rujukan
        WHERE tanggal_mrs IS NOT NULL
        ORDER BY tahun DESC
    `;

    return queryAsync(connection, sql);
}

}

module.exports = Model_Transaksi;
