var express = require("express");
const Model_Users = require("../model/Model_Users");

const Dashboard = require("../model/Dashboard"); // ← Tambahkan import model dashboard
var router = express.Router();




router.get('/', async function (req, res, next) {
  try {
    let id = req.session.userId;

    if (!id) {
      return res.redirect("/loginAdmin");
    }

    let Data = await Model_Users.getId(id);
    if (Data.length === 0) {
      return res.status(401).json({ error: "user tidak ada" });
    }

    // Validasi role
    if (Data[0].role !== "admin") {
      return res.redirect("/logoutadmin");
    }


    

    res.render("users/superusers", {
      title: "Users Home",
      email: Data[0].email,
      nama: Data[0].nama,
      foto: Data[0].foto,
      data2: Data,
      role: req.session.role,

      // user login
      user: {
        nama: req.session.nama,
        foto: req.session.foto,
        role: req.session.role,
      },

      // statistik penduduk
      totalPenduduk: stats.totalPenduduk || 0,
      kepalaKeluarga: stats.kepalaKeluarga || 0,
      jumlahPerempuan: stats.jumlahPerempuan || 0,
      jumlahLaki: stats.jumlahLaki || 0,
      pendidikanLabels: JSON.stringify(pendidikanData.labels),
      pendidikanCounts: JSON.stringify(pendidikanData.counts),
      labels,laki,perempuan,
      tabelPekerjaan,top4

    });

  } catch (error) {
    console.log(error);
    res.redirect("/loginAdmin");
  }
});



module.exports = router;
