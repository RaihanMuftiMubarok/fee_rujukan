const connection = require('../config/database');

class Model_Petugas {

    static async getAll(){
        return new Promise((resolve, reject) => {
            connection.query('select * from master_petugas order by id_petugas asc', (err, rows) => {
                if(err){
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    static async Store(Data){
        return new Promise((resolve, reject) => {
            connection.query('insert into master_petugas set ?', Data, function(err, result){
                if(err){
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        });
    }

    static async getId(id){
        return new Promise((resolve, reject) => {
            connection.query('select * from master_petugas where id_petugas = ' + id, (err,rows) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            })
        })
    }

    static async Update(id, Data) {
        return new Promise((resolve, reject) => {
            connection.query('update master_petugas set ? where id_petugas =' + id, Data, function(err, result){
                if(err){
                    reject(err);
                    console.log(err);
                } else {
                    resolve(result);
                }
            })
        });
    }

    static async Delete(id) {
        return new Promise((resolve, reject) => {
            connection.query('delete from master_petugas where id_petugas =' + id, function(err,result){
                if(err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        });
    }

    static async getPaginated(limit, offset) {
        return new Promise((resolve, reject) => {
            connection.query(
                'SELECT * FROM master_petugas ORDER BY id_petugas ASC LIMIT ? OFFSET ?',
                [limit, offset],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }
    
    static async getCount() {
        return new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as total FROM master_petugas', (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result[0].total);
                }
            });
        });
    }

}


module.exports = Model_Petugas;