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

}

module.exports = Model_Periode;