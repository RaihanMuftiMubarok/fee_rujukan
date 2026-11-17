// let mysql = require('mysql');
// let connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'fee_rujukan',
// })

// connection.connect((error) => {
//   if (error) {
//     console.log(error);
//   } else {
//     console.log('Koneksi Berhasil');
//   }
// })

// module.exports = connection; 

const mysql = require('mysql');

const connection = mysql.createPool({
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,

    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fee_rujukan'
});

// Tes koneksi database
connection.getConnection((error, conn) => {
    if (error) {
        console.error('Koneksi database gagal:', error);
        return;
    }

    console.log('Koneksi database berhasil');

    // Kembalikan koneksi ke pool
    conn.release();
});

module.exports = connection;