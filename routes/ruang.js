const express = require("express");
const router = express.Router();
const Model_Ruang = require('../model/Model_Ruang.js');
const Model_Users = require('../model/Model_Users.js');
const fs = require('fs');
const multer = require('multer');
const path = require('path');



const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/anggota_bpd')
    },
    filename: (req, file, cb) => {
        console.log(file)
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage
})

router.get('/', async (req, res, next) => {
    try {
        // let id = req.session.userId;
        // let Data = await Model_Users.getId(id);
        // let page = parseInt(req.query.page) || 1;  // halaman aktif (default 1)
        // let limit = 10;                            // data per halaman
        // let offset = (page - 1) * limit;
        let rows = await Model_Ruang.getAll();
        // let rows = await Model_Ruang.getPaginated(limit, offset);
        // let total = await Model_Ruang.getCount();
        // let totalPages = Math.ceil(total / limit);

        res.render('ruang/index', {
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

router.get('/users', async function (req, res, next) {
    try {
        let rows = await Model_Ruang.getAll();
        res.render('anggota_bpd/users/index', {
            data: rows,
            user: {
                nama: req.session.nama,
                foto: req.session.foto,
                role: req.session.role,
            },
        });
    } catch (error) {
        console.error("Error:", error);
        req.flash('invalid', 'Terjadi kesalahan saat memuat data anggota_bpd');
        res.redirect('/anggota_bpd');
    }
});




router.get('/create', async function (req, res, next) {
    try {
        // let level_users = req.session.level;
        let id = req.session.userId;
        let Data = await Model_Ruang.getAll();
        // if(Data[0].level_users == "2") {
        res.render('ruang/create', {
            nama_ruang: '',
            keterangan: '',
            
            status_aktif: '',
            
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

router.post('/store', async function (req, res, next) {
    try {
        let { nama_ruang,
            keterangan,
            
            
            status_aktif,
            } = req.body;

        let Data = {
            nama_ruang,
            keterangan,
            
            
            status_aktif,
            
        }

        await Model_Ruang.Store(Data);
        req.flash('success', 'Berhasil menyimpan data');
        res.redirect('/ruang');
    } catch (error) {
        req.flash('error', 'Terjadi kesalahan pada fungsi');
        console.error("Error terjadi di:");
        console.error(error.stack);
        res.redirect('/ruang');
    }
});



router.get("/edit/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        let rows = await Model_Ruang.getId(id);
        let rows2 = await Model_Ruang.getAll();
        if (rows.length > 0) {
            res.render("ruang/edit", {
                id: id,
                data: rows[0],
                data_ruang: rows2,
            });
        } else {
            req.flash("error", "ruang not found");
            res.redirect("/ruang");
        }
    } catch (error) {
        next(error);
    }
});


router.post("/update/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Validasi ID dari URL.
        if (!Number.isInteger(id) || id <= 0) {
            req.flash("error", "ID ruang tidak valid.");
            return res.redirect("/ruang");
        }

        // Ambil data dari form edit.
        const nama_ruang = String(
            req.body.nama_ruang ?? ""
        ).trim();


        const keterangan = String(
            req.body.keterangan ?? ""
        ).trim();


        const statusRaw = String(
            req.body.status_aktif ?? ""
        );

        // Validasi kolom wajib.
        if (!nama_ruang) {
            req.flash("error", "Nama ruang wajib diisi.");
            return res.redirect(`/ruang/edit/${id}`);
        }


        if (!["0", "1"].includes(statusRaw)) {
            req.flash("error", "Status ruang tidak valid.");
            return res.redirect(`/ruang/edit/${id}`);
        }

        if (keterangan.length > 30) {
            req.flash("error", "Nomor telepon maksimal 30 karakter.");
            return res.redirect(`/ruang/edit/${id}`);
        }

        // Nilai kosong disimpan sebagai NULL pada kolom opsional.
        const Data = {
            nama_ruang: nama_ruang,
            keterangan: keterangan || null,

            status_aktif: Number(statusRaw)
        };

        // Sengaja tidak mengubah nama_asli_excel dan id_instansi.
        // Kedua kolom tersebut tidak diedit melalui form ini.
        console.log("ID ruang yang diperbarui:", id);
        console.log("Data update ruang:", Data);

        await Model_Ruang.Update(id, Data);

        req.flash("success", "Berhasil mengupdate data ruang.");
        return res.redirect("/ruang");

    } catch (error) {
        console.error("Error update data ruang:", error);

        req.flash(
            "error",
            "Gagal mengupdate data ruang. Periksa log server."
        );

        return res.redirect("/ruang");
    }
});

router.get('/delete/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        await Model_Ruang.Delete(id);
        req.flash('success', 'Berhasil menghapus data ruang');
        res.redirect('/ruang');
    } catch (error) {
        req.flash("error", "Gagal menghapus data ruang");
        res.redirect("/ruang");
    }
});

router.get('/detail/:id_ruang', async (req, res) => {
    try {
        const id = req.params.id_ruang;
        const ruang = await Model_Ruang.getById(id);

        if (!ruang) {
            req.flash('invalid', 'ruang tidak ditemukan');
            return res.redirect('/users');
        }

        res.render('ruang/users/detail', {
            ruang,
            recentPosts,
            user: {
                nama: req.session.nama,
                foto: req.session.foto,
                role: req.session.role,
            },
        });

    } catch (err) {
        console.error(err);
        req.flash('invalid', 'Terjadi kesalahan saat memuat ruang');
        res.redirect('/users');
    }
});



module.exports = router;