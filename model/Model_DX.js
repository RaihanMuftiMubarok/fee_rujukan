const connection = require('../config/database');

class Model_DX {

    static async getAll(){
        return new Promise((resolve, reject) => {
            connection.query('select * from master_dx order by id_dx asc', (err, rows) => {
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
            connection.query('insert into master_dx set ?', Data, function(err, result){
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
            connection.query('select * from master_dx where id_dx = ' + id, (err,rows) => {
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
            connection.query('update master_dx set ? where id_dx =' + id, Data, function(err, result){
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
            connection.query('delete from master_dx where id_dx =' + id, function(err,result){
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
                'SELECT * FROM master_dx ORDER BY id_dx ASC LIMIT ? OFFSET ?',
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
            connection.query('SELECT COUNT(*) as total FROM master_dx', (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result[0].total);
                }
            });
        });
    }

}


module.exports = Model_DX;