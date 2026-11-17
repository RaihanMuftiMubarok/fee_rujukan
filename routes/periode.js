const express = require("express");
const router = express.Router();
const Model_Periode = require('../model/Model_Periode.js');
const Model_Users = require('../model/Model_Users.js');
const fs = require('fs');
const multer = require('multer');
const path = require('path');







router.get('/', async (req, res, next) => {
    try {
        // let id = req.session.userId;
        // let Data = await Model_Users.getId(id);
        // let page = parseInt(req.query.page) || 1;  // halaman aktif (default 1)
        // let limit = 10;                            // data per halaman
        // let offset = (page - 1) * limit;
        let rows = await Model_Periode.getAll();
        // let rows = await Model_Periode.getPaginated(limit, offset);
        // let total = await Model_Periode.getCount();
        // let totalPages = Math.ceil(total / limit);

        res.render('periode/index', {
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
        let rows = await Model_Periode.getAll();
        res.render('periode/users/index', {
            data: rows,
            user: {
                nama: req.session.nama,
                foto: req.session.foto,
                role: req.session.role,
            },
        });
    } catch (error) {
        console.error("Error:", error);
        req.flash('invalid', 'Terjadi kesalahan saat memuat data periode');
        res.redirect('/periode');
    }
});




router.get('/create', async function (req, res, next) {
    try {
        // let level_users = req.session.level;
        let id = req.session.userId;
        let Data = await Model_Periode.getAll();
        // if(Data[0].level_users == "2") {
        res.render('periode/create', {
            tahun: '',
            bulan: '',
            nomor_periode: '',
            uang_muka: '',
            keterangan: '',
            
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

router.post('/store', async (req, res) => {
    try {
        const tahun = Number(req.body.tahun);
        const bulan = Number(req.body.bulan);
        const nomor_periode = Number(req.body.nomor_periode);
        const uang_muka = Number(req.body.uang_muka);
        const keterangan = String(req.body.keterangan ?? '').trim();

        if (
            !Number.isInteger(tahun) ||
            !Number.isInteger(bulan) ||
            bulan < 1 ||
            bulan > 12 ||
            !Number.isInteger(nomor_periode) ||
            nomor_periode < 1 ||
            !Number.isFinite(uang_muka) ||
            uang_muka <= 0
        ) {
            req.flash('error', 'Data periode tidak valid. Periksa kembali form.');
            return res.redirect('/periode/create');
        }

        const Data = {
            tahun,
            bulan,
            nomor_periode,
            uang_muka,
            keterangan: keterangan || null
        };

        await Model_Periode.Store(Data);

        req.flash('success', 'Berhasil menyimpan data periode.');
        return res.redirect('/periode');

    } catch (error) {
        console.error('Error menyimpan periode:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            req.flash('error', 'Periode tersebut sudah terdaftar.');
            return res.redirect('/periode/create');
        }

        req.flash('error', 'Gagal menyimpan data periode.');
        return res.redirect('/periode/create');
    }
});



router.get("/edit/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        let rows = await Model_Periode.getId(id);
        let rows2 = await Model_Periode.getAll();
        if (rows.length > 0) {
            res.render("periode/edit", {
                id: id,
                data: rows[0],
                data_periode: rows2,
            });
        } else {
            req.flash("error", "periode not found");
            res.redirect("/periode");
        }
    } catch (error) {
        next(error);
    }
});


// router.post("/update/:id", async (req, res, next) => {
//     try {
//         const id = req.params.id;

//         let {
//             tahun,
//             bulan,
//             nomor_periode,
//             keterangan
//         } = req.body;



//         let Data = {
//             tahun,
//             bulan,
//             nomor_periode,
//             keterangan

//         }
//         console.log(req.body);
//         console.log(Data);
//         await Model_Periode.Update(id, Data);
//         req.flash("success", "Berhasil mengupdate data petugas");
//         res.redirect("/periode");
//     } catch (error) {
//         console.log(error);
//     }
// });
router.post("/update/:id", async (req, res) => {
    const id = req.params.id;

    try {
        // Validasi ID
        if (!/^\d+$/.test(id) || id === '0') {
            req.flash("error", "ID periode tidak valid.");
            return res.redirect("/periode");
        }

        // Ambil data dari form
        const tahun = Number(req.body.tahun);
        const bulan = Number(req.body.bulan);
        const nomor_periode = Number(req.body.nomor_periode);
        const uang_muka = Number(req.body.uang_muka);
        const keterangan = String(req.body.keterangan ?? "").trim();

        // Validasi data
        if (
            !Number.isInteger(tahun) ||
            !Number.isInteger(bulan) ||
            bulan < 1 ||
            bulan > 12 ||
            !Number.isInteger(nomor_periode) ||
            nomor_periode < 1 ||
            !Number.isFinite(uang_muka) ||
            uang_muka <= 0
        ) {
            req.flash("error", "Data periode tidak valid.");
            return res.redirect(`/periode/edit/${id}`);
        }

        // Pastikan data periode tersedia
        const rows = await Model_Periode.getId(id);

        if (rows.length === 0) {
            req.flash("error", "Data periode tidak ditemukan.");
            return res.redirect("/periode");
        }

        const Data = {
            tahun,
            bulan,
            nomor_periode,
            uang_muka,
            keterangan: keterangan || null
        };

        await Model_Periode.Update(id, Data);

        req.flash("success", "Berhasil mengupdate data periode.");
        return res.redirect("/periode");

    } catch (error) {
        console.error("Error update data periode:", error);

        if (error.code === 'ER_DUP_ENTRY') {
            req.flash("error", "Kombinasi tahun, bulan, dan nomor periode sudah digunakan.");
            return res.redirect(`/periode/edit/${id}`);
        }

        req.flash("error", "Gagal mengupdate data periode.");
        return res.redirect(`/periode/edit/${id}`);
    }
});

router.post('/delete/:id', async (req, res) => {
    const id = req.params.id;

    try {
        if (!/^\d+$/.test(id) || id === '0') {
            req.flash('error', 'ID periode tidak valid.');
            return res.redirect('/periode');
        }

        const rows = await Model_Periode.getId(id);

        if (rows.length === 0) {
            req.flash('error', 'Data periode tidak ditemukan.');
            return res.redirect('/periode');
        }

        await Model_Periode.Delete(id);

        req.flash('success', 'Berhasil menghapus data periode.');
        return res.redirect('/periode');

    } catch (error) {
        console.error('Error menghapus periode:', error);

        if (
            error.code === 'ER_ROW_IS_REFERENCED_2' ||
            error.errno === 1451
        ) {
            req.flash(
                'error',
                'Periode tidak dapat dihapus karena sudah digunakan oleh transaksi.'
            );
            return res.redirect('/periode');
        }

        req.flash('error', 'Gagal menghapus data periode.');
        return res.redirect('/periode');
    }
});

router.get('/detail/:id_periode', async (req, res) => {
    try {
        const id = req.params.id_periode;
        const periode = await Model_Periode.getById(id);

        if (!periode) {
            req.flash('invalid', 'periode tidak ditemukan');
            return res.redirect('/users');
        }

        res.render('periode/users/detail', {
            periode,
            recentPosts,
            user: {
                nama: req.session.nama,
                foto: req.session.foto,
                role: req.session.role,
            },
        });

    } catch (err) {
        console.error(err);
        req.flash('invalid', 'Terjadi kesalahan saat memuat periode');
        res.redirect('/users');
    }
});



module.exports = router;