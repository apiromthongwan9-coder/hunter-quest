/* Hunter Quest — ออนไลน์กับเพื่อนผ่าน PeerJS (ใช้แทน claude runtime เมื่อเล่นนอก Claude)
   เกมเรียก claude.use('room') / claude.use('user') อยู่แล้ว ไฟล์นี้ทำให้สองอย่างนี้ใช้งานได้บน GitHub Pages */
(function(){
if(window.claude&&window.claude.use)return;
var NAME='';try{NAME=sessionStorage.getItem('hq_cur')||(window.name.indexOf('hqcur:')==0?window.name.slice(6):'')}catch(e){}
var LOGGED=!!NAME;NAME=(NAME||'นักล่า').slice(0,12);
var peer=null,myId='',isHost=false,hostConn=null,conns={},all={},mine=null,code='',tick=null,ui={};
function say(s){if(ui.st)ui.st.textContent=s}
function chatShow(n,m){try{toast('💬 '+n+': '+m)}catch(e){}}
function reset(){clearInterval(tick);try{if(peer)peer.destroy()}catch(e){}peer=null;hostConn=null;conns={};all={};isHost=false;myId='';code=''}
function mk(){var s='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r='';for(var i=0;i<5;i++)r+=s[Math.random()*s.length|0];return r}

var R={
 presence:function(p){mine=p;if(isHost)all[myId]=p;else if(hostConn&&hostConn.open)hostConn.send({t:'p',p:p});return Promise.resolve()},
 peers:function(){return Object.keys(all).map(function(k){return{peer:k,isMe:k==myId,presence:all[k]}})}
};
window.claude={use:async function(n){
 if(n=='room')return R;
 if(n=='user')return{me:async function(){return{name:NAME}},id:async function(){return null}};
 return null}};

function host(retry){
 retry=retry|0;reset();code=mk();var id='hq-'+code;
 if(!window.Peer)return say('โหลด PeerJS ไม่สำเร็จ (เช็กอินเทอร์เน็ต)');
 peer=new Peer(id);
 peer.on('open',function(){myId=id;isHost=true;all[id]=mine||{};ui.code.textContent=code;
  say('สร้างห้องแล้ว ส่งโค้ดหรือลิงก์ให้เพื่อน');
  tick=setInterval(function(){if(mine)all[id]=mine;var s={t:'s',s:all};for(var k in conns)if(conns[k].open)conns[k].send(s)},150)});
 peer.on('connection',function(c){
  c.on('open',function(){conns[c.peer]=c;say('มีผู้เล่นในห้อง '+Object.keys(conns).length+' คน')});
  c.on('data',function(d){if(!d)return;
   if(d.t=='p')all[c.peer]=d.p;
   else if(d.t=='h')applyHit(d);
   else if(d.t=='c'){chatShow(d.n,d.m);for(var k in conns)if(k!=c.peer&&conns[k].open)conns[k].send(d)}});
  c.on('close',function(){delete conns[c.peer];delete all[c.peer]})});
 peer.on('error',function(e){if(e.type=='unavailable-id'&&retry<5)return host(retry+1);say('สร้างห้องไม่สำเร็จ: '+e.type)})
}

function join(c){
 c=(c||'').trim().toUpperCase();if(!c)return;reset();code=c;
 if(!window.Peer)return say('โหลด PeerJS ไม่สำเร็จ (เช็กอินเทอร์เน็ต)');
 say('กำลังเข้าห้อง '+c+'…');peer=new Peer();
 peer.on('open',function(id){myId=id;var k=peer.connect('hq-'+c,{reliable:true});hostConn=k;
  k.on('open',function(){ui.code.textContent=c;say('เข้าห้อง '+c+' แล้ว');if(mine)k.send({t:'p',p:mine})});
  k.on('data',function(d){if(!d)return;if(d.t=='s')all=d.s;else if(d.t=='m')applyMon(d);else if(d.t=='c')chatShow(d.n,d.m)});
  k.on('close',function(){say('หลุดจากห้อง');all={};hostConn=null})});
 peer.on('error',function(e){say(e.type=='peer-unavailable'?'ไม่พบห้อง '+c:'เชื่อมต่อไม่ได้: '+e.type)})
}

function chat(m){
 m=(m||'').trim().slice(0,80);if(!m)return;var d={t:'c',n:NAME,m:m};chatShow(NAME,m);
 if(isHost){for(var k in conns)if(conns[k].open)conns[k].send(d)}
 else if(hostConn&&hostConn.open)hostConn.send(d)
}

/* ===== ตีมอนด้วยกัน: คนสร้างห้องถือสถานะมอนสเตอร์ ทุกคนที่อยู่เวิลด์เดียวกับเขาเห็นมอนตัวเดียวกัน (ยกเว้นบอส) ===== */
var lastM=0;
function okW(){try{return !!(WD[cw]&&WD[cw].k)&&cw!='c'&&cw!='l'}catch(e){return false}}
function okM(m){return m&&!m.cv&&!m.tmp}
function assist(m){try{var x=KD[m.k].xp[0];if(m.boss){x=Math.round(KD[m.k].xp[1]*BSS[m.k].xpm*.5);P.gem+=2}gainXp(x);txt(m.x,m.y-46,'🤝 +'+x+' XP','#9fffb0')}catch(e){}}
function applyHit(d){if(!okW()||d.w!=cw)return;var m=M[d.i];if(!okM(m)||m.dead)return;m.hp-=d.d;m.hurt=.15;if(m.hp<=0){if(m.boss){m.hp=0;try{bossKill(m)}catch(e){m.dead=1;m.rt=150}}else{m.dead=1;m.rt=8;assist(m)}}}
function applyMon(d){if(!okW()||d.w!=cw)return;d.a.forEach(function(e){var m=M[e[0]];if(!okM(m))return;
 if(m.boss&&m.dead&&e[6]&&e[8]!=null)m.rt=e[8];
 if(m.dead&&!e[6])return;
 if(e[6]&&!m.dead){m.dead=1;m.rt=m.boss?(e[8]||150):8;assist(m)}
 if(m.tx==null||Math.hypot(e[1]-m.x,e[2]-m.y)>150){m.x=e[1];m.y=e[2]}m.tx=e[1];m.ty=e[2];m.lv=e[3];m.hp=e[4];m.mx=e[5];m.fl=e[7];
 if(!m.boss)try{var K=KD[m.k];m.dmg=K.dm+m.lv*K.ds|0}catch(x){}})}
function hook(){
 if(typeof hit!='function'||typeof mp!='function')return;
 var oh=window.hit,om=window.mp;
 window.hit=function(m,d){var b=m.hp;oh.apply(this,arguments);
  if(!isHost&&hostConn&&hostConn.open&&okW()&&okM(m)){var i=M.indexOf(m);if(i>=0&&b>m.hp)hostConn.send({t:'h',w:cw,i:i,d:b-m.hp})}};
 window.mp=function(){om();var n=Date.now();
  if(!isHost&&okW())for(var j=0;j<M.length;j++){var q=M[j];if(okM(q)&&!q.dead&&q.tx!=null){q.x+=(q.tx-q.x)*.3;q.y+=(q.ty-q.y)*.3}}
  if(isHost&&n-lastM>100&&okW()){lastM=n;var a=[];
   for(var i=0;i<M.length;i++){var m=M[i];if(okM(m))a.push([i,m.x|0,m.y|0,m.lv,m.hp|0,m.mx|0,m.dead?1:0,m.fl,m.boss?Math.ceil(m.rt||0):null])}
   var s={t:'m',w:cw,a:a};for(var k in conns)if(conns[k].open)conns[k].send(s)}}
}
addEventListener('load',hook);

function mkui(){
 var cs='position:fixed;left:50%;transform:translateX(-50%);z-index:60;',
 b=document.createElement('button'),p=document.createElement('div');
 b.textContent='👥';
 b.style.cssText=cs+'top:calc(env(safe-area-inset-top,0px) + 8px);font-size:18px;padding:4px 10px;border-radius:14px;border:2px solid #c9a24a;background:rgba(14,20,32,.8);color:#fff';
 p.style.cssText=cs+'top:calc(env(safe-area-inset-top,0px) + 46px);display:none;width:min(300px,90vw);padding:10px;border-radius:12px;border:2px solid #c9a24a;background:rgba(14,20,32,.94);color:#f4f6fa;font:13px Kanit,sans-serif';
 p.innerHTML='<div id="mpst">ยังไม่ได้เชื่อมต่อ</div><div style="margin:6px 0">โค้ดห้อง: <b id="mpcode" style="letter-spacing:2px">-</b></div>'
  +'<button data-a="host">🏠 สร้างห้อง</button> <button data-a="link">🔗 คัดลอกลิงก์</button>'
  +'<div style="margin-top:6px"><input id="mpj" placeholder="โค้ดห้องของเพื่อน" maxlength="6" style="width:60%"> <button data-a="join">เข้าห้อง</button></div>'
  +'<div style="margin-top:6px"><input id="mpc" placeholder="พิมพ์แชท" maxlength="80" style="width:70%"> <button data-a="chat">ส่ง</button></div>';
 document.body.appendChild(b);document.body.appendChild(p);
 ui.st=p.querySelector('#mpst');ui.code=p.querySelector('#mpcode');
 var inj=p.querySelector('#mpj'),inc=p.querySelector('#mpc');
 ['pointerdown','touchstart','mousedown','keydown','keyup'].forEach(function(ev){
  p.addEventListener(ev,function(e){e.stopPropagation()});b.addEventListener(ev,function(e){e.stopPropagation()})});
 b.onclick=function(){p.style.display=p.style.display=='none'?'block':'none'};
 p.onclick=function(e){var a=e.target.getAttribute&&e.target.getAttribute('data-a');if(!a)return;
  if(a=='host')host();
  else if(a=='join')join(inj.value);
  else if(a=='chat'){chat(inc.value);inc.value=''}
  else if(a=='link'&&code){var u=location.origin+location.pathname+'#room='+code;
   try{navigator.clipboard.writeText(u).then(function(){say('คัดลอกลิงก์แล้ว')},function(){say(u)})}catch(x){say(u)}}};
 inc.onkeydown=function(e){e.stopPropagation();if(e.key=='Enter'){chat(inc.value);inc.value=''}};
 var m=location.hash.match(/room=([A-Za-z0-9]+)/);if(m){p.style.display='block';join(m[1])}
}
if(LOGGED){
 addEventListener('pagehide',reset);
 if(document.body)mkui();else addEventListener('DOMContentLoaded',mkui)
}
})();
