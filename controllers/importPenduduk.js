const XLSX = require("xlsx");
const fs = require("fs");
const Model_Penduduk = require("../model/Model_Penduduk");

class ImportPendudukController {
  static async uploadExcel(req, res) {
    try {
      if (!req.file) {
        req.flash("error", "❌ Tidak ada file yang diupload");
        return res.redirect("/penduduk");
      }

      const filePath = req.file.path;
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

      let skippedRows = [];

      const rows = data
        .map((row, index) => {
          // cek apakah baris benar-benar kosong
          const isRowEmpty = Object.values(row).every(
            (val) => val === undefined || val === null || val.toString().trim() === ""
          );
          if (isRowEmpty) {
            console.log(`➡️ Row ${index + 2} kosong total:`, row); // debug
            return null;
          }

          // validasi kolom wajib
          if (!row.nik || !row.kk || !row.nama_lengkap || !row.jenis_kelamin) {
            let identifier = "(tidak ada identitas)";
            if (row.nama_lengkap) {
              identifier = row.nama_lengkap;
            } else if (row.nik) {
              identifier = `NIK: ${row.nik}`;
            } else if (row.kk) {
              identifier = `KK: ${row.kk}`;
            }

            skippedRows.push({
              no: index + 2,
              info: identifier,
            });

            console.log(`⚠️ Row ${index + 2} dilewati (kurang identitas):`, row); // debug

            return null;
          }

          return {
            nik: row.nik || null,
            kk: row.kk || null,
            nama_lengkap: row.nama_lengkap || null,
            no_akte_lahir: row.no_akte_lahir || null,
            shdk: row.shdk || null,
            jenis_kelamin: row.jenis_kelamin || null,
            tempat_lahir: row.tempat_lahir || null,
            tgl_lahir: row.tgl_lahir ? new Date(row.tgl_lahir) : null,
            usia: row.usia || null,
            status: row.status || null,
            agama: row.agama || null,
            pendidikan: row.pendidikan || null,
            pekerjaan: row.pekerjaan || null,
            nama_ayah: row.nama_ayah || null,
            nama_ibu: row.nama_ibu || null,
            rt: row.rt || null,
            rw: row.rw || null,
            dusun: row.dusun || null,
            warga_negara: row.warga_negara || null,
            desa: row.desa || null,
            kecamatan: row.kecamatan || null,
            kabupaten: row.kabupaten || null,
            provinsi: row.provinsi || null,
          };
        })
        .filter((r) => r !== null);

      const result = await Model_Penduduk.bulkInsertOrUpdate(rows);

      let message = `✅ Import selesai: ${result.inserted} data baru, ${result.updated} data diperbarui.`;
    //   , ${skippedRows.length} baris dilewati
    
    //   if (skippedRows.length > 0) {
    //     message += `\n⚠️ Baris dilewati: `;
    //     message += skippedRows.map((r) => `Row ${r.no} (${r.info})`).join(", ");
    //   }

      req.flash("success", message);

      fs.unlink(filePath, (err) => {
        if (err) console.error("Gagal hapus file:", err);
      });

      res.redirect("/penduduk");
    } catch (err) {
      console.error("Error import Excel:", err);
      req.flash("error", "❌ Gagal import excel");
      res.redirect("/penduduk");
    }
  }
}

module.exports = ImportPendudukController;
