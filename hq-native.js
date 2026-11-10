/*!
 * HUNTER QUEST — hq-native.js (v1.0.0)
 * ตัวเชื่อมเกม <-> Android ผ่าน Capacitor โหลดก่อนสคริปต์เกมใน index.html
 *
 * - ไม่แก้และไม่แทนที่โค้ดเกมเดิม ทุกฟีเจอร์เป็นแบบ "มีปลั๊กอินก็ใช้ ไม่มีก็ข้าม"
 * - บนเบราว์เซอร์ธรรมดา (ไม่มี Capacitor) ไฟล์นี้แทบไม่ทำอะไร เกมเล่นได้ปกติ
 * - ปลั๊กอินที่ใช้ (ติดตั้งตอนทำ APK ตัวไหนไม่ติดตั้งก็ข้ามได้):
 *   @capacitor/app, haptics, status-bar, splash-screen, screen-orientation,
 *   preferences, filesystem, share, clipboard, local-notifications,
 *   @capacitor-community/keep-awake
 * - ปรับค่าได้โดยกำหนด window.HQ_NATIVE_CONFIG = {...} ก่อนโหลดไฟล์นี้
 */
(function () {
  'use strict';
  if (window.HQNative) return;
  try {
    var cfg = Object.assign({
      haptics: true,      // สั่นเบาๆ ตอนกดโจมตี/สกิล
      keepAwake: true,    // กันจอดับระหว่างเล่น
      immersive: true,    // ซ่อนแถบสถานะ
      landscape: true,    // ล็อกแนวนอน
      backButton: true,   // ปุ่มย้อนกลับ: ปิดหน้าต่าง / กดสองครั้งเพื่อออก
      mirrorSave: true,   // สำเนาเซฟลง Preferences กันข้อมูลหาย
      shareBackup: true   // ปุ่ม "ดาวน์โหลดไฟล์สำรอง" เปิดหน้าต่างแชร์ของ Android
    }, window.HQ_NATIVE_CONFIG || {});

    var cap = window.Capacitor;
    var platform = cap && cap.getPlatform ? cap.getPlatform() : 'web';
    var isNative = !!(cap && (cap.isNativePlatform ? cap.isNativePlatform() : platform !== 'web'));
    var doc = document, root = doc.documentElement, plugins = {};

    /* ---------- ตัวช่วยเรียกปลั๊กอิน ---------- */
    function plugin(name) {
      if (!isNative) return null;
      if (name in plugins) return plugins[name];
      var p = null;
      try {
        p = (cap.Plugins && cap.Plugins[name]) || null;
        if (!p && cap.registerPlugin && (!cap.isPluginAvailable || cap.isPluginAvailable(name))) p = cap.registerPlugin(name);
      } catch (e) { p = null; }
      return (plugins[name] = p);
    }
    function call(name, method, args) {
      try {
        var p = plugin(name);
        if (p && typeof p[method] === 'function') return Promise.resolve(p[method](args)).catch(function () {});
      } catch (e) {}
      return Promise.resolve();
    }
    function toast(t) {
      var el = doc.getElementById('toast');
      if (!el) return;
      el.textContent = t; el.classList.add('on');
      clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('on'); }, 1800);
    }

    /* ---------- ฟังก์ชันมือถือที่เกมเรียกใช้ได้ ---------- */
    function haptic(kind) {
      if (!cfg.haptics) return Promise.resolve();
      if (plugin('Haptics')) {
        if (kind === 'success' || kind === 'warning' || kind === 'error') return call('Haptics', 'notification', { type: kind.toUpperCase() });
        return call('Haptics', 'impact', { style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
      }
      try { if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 40 : kind === 'medium' ? 25 : 12); } catch (e) {}
      return Promise.resolve();
    }
    function share(text, title) {
      if (plugin('Share')) return call('Share', 'share', { title: title || 'Hunter Quest', text: String(text || ''), dialogTitle: title || 'Hunter Quest' });
      try { if (navigator.share) return navigator.share({ title: title, text: text }); } catch (e) {}
      return Promise.resolve();
    }
    function notify(title, body, delayMs) {
      var p = plugin('LocalNotifications');
      if (!p) return Promise.resolve(false);
      return Promise.resolve(p.requestPermissions()).then(function (r) {
        if (!r || r.display !== 'granted') return false;
        return p.schedule({ notifications: [{ id: (Date.now() % 2147483000) | 0, title: title, body: body, schedule: { at: new Date(Date.now() + (delayMs || 0) + 250) } }] }).then(function () { return true; });
      }).catch(function () { return false; });
    }
    var wl = null;
    function keepAwake(on) {
      if (plugin('KeepAwake')) return call('KeepAwake', on ? 'keepAwake' : 'allowSleep');
      try {
        if (on && navigator.wakeLock && !wl) navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }).catch(function () {});
        else if (!on && wl) wl.release();
      } catch (e) {}
      return Promise.resolve();
    }

    /* ---------- สำเนาเซฟลง Preferences (เกมยังใช้ localStorage เหมือนเดิม) ---------- */
    var BK = 'hq_native_backup', lastMirror = '', mirrorOK = false;
    function snap() {
      var o = {};
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('hq') === 0) o[k] = localStorage.getItem(k); } } catch (e) {}
      return o;
    }
    function mirror(force) {
      if (!isNative || !cfg.mirrorSave || !mirrorOK) return;
      var o = snap();
      if (!o.hq_users) return;                       // ไม่เขียนทับสำเนาด้วยข้อมูลว่าง
      var d = JSON.stringify(o);
      if (d === lastMirror && !force) return;
      lastMirror = d;
      call('Preferences', 'set', { key: BK, value: JSON.stringify({ v: 1, t: Date.now(), data: o }) });
    }
    function restore(done) {
      var fin = false, end = function () { if (!fin) { fin = true; done(); } };
      var p = plugin('Preferences');
      if (!isNative || !cfg.mirrorSave || !p) return end();
      try {
        // เติมคืนเฉพาะตอนเครื่องไม่มีบัญชีเลย และไม่เคยเติมคืนในเซสชันนี้ (กันรีโหลดวน)
        if (localStorage.getItem('hq_users') !== null || sessionStorage.getItem('hq_native_restored')) return end();
      } catch (e) { return end(); }
      Promise.resolve(p.get({ key: BK })).then(function (r) {
        var d = r && r.value && JSON.parse(r.value).data, n = 0;
        if (d) for (var k in d) if (k.indexOf('hq') === 0 && localStorage.getItem(k) === null) { localStorage.setItem(k, d[k]); n++; }
        if (n) { sessionStorage.setItem('hq_native_restored', '1'); location.reload(); } else end();
      }).catch(end);
    }
    function flush() {                                // สั่งให้เกมเซฟทันที (เกมฟัง pagehide อยู่แล้ว)
      try { window.dispatchEvent(new Event('pagehide')); } catch (e) {}
      mirror(true);
    }

    /* ---------- หน้าจอ / การหมุน / กันจอดับ ---------- */
    function applyScreen() {
      if (!isNative) return;
      if (cfg.immersive) {
        call('StatusBar', 'hide');
        call('StatusBar', 'setOverlaysWebView', { overlay: true });
        try { if (window.AndroidFullScreen && AndroidFullScreen.immersiveMode) AndroidFullScreen.immersiveMode(); } catch (e) {}
      }
      if (cfg.landscape) call('ScreenOrientation', 'lock', { orientation: 'landscape' });
      if (cfg.keepAwake) keepAwake(true);
    }

    /* ---------- ปุ่มย้อนกลับของ Android ---------- */
    var lastBack = 0;
    function topModal() {
      var ms = [].slice.call(doc.querySelectorAll('.modal.on'));
      if (!ms.length) return null;
      ms.sort(function (a, b) { return (parseInt(getComputedStyle(a).zIndex, 10) || 0) - (parseInt(getComputedStyle(b).zIndex, 10) || 0); });
      return ms[ms.length - 1];
    }
    function onBack() {
      var m = topModal();
      if (m) { var b = m.querySelector('[data-x],.x,#cvx'); if (b) b.click(); return; }
      var now = Date.now();
      if (now - lastBack < 2000) { flush(); call('App', 'exitApp'); return; }
      lastBack = now; toast('กดย้อนกลับอีกครั้งเพื่อออกจากเกม');
    }

    /* ---------- เริ่มทำงาน ---------- */
    if (isNative) {
      var app = plugin('App');
      if (app && app.addListener) {
        app.addListener('appStateChange', function (s) {
          if (s && s.isActive) { applyScreen(); window.dispatchEvent(new Event('hq:resume')); }
          else { flush(); window.dispatchEvent(new Event('hq:pause')); }
        });
        if (cfg.backButton) app.addListener('backButton', onBack);
      }
      doc.addEventListener('visibilitychange', function () { if (doc.hidden) flush(); });

      if (cfg.haptics) doc.addEventListener('pointerdown', function (e) {
        var t = e.target && e.target.closest && e.target.closest('#atk,.sk');
        if (t) haptic('light');
      }, true);

      // กดค้างไม่เด้งเมนู / ไม่ซูมด้วยสองนิ้ว (ยกเว้นช่องพิมพ์)
      doc.addEventListener('contextmenu', function (e) { var t = e.target; if (!(t && t.closest && t.closest('input,textarea'))) e.preventDefault(); });
      doc.addEventListener('gesturestart', function (e) { e.preventDefault(); });

      // ปุ่ม "ดาวน์โหลดไฟล์สำรอง" ของเกมใช้ <a download> ซึ่ง WebView ไม่รองรับ -> ส่งผ่านหน้าต่างแชร์แทน
      var fs = plugin('Filesystem'), sh = plugin('Share');
      if (cfg.shareBackup && fs && sh && window.HTMLAnchorElement) {
        var origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
          var a = this, href = a.href || '', name = a.getAttribute('download');
          if (name === null || href.indexOf('blob:') !== 0) return origClick.apply(a, arguments);
          fetch(href).then(function (r) { return r.text(); })
            .then(function (txt) { return fs.writeFile({ path: name || 'hunter-quest-backup.json', data: txt, directory: 'CACHE', encoding: 'utf8' }); })
            .then(function (w) { return sh.share({ title: 'Hunter Quest backup', url: w.uri, dialogTitle: 'บันทึกไฟล์สำรอง' }); })
            .catch(function () { origClick.apply(a, []); });
        };
      }

      // คัดลอกโค้ดสำรองผ่านคลิปบอร์ดของระบบ (ถ้าไม่สำเร็จใช้ของเดิม)
      var cb = plugin('Clipboard');
      if (cb && navigator.clipboard) {
        var ow = navigator.clipboard.writeText && navigator.clipboard.writeText.bind(navigator.clipboard);
        try {
          navigator.clipboard.writeText = function (t) {
            return Promise.resolve(cb.write({ string: String(t) })).catch(function () { return ow ? ow(t) : Promise.reject(); });
          };
        } catch (e) {}
      }

      restore(function () { mirrorOK = true; mirror(); });
      setInterval(mirror, 5000);

      var go = function () { root.classList.add('hq-native'); applyScreen(); call('SplashScreen', 'hide', { fadeOutDuration: 200 }); };
      if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', go); else go();
    }

    window.HQNative = {
      version: '1.0.0', isNative: isNative, platform: platform, config: cfg,
      plugin: plugin, call: call, haptic: haptic, vibrate: haptic, toast: toast,
      share: share, notify: notify, keepAwake: keepAwake, flush: flush,
      saveMirror: function () { mirror(true); }
    };
  } catch (err) {
    try { console.warn('[hq-native] disabled:', err); } catch (e) {}
  }
})();
