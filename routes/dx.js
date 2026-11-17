const express = require("express");
const router = express.Router();
const Model_DX = require('../model/Model_DX.js');
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
        let rows = await Model_DX.getAll();
        // let rows = await Model_DX.getPaginated(limit, offset);
        // let total = await Model_DX.getCount();
        // let totalPages = Math.ceil(total / limit);

        res.render('dx/index', {
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
        let rows = await Model_DX.getAll();
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
        let Data = await Model_DX.getAll();
        // if(Data[0].level_users == "2") {
        res.render('dx/create', {
            kode_dx: '',
            nama_kategori: '',
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
        let { 
            kode_dx,
            nama_kategori,
            keterangan,
            status_aktif,
            } = req.body;

        let Data = {
            kode_dx,
            nama_kategori,
            keterangan,
            
            
            status_aktif,
            
        }

        await Model_DX.Store(Data);
        req.flash('success', 'Berhasil menyimpan data');
        res.redirect('/dx');
    } catch (error) {
        req.flash('error', 'Terjadi kesalahan pada fungsi');
        console.error("Error terjadi di:");
        console.error(error.stack);
        res.redirect('/dx');
    }
});



router.get("/edit/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        let rows = await Model_DX.getId(id);
        let rows2 = await Model_DX.getAll();
        if (rows.length > 0) {
            res.render("dx/edit", {
                id: id,
                data: rows[0],
                data_dx: rows2,
            });
        } else {
            req.flash("error", "dx not found");
            res.redirect("/dx");
        }
    } catch (error) {
        next(error);
    }
});


// router.post("/update/:id", async (req, res, next) => {
//     try {
//         const id = req.params.id;

//         let {
//             kode_dx,
//             nama_kategori,
//             keterangan,
//             status_aktif
//         } = req.body;



//         let Data = {
//             kode_dx,
//             nama_kategori,
//             keterangan,
//             status_aktif

//         }
//         console.log(req.body);
//         console.log(Data);
//         await Model_DX.Update(id, Data);
//         req.flash("success", "Berhasil mengupdate data petugas");
//         res.redirect("/dx");
//     } catch (error) {
//         console.log(error);
//     }
// });
router.post("/update/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Validasi ID dari URL.
        if (!Number.isInteger(id) || id <= 0) {
            req.flash("error", "ID dx tidak valid.");
            return res.redirect("/dx");
        }

        // Ambil data dari form edit.
        const kode_dx = String(
            req.body.kode_dx ?? ""
        ).trim();

        const nama_kategori = String(
            req.body.nama_kategori ?? ""
        ).trim().toUpperCase();

        const keterangan = String(
            req.body.keterangan ?? ""
        ).trim();


        const statusRaw = String(
            req.body.status_aktif ?? ""
        );

        // Validasi kolom wajib.
        if (!kode_dx) {
            req.flash("error", "Nama dx wajib diisi.");
            return res.redirect(`/dx/edit/${id}`);
        }


        if (!nama_kategori) {
            req.flash("error", "Nama Kategori wajib diisi.");
            return res.redirect(`/dx/edit/${id}`);
        }

        if (!["0", "1"].includes(statusRaw)) {
            req.flash("error", "Status dx tidak valid.");
            return res.redirect(`/dx/edit/${id}`);
        }

        if (keterangan.length > 30) {
            req.flash("error", "Nomor telepon maksimal 30 karakter.");
            return res.redirect(`/dx/edit/${id}`);
        }

        // Nilai kosong disimpan sebagai NULL pada kolom opsional.
        const Data = {
            kode_dx: kode_dx,
            nama_kategori: nama_kategori,
            keterangan: keterangan || null,

            status_aktif: Number(statusRaw)
        };

        // Sengaja tidak mengubah nama_asli_excel dan id_instansi.
        // Kedua kolom tersebut tidak diedit melalui form ini.
        console.log("ID dx yang diperbarui:", id);
        console.log("Data update dx:", Data);

        await Model_DX.Update(id, Data);

        req.flash("success", "Berhasil mengupdate data dx.");
        return res.redirect("/dx");

    } catch (error) {
        console.error("Error update data dx:", error);

        req.flash(
            "error",
            "Gagal mengupdate data dx. Periksa log server."
        );

        return res.redirect("/dx");
    }
});

router.get('/delete/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        await Model_DX.Delete(id);
        req.flash('success', 'Berhasil menghapus data dx');
        res.redirect('/dx');
    } catch (error) {
        req.flash("error", "Gagal menghapus data dx");
        res.redirect("/dx");
    }
});

router.get('/detail/:id_dx', async (req, res) => {
    try {
        const id = req.params.id_dx;
        const dx = await Model_DX.getById(id);

        if (!dx) {
            req.flash('invalid', 'dx tidak ditemukan');
            return res.redirect('/users');
        }

        res.render('dx/users/detail', {
            dx,
            recentPosts,
            user: {
                nama: req.session.nama,
                foto: req.session.foto,
                role: req.session.role,
            },
        });

    } catch (err) {
        console.error(err);
        req.flash('invalid', 'Terjadi kesalahan saat memuat dx');
        res.redirect('/users');
    }
});



module.exports = router;