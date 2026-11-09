/* HUNTER QUEST - ส่วนเสริมสำหรับแอป Android (Capacitor)
 *
 * กติกาของไฟล์นี้: "อ่านอย่างเดียว" ห้ามเขียน/ลบ/แก้ localStorage ของเกมเด็ดขาด
 * ระบบ Login / สมัครสมาชิก / เซฟ ใช้ของเดิมใน index.html ทั้งหมด ไม่ถูกแตะ
 *
 * หน้าที่: เตรียมโครงสำหรับ Cloud Save ในอนาคต (ตอนนี้ปิดอยู่ ไม่ทำอะไรเลย)
 */
(function () {
  'use strict';

  var isGameKey = function (k) { return typeof k === 'string' && k.indexOf('hq') === 0; };

  // สำเนาข้อมูลเซฟแบบอ่านอย่างเดียว (รูปแบบเดียวกับปุ่ม "สำรองข้อมูล" ของเกม)
  function snapshot() {
    var d = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (isGameKey(k)) d[k] = localStorage.getItem(k);
      }
    } catch (e) { /* ignore */ }
    return { v: 1, t: Date.now(), data: d };
  }

  window.HQCloudSave = {
    version: 1,
    enabled: false,   // ปิดไว้ จนกว่าจะมี provider จริงและผู้เล่นยืนยัน
    provider: null,

    snapshot: snapshot,

    // ในอนาคต: HQCloudSave.register({ push(snap){...}, pull(){...} }); HQCloudSave.enabled = true;
    register: function (p) {
      if (p && typeof p.push === 'function' && typeof p.pull === 'function') {
        this.provider = p;
        return true;
      }
      return false;
    },

    // อัปโหลดสำเนาขึ้นคลาวด์ (ไม่แตะเซฟในเครื่อง)
    push: function () {
      if (!this.enabled || !this.provider) return Promise.resolve(false);
      return Promise.resolve(this.provider.push(snapshot())).then(
        function () { return true; },
        function () { return false; }
      );
    },

    // ดึงข้อมูลจากคลาวด์มาให้ดูเฉยๆ "ไม่เขียนทับ" เซฟในเครื่องโดยอัตโนมัติ
    pull: function () {
      if (!this.provider) return Promise.resolve(null);
      return Promise.resolve(this.provider.pull());
    }
  };

  // ขอให้ระบบเก็บข้อมูลเกมแบบถาวร (ไม่เป็นไรถ้าไม่รองรับ)
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist();
    }
  } catch (e) { /* ignore */ }
})();
