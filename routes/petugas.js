const express = require("express");
const router = express.Router();
const Model_Petugas = require('../model/Model_Petugas.js');
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
        let rows = await Model_Petugas.getAll();
        // let rows = await Model_Petugas.getPaginated(limit, offset);
        // let total = await Model_Petugas.getCount();
        // let totalPages = Math.ceil(total / limit);

        res.render('petugas/index', {
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
        let rows = await Model_Petugas.getAll();
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
        let Data = await Model_Petugas.getAll();
        // if(Data[0].level_users == "2") {
        res.render('petugas/create', {
            nama_petugas: '',
            bagian: '',
            no_telepon: '',
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
        let { nama_petugas,
            bagian,
            no_telepon,
            
            status_aktif,
            } = req.body;

        let Data = {
            nama_petugas,
            bagian,
            no_telepon,
            
            status_aktif,
            
        }

        await Model_Petugas.Store(Data);
        req.flash('success', 'Berhasil menyimpan data');
        res.redirect('/petugas');
    } catch (error) {
        req.flash('error', 'Terjadi kesalahan pada fungsi');
        console.error("Error terjadi di:");
        console.error(error.stack);
        res.redirect('/petugas');
    }
});



router.get("/edit/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        let rows = await Model_Petugas.getId(id);
        let rows2 = await Model_Petugas.getAll();
        if (rows.length > 0) {
            res.render("petugas/edit", {
                id: id,
                data: rows[0],
                data_petugas: rows2,
            });
        } else {
            req.flash("error", "petugas not found");
            res.redirect("/petugas");
        }
    } catch (error) {
        next(error);
    }
});


// router.post("/update/:id", async (req, res, next) => {
//     try {
//         const id = req.params.id;

//         let {
//             nama_petugas,
//             bagian,
//             no_telepon,
//             status_aktif
//         } = req.body;



//         let Data = {
//             nama_petugas,
//             bagian,
//             no_telepon,
//             status_aktif

//         }
//         console.log(req.body);
//         console.log(Data);
//         await Model_Petugas.Update(id, Data);
//         req.flash("success", "Berhasil mengupdate data petugas");
//         res.redirect("/petugas");
//     } catch (error) {
//         console.log(error);
//     }
// });
router.post("/update/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        // Validasi ID dari URL.
        if (!Number.isInteger(id) || id <= 0) {
            req.flash("error", "ID petugas tidak valid.");
            return res.redirect("/petugas");
        }

        // Ambil data dari form edit.
        const nama_petugas = String(
            req.body.nama_petugas ?? ""
        ).trim();

        const bagian = String(
            req.body.bagian ?? ""
        ).trim().toUpperCase();

        const no_telepon = String(
            req.body.no_telepon ?? ""
        ).trim();


        const statusRaw = String(
            req.body.status_aktif ?? ""
        );

        // Validasi kolom wajib.
        if (!nama_petugas) {
            req.flash("error", "Nama petugas wajib diisi.");
            return res.redirect(`/petugas/edit/${id}`);
        }

        if (nama_petugas.length > 150) {
            req.flash("error", "Nama petugas maksimal 150 karakter.");
            return res.redirect(`/petugas/edit/${id}`);
        }

        if (!bagian) {
            req.flash("error", "bagian wajib diisi.");
            return res.redirect(`/petugas/edit/${id}`);
        }

        if (!["0", "1"].includes(statusRaw)) {
            req.flash("error", "Status petugas tidak valid.");
            return res.redirect(`/petugas/edit/${id}`);
        }

        if (no_telepon.length > 30) {
            req.flash("error", "Nomor telepon maksimal 30 karakter.");
            return res.redirect(`/petugas/edit/${id}`);
        }

        // Nilai kosong disimpan sebagai NULL pada kolom opsional.
        const Data = {
            nama_petugas: nama_petugas,
            bagian: bagian,
            no_telepon: no_telepon || null,
            status_aktif: Number(statusRaw)
        };

        // Sengaja tidak mengubah nama_asli_excel dan id_instansi.
        // Kedua kolom tersebut tidak diedit melalui form ini.
        console.log("ID petugas yang diperbarui:", id);
        console.log("Data update petugas:", Data);

        await Model_Petugas.Update(id, Data);

        req.flash("success", "Berhasil mengupdate data petugas.");
        return res.redirect("/petugas");

    } catch (error) {
        console.error("Error update data petugas:", error);

        req.flash(
            "error",
            "Gagal mengupdate data petugas. Periksa log server."
        );

        return res.redirect("/petugas");
    }
});

router.get('/delete/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        await Model_Petugas.Delete(id);
        req.flash('success', 'Berhasil menghapus data petugas');
        res.redirect('/petugas');
    } catch (error) {
        req.flash("error", "Gagal menghapus data petugas");
        res.redirect("/petugas");
    }
});

router.get('/detail/:id_petugas', async (req, res) => {
    try {
        const id = req.params.id_petugas;
        const petugas = await Model_Petugas.getById(id);

        if (!petugas) {
            req.flash('invalid', 'petugas tidak ditemukan');
            return res.redirect('/users');
        }

        res.render('petugas/users/detail', {
            petugas,
            recentPosts,
            user: {
                nama: req.session.nama,
                foto: req.session.foto,
                role: req.session.role,
            },
        });

    } catch (err) {
        console.error(err);
        req.flash('invalid', 'Terjadi kesalahan saat memuat petugas');
        res.redirect('/users');
    }
});



module.exports = router;