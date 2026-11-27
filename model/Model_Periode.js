const connection = require('../config/database');

class Model_Periode {

    static async getAll() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT *
                FROM periode_fee_rujukan
                ORDER BY tahun DESC, bulan DESC, nomor_periode ASC
            `;

            connection.query(sql, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static async Store(Data) {
        return new Promise((resolve, reject) => {
            connection.query(
                'INSERT INTO periode_fee_rujukan SET ?',
                Data,
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });
    }

    static async getId(id) {
        return new Promise((resolve, reject) => {
            connection.query(
                'SELECT * FROM periode_fee_rujukan WHERE id_periode = ?',
                [id],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    // Mengambil satu objek periode, berguna untuk halaman detail.
    static async getById(id) {
        const rows = await this.getId(id);
        return rows.length > 0 ? rows[0] : null;
    }

    static async Update(id, Data) {
        return new Promise((resolve, reject) => {
            connection.query(
                'UPDATE periode_fee_rujukan SET ? WHERE id_periode = ?',
                [Data, id],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });
    }

    static async Delete(id) {
        return new Promise((resolve, reject) => {
            connection.query(
                'DELETE FROM periode_fee_rujukan WHERE id_periode = ?',
                [id],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });
    }

    static async getPaginated(limit, offset) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT *
                FROM periode_fee_rujukan
                ORDER BY tahun DESC, bulan DESC, nomor_periode ASC
                LIMIT ? OFFSET ?
            `;

            connection.query(sql, [limit, offset], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    static async getCount() {
        return new Promise((resolve, reject) => {
            connection.query(
                'SELECT COUNT(*) AS total FROM periode_fee_rujukan',
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result[0].total);
                }
            );
        });
    }

        // Mengambil rekap anggaran seluruh periode
    static async getRekap(filters = {}) {

        return new Promise((resolve, reject) => {

            const conditions = [];
            const params = [];

            // Filter tahun
            if (filters.tahun) {
                conditions.push('p.tahun = ?');
                params.push(filters.tahun);
            }

            // Filter bulan
            if (filters.bulan) {
                conditions.push('p.bulan = ?');
                params.push(filters.bulan);
            }

            const whereSQL = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';

            const sql = `
                SELECT
                    p.id_periode,
                    p.tahun,
                    p.bulan,
                    p.nomor_periode,
                    p.uang_muka,
                    p.keterangan,

                    COALESCE(t.jumlah_transaksi, 0) AS jumlah_transaksi,

                    COALESCE(t.total_fee, 0.00) AS total_fee,

                    (
                        p.uang_muka - COALESCE(t.total_fee, 0.00)
                    ) AS sisa_anggaran

                FROM periode_fee_rujukan p

                LEFT JOIN (
                    SELECT
                        id_periode,
                        COUNT(*) AS jumlah_transaksi,
                        SUM(nominal_fee) AS total_fee

                    FROM transaksi_fee_rujukan

                    WHERE status_pembayaran = 'ONSITE'
                    AND id_periode IS NOT NULL

                    GROUP BY id_periode

                ) t ON p.id_periode = t.id_periode

                ${whereSQL}

                ORDER BY
                    p.tahun DESC,
                    p.bulan DESC,
                    p.nomor_periode ASC
            `;

            connection.query(sql, params, (err, rows) => {
                if (err) {
                    return reject(err);
                }

                resolve(rows);
            });

        });
    }


    // Mengambil daftar tahun yang tersedia pada tabel periode
    static async getYears() {

        return new Promise((resolve, reject) => {

            const sql = `
                SELECT DISTINCT tahun
                FROM periode_fee_rujukan
                ORDER BY tahun DESC
            `;

            connection.query(sql, (err, rows) => {
                if (err) {
                    return reject(err);
                }

                resolve(rows);
            });

        });
    }
    
    // Mengambil rekap satu periode berdasarkan ID
    static async getRekapById(id_periode) {

        return new Promise((resolve, reject) => {

            const sql = `
                SELECT
                    p.id_periode,
                    p.tahun,
                    p.bulan,
                    p.nomor_periode,
                    p.uang_muka,
                    p.keterangan,

                    COUNT(t.id_fee) AS jumlah_transaksi,

                    COALESCE(SUM(t.nominal_fee), 0) AS total_fee,

                    (
                        p.uang_muka -
                        COALESCE(SUM(t.nominal_fee), 0)
                    ) AS sisa_anggaran

                FROM periode_fee_rujukan p

                LEFT JOIN transaksi_fee_rujukan t
                    ON p.id_periode = t.id_periode
                    AND t.status_pembayaran = 'ONSITE'

                WHERE p.id_periode = ?

                GROUP BY
                    p.id_periode,
                    p.tahun,
                    p.bulan,
                    p.nomor_periode,
                    p.uang_muka,
                    p.keterangan
            `;

            connection.query(sql, [id_periode], (err, rows) => {

                if (err) {
                    return reject(err);
                }

                resolve(rows.length > 0 ? rows[0] : null);

            });

        });
    }

    // Mengambil daftar transaksi ONSITE pada satu periode
    static async getTransaksiByPeriode(id_periode) {

        return new Promise((resolve, reject) => {

            const sql = `
                SELECT
                    t.*,

                    p.nama_perujuk,

                    r.nama_ruang,

                    d.kode_dx,
                    d.nama_kategori AS nama_kategori_dx,

                    CONCAT_WS(
                        ' - ',
                        d.kode_dx,
                        d.nama_kategori
                    ) AS nama_dx,

                    tp.nama_petugas AS nama_petugas_penerima_master,

                    tc.nama_petugas AS nama_petugas_pencair_master

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

                WHERE
                    t.id_periode = ?
                    AND t.status_pembayaran = 'ONSITE'

                ORDER BY
                    t.tanggal_mrs ASC,
                    t.id_fee ASC
            `;

            connection.query(sql, [id_periode], (err, rows) => {

                if (err) {
                    return reject(err);
                }

                resolve(rows);

            });

        });
    }

    // Mengambil transaksi ONSITE untuk kebutuhan ekspor Excel
    static async getTransaksiExportByPeriode(id_periode) {

        return new Promise((resolve, reject) => {

            const sql = `
                SELECT
                    t.id_fee,
                    t.nama_pasien,
                    CAST(t.no_rm AS CHAR) AS no_rm,
                    t.status_pasien,
                    t.tanggal_mrs,
                    t.nominal_fee,

                    p.nama_perujuk,

                    r.nama_ruang,

                    d.kode_dx,

                    tp.nama_petugas AS nama_petugas_penerima,

                    tc.nama_petugas AS nama_petugas_pencair

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

                WHERE
                    t.id_periode = ?
                    AND t.status_pembayaran = 'ONSITE'

                ORDER BY
                    t.tanggal_mrs ASC,
                    t.id_fee ASC
            `;

            connection.query(sql, [id_periode], (err, rows) => {

                if (err) {
                    return reject(err);
                }

                resolve(rows);

            });

        });
    }

}

module.exports = Model_Periode;