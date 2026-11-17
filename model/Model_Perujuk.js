const connection = require('../config/database');

class Model_Perujuk {

    static async getAll(){
        return new Promise((resolve, reject) => {
            connection.query('select * from master_perujuk order by id_perujuk asc', (err, rows) => {
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
            connection.query('insert into master_perujuk set ?', Data, function(err, result){
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
            connection.query('select * from master_perujuk where id_perujuk = ' + id, (err,rows) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            })
        })
    }

    // static async Update(id, Data) {
    //     return new Promise((resolve, reject) => {
    //         connection.query('update master_perujuk set ? where id_perujuk =' + id, Data, function(err, result){
    //             if(err){
    //                 reject(err);
    //                 console.log(err);
    //             } else {
    //                 resolve(result);
    //             }
    //         })
    //     });
    // }
    static async Update(id, Data) {
    return new Promise((resolve, reject) => {
        connection.query(
            'UPDATE master_perujuk SET ? WHERE id_perujuk = ?',
            [Data, id],
            function (err, result) {
                if (err) {
                    console.error("Model_Perujuk.Update error:", err);
                    return reject(err);
                }

                resolve(result);
            }
        );
    });
}

    static async Delete(id) {
        return new Promise((resolve, reject) => {
            connection.query('delete from master_perujuk where id_perujuk =' + id, function(err,result){
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
                'SELECT * FROM master_perujuk ORDER BY id_perujuk ASC LIMIT ? OFFSET ?',
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
            connection.query('SELECT COUNT(*) as total FROM master_perujuk', (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result[0].total);
                }
            });
        });
    }

}


module.exports = Model_Perujuk;