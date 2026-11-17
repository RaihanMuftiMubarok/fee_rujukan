const connection = require('../config/database');

class Model_Ruang {

    static async getAll(){
        return new Promise((resolve, reject) => {
            connection.query('select * from master_ruang order by id_ruang asc', (err, rows) => {
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
            connection.query('insert into master_ruang set ?', Data, function(err, result){
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
            connection.query('select * from master_ruang where id_ruang = ' + id, (err,rows) => {
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
            connection.query('update master_ruang set ? where id_ruang =' + id, Data, function(err, result){
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
            connection.query('delete from master_ruang where id_ruang =' + id, function(err,result){
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
                'SELECT * FROM master_ruang ORDER BY id_ruang ASC LIMIT ? OFFSET ?',
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
            connection.query('SELECT COUNT(*) as total FROM master_ruang', (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result[0].total);
                }
            });
        });
    }

}


module.exports = Model_Ruang;