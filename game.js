/* =====================================================================
   MLBB Esports Manager  -  game.js
   ===================================================================== */
const ROLES=['EXP','JG','MID','GOLD','ROAM'];

const R=Object.fromEntries(
  Object.entries(TEAM_DB).map(([reg,teams])=>[reg,teams.map(team=>team.name)])
);
const RG=Object.keys(R),OFF={PH:0,ID:0,MY:-3,KH:-6};
const COUNTRY={PH:'Philippines',ID:'Indonesia',MY:'Malaysia',KH:'Cambodia'};

const NM={
  PH:["Kai","Zen","Rex","Jax","Miko","Dre","Nate","Kiro","Lance","Vince","Elric","Tyron","Arlo","Brix","Cairo","Dax"],
  ID:["Rizky","Bagas","Fajar","Dimas","Arya","Gilang","Raka","Wahyu","Adit","Bima","Yoga","Surya"],
  MY:["Aiman","Hafiz","Danish","Irfan","Zikri","Faiz","Haziq","Amir","Syafiq","Adam"],
  KH:["Sokha","Vibol","Rithy","Dara","Sovann","Piseth","Veasna","Chhay","Kosal","Mony"]
};

const BMAX=5;      // max substitutes per team
const WAGE=.5;     // wage per OVR point above 62, per split (set 0 to disable wages)
const HOF_MIN=30;  // Hall of Fame score needed at retirement
const SPONS=['VoltEdge Energy','Nova Mobile','Apex Gear','Zenith Telecom','RapidPay','BlueWave Drinks','IronCore PCs','Skyline Air','Pixel Snacks','Titan Motors','Lumen Audio','Orbit Bank'];
const CLAUSES=[{k:'top6',t:'Make the MPL playoffs'},{k:'intl',t:'Play at MSC / M Series'},{k:'title',t:'Win a title'}];

const $=s=>document.querySelector(s);

/* all UI state lives here so nothing is used before it is declared */
let G,TAB='roster',LR=null,LT=null,PV=null,NID=0,NAV=[],TR=null,FF='ALL',IS=null,SV=null,PS=null,PK=null,VK=null,IK=null,MHK='',NEG={},FNEG={},OP=null,FS={k:'ovr',d:-1},LIVE=null,LIVE_TIMER=null;

const used=new Set(),SUF=["","","x","Z","TV","GG","07","99"];
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const rf=(a,b)=>a+Math.random()*(b-a);
const cl=v=>Math.max(50,Math.min(99,v));
const hs=s=>{let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return x};
const shuf=a=>a.slice().sort(()=>Math.random()-.5);
function ign(reg){let s,k=0;do s=NM[reg][rnd(0,NM[reg].length-1)]+SUF[rnd(0,7)]+(k++>20?rnd(1,999):"");while(used.has(s));used.add(s);return s}
const S0=()=>({g:0,k:0,d:0,a:0,m:0,w:0});

/* ---------- players ---------- */
const potGap=a=>a<=19?rnd(6,16):a<=22?rnd(3,11):a<=25?rnd(0,6):rnd(0,2);
const mk=(n,r,o,age,c)=>{
  const form=(typeof PLAYER_FORM!=='undefined'&&PLAYER_FORM[n])||{};
  const meta=(typeof PLAYER_META!=='undefined'&&PLAYER_META[n])||{};
  const yr=G?.yr??2026;
  const byDb=meta.by??meta.birthYear??form.by??form.birthYear;   // optional birth year in database.js
  const a0=Math.max(16,byDb!=null?yr-byDb:(meta.age??form.age??age??(17+hs(n+'e')%11)));
  const p={
    id:++NID,n,r,c:meta.c||form.c||c||'PH',
    age:a0,by:yr-a0,
    ageVerified:byDb!=null||(meta.ageVerified??form.ageVerified??false),
    mec:form.mec??cl(o+hs(n+'a')%11-5),
    mac:form.mac??cl(o+hs(n+'b')%11-5),
    tf:form.tf??cl(o+hs(n+'c')%11-5),
    con:form.con??cl(o+hs(n+'d')%11-5),
    contract:rnd(1,4),s:S0(),h:{},ach:[],earn:0,rk:used.has(n)?1:0
  };
  // Optional OVR target in database.js; preserve relative attribute strengths.
  if(form.ovr!=null){
    const delta=Number(form.ovr)-ov(p);
    ['mec','mac','tf','con'].forEach(k=>p[k]=cl(p[k]+delta));
  }
  p.pot=Math.max(ov(p),Math.min(99,form.pot??cl(ov(p)+potGap(p.age))));
  p.pk=ov(p);
  return p;
};
const ov=p=>Math.round((p.mec+p.mac+p.tf+p.con)/4);
const fixP=p=>{p.age??=17+hs(p.n+'e')%11;p.by??=(G?.yr??2026)-p.age;p.ageVerified??=false;p.pot??=Math.max(ov(p),cl(ov(p)+potGap(p.age)));p.pk??=ov(p)}; // old saves
const rt=n=>G.T[n].p.reduce((s,p)=>s+.3*p.mec+.25*p.mac+.3*p.tf+.15*p.con,0)/5;
const tv=p=>Math.max(20,(ov(p)-55)*8+Math.max(0,p.pot-ov(p))*4-Math.max(0,p.age-27)*6); // trade value ($k)
const cost=p=>Math.max(10,(ov(p)-60)*4+Math.max(0,p.pot-ov(p))*2);                      // free agent signing
const bcost=p=>Math.max(40,Math.round(tv(p)*1.2));        
const CMULT=[.5,.55,.75,.9,1,1.05,1.1];   // price multiplier by contract splits left (0..6)
const cmult=p=>CMULT[Math.min(6,Math.max(0,p.contract||0))];
const sellPrice=p=>Math.max(10,Math.round(tv(p)*.9*cmult(p)));                       // buyout price
const kda=s=>((s.k+s.a)/Math.max(1,s.d)).toFixed(2);
const hk=()=>G.yr+' S'+(G.sp+1);
const spk=i=>Math.floor(i/2)+' S'+(i%2+1);
function tenure(p,tn=G.me){ // completed splits with this team, in years
  let i=G.yr*2+G.sp-1,n=0;
  while(p.h[spk(i)]?.t===tn){n++;i--}
  return n/2;
}
const ent=(p,t)=>{
  const e=p.h[hk()]??={t,ts:[t],age:p.age,ageVerified:!!p.ageVerified,rs:S0(),po:S0(),in:S0(),earn:0};
  e.ts??=[e.t];
  // Older saves did not store historical ages; use the available age as a fallback.
  e.age??=p.age;
  e.ageVerified??=!!p.ageVerified;
  if(!e.ts.includes(t))e.ts.push(t);
  e.t=t;
  return e;
};
const all=k=>[...G.T[k].p,...G.T[k].b];
const est=(p,s)=>Math.round(Math.max(10,(ov(p)-60)*2)*s*(1-.04*(s-1))); // market value of a contract offer
const greed=p=>.9+(hs(p.n)%26)/100;                                      // hidden ask: 90-115% of market
const greedT=(tn,p)=>.95+(hs(tn+p.n)%26)/100;                             // hidden trade ask: 95-120% of value
function removeFrom(team,p){for(const f of ['p','b']){const i=team[f].indexOf(p);if(i>=0){team[f].splice(i,1);return f}}return null}
const IMPMAX=2;
const impCount=(tn,out)=>all(tn).filter(x=>x!==out&&x.c!==G.T[tn].reg).length;
const aiCanReceive=(p,tn,out)=>p.c===G.T[tn].reg||impCount(tn,out)<IMPMAX;

// Repair AI rosters (including older saves) that already exceed the import cap.
function aiTrimImports(tn){
  const T=G.T[tn];
  while(impCount(tn)>IMPMAX){
    const bi=T.b.findIndex(p=>p.c!==T.reg&&!p.loan);
    if(bi>=0){
      const [p]=T.b.splice(bi,1);
      p.contract=0;delete p.rv;delete p.ex;p.old=tn;G.fa.push(p);
      continue;
    }
    const si=T.p.findIndex(p=>p.c!==T.reg&&!p.loan);
    if(si<0)break;
    const old=T.p[si],role=old.r;
    const domesticBench=T.b.findIndex(p=>p.c===T.reg&&(p.r===role||p.r==='FLEX'));
    let replacement;
    if(domesticBench>=0)replacement=T.b.splice(domesticBench,1)[0];
    else{
      const fi=G.fa.findIndex(p=>!p.rv&&p.c===T.reg&&(p.r===role||p.r==='FLEX'));
      replacement=fi>=0?G.fa.splice(fi,1)[0]:mk(ign(T.reg),role,rnd(62,74),rnd(16,19),T.reg);
    }
    replacement.r=role;replacement.contract=replacement.contract>0?replacement.contract:rnd(1,4);
    T.p[si]=replacement;
    old.contract=0;delete old.rv;delete old.ex;old.old=tn;G.fa.push(old);
  }
}
const impOK=(p,tn,out)=>p.c===G.T[tn].reg||impCount(tn,out)<IMPMAX;
const impMsg=()=>`Import limit: only ${IMPMAX} imports allowed (players not from ${G.T[G.me].reg}).`;

/* ---------- money, fans, news ---------- */
const tally=()=>((G.fin.t??={})[hk()]??={});
function money(a,cat){G.cash+=a;const t=tally();t[cat]=(t[cat]||0)+a}
const news=s=>{(G.news??=[]).unshift(s);if(G.news.length>80)G.news.pop()};
const pay=(t,a)=>{if(t==G.me)money(a,'Prize money');G.T[t].p.forEach(p=>{const v=a*.2/5;p.earn+=v;ent(p,t).earn+=v})};
const ach=(t,x)=>all(t).forEach(p=>p.ach.push(hk()+' · '+x)); // bench players get titles too
const fanLvl=f=>f>=600?'Global':f>=350?'National':f>=180?'Regional':'Local';
const fanBoost=(t,f)=>{if(G.T[t])G.T[t].fans*=f};
function fanMove(m){
  const imp=/^MPL \w\w$/.test(m.tag)?1:/^MPL/.test(m.tag)?1.6:2.2;
  const w=G.T[m.w],l=G.T[m.l];
  if(w)w.fans*=1+.004*imp;
  if(l)l.fans=Math.max(20,l.fans*(1-.0025*imp));
}
const chE=()=>(G.ch[hk()]??={mpl:{}});
const orgEntry=(tn=G.me)=>{const a=ohOf(tn);return a.find(x=>x.k===hk())||(a.push({k:hk()}),a[a.length-1])};

function achHtml(list){
  const g=new Map();
  list.forEach(a=>{
    const i=a.indexOf(' · '),name=i<0?a:a.slice(i+3),k=i<0?'':a.slice(0,i); // k = "2026 S1"
    const o=g.get(name)||{ks:[],n:0};
    o.n++;if(k&&!o.ks.includes(k))o.ks.push(k);
    g.set(name,o);
  });
  return [...g].map(([name,o])=>{
    o.ks.sort();
    const ks=o.ks.length>3?o.ks[0]+' – '+o.ks[o.ks.length-1]:o.ks.join(', ');
    return `<div>🏆 ${name}${o.n>o.ks.length?' ×'+o.n:''} <span class="mu">(${ks})</span></div>`;
  }).join('');
}

/* ---------- new game ---------- */
function mkBench(reg,name){
  const team=TEAM_DB[reg].find(t=>t.name===name);
  return (team?.b||[]).map(([player,role,c])=>mk(player,role,82,undefined,c||reg));
}
function mkTeam(name,reg){
  const team=TEAM_DB[reg].find(t=>t.name===name);
  return team.p.map(([player,role,c])=>mk(player,role,82,undefined,c||reg));
}
function newGame(me){
  used.clear();
  RG.forEach(r=>{R[r]=TEAM_DB[r].map(team=>team.name)});
  G={id:Date.now(),yr:2026,sp:0,st:0,cash:600,me,T:{},pl:{},tb:{},hist:[],fa:[],msg:'',day:null,cur:null,po:{},last:null,god:false,recap:null,pendingRecap:false,lastTournament:null,
     ch:{},oh:[],ret:[],hof:[],news:[],offers:[],nid:0,fin:{t:{},sp:[],off:[],mk:{}}};
  RG.forEach(r=>R[r].forEach(n=>G.T[n]={reg:r,p:mkTeam(n,r),b:mkBench(r,n),fans:60+hs(n+'f')%220,cash:300+hs(n+'c')%300}));
  G.reg=G.T[me].reg;
  G.fin.off=sponsorOffers();
  genFA();genRookies();G.yMsg='';TAB='roster';LR=LT=PV=null;NAV=[];TR=null;render();
  Object.keys(G.T).filter(tn=>tn!==G.me).forEach(aiTrimImports);
  TAB='roster';LR=LT=PV=null;NAV=[];TR=null;render();
}
function genFA(){
  G.fa??=[];
    let n=G.fa.filter(p=>!p.rv&&!p.cls).length;
  while(n<10){
        const c=Math.random()<.15?RG[rnd(0,RG.length-1)]:G.reg;
    const p=mk(ign(c),ROLES[n%5],rnd(66,80),rnd(16,24),c);
    p.contract=0;G.fa.push(p);n++;
  }
}

/* ---------- single game simulation ---------- */
const KW={EXP:1,GOLD:1.6,MID:1.5,JG:1.4,ROAM:.5},DW={EXP:1,GOLD:.8,MID:.9,JG:1,ROAM:1.3},
      AW={EXP:1,GOLD:.8,MID:1,JG:1.1,ROAM:1.8},GW={EXP:1,GOLD:1.25,MID:1.15,JG:1.1,ROAM:.6};
function pick(S,wf,ex){
  const c=S.filter(x=>!ex.includes(x)).map(x=>[x,wf(x)]);
  let r=Math.random()*c.reduce((s,y)=>s+y[1],0);
  for(const [x,w] of c){if((r-=w)<=0)return x}
  return c[0][0];
}
function game(a,b,keep,tag){
  const bk=/^MPL \w\w$/.test(tag)?'rs':/^MPL/.test(tag)?'po':'in';
  const T=[a,b],S=T.map(n=>G.T[n].p.slice().sort((x,y)=>ROLES.indexOf(x.r)-ROLES.indexOf(y.r)).map(p=>({p,k:0,d:0,a:0}))),pr=[0,0],lg=[];
  let min=1,lead=0,tur=0,lord=[0,0],fb=0;
  const L=s=>{if(keep)lg.push(min+"' "+s)};
  while(pr[0]<100&&pr[1]<100&&min<45){
    min+=rnd(1,2);
    const d=rt(a)-rt(b)+lead/600,w=Math.random()<1/(1+Math.exp(-d/5))?0:1,l=1-w,sg=w?-1:1,dead=[];
    const nk=rnd(1,4);
    for(let i=0;i<nk;i++){
      const v=pick(S[l],x=>DW[x.p.r]/x.p.con,dead),k=pick(S[w],x=>KW[x.p.r]*x.p.mec,[]);
      v.d++;k.k++;dead.push(v);
      const as=[];for(let j=rnd(0,2);j>0;j--)as.push(pick(S[w],x=>AW[x.p.r]*x.p.tf,[k,...as]));
      as.forEach(x=>x.a++);
      L((fb++?'':'FIRST BLOOD: ')+k.p.n+' kills '+v.p.n+(as.length?' (assist '+as.map(x=>x.p.n).join(', ')+')':''));
    }
    lead+=sg*nk*300;pr[w]+=rnd(8,15);
    if(Math.random()<.3){const k2=pick(S[l],x=>KW[x.p.r]*x.p.mec,[]),v2=pick(S[w],x=>DW[x.p.r]/x.p.con,[]);
      k2.k++;v2.d++;lead-=sg*300;pr[l]+=3;L(k2.p.n+' trades and kills '+v2.p.n)}
    if(min>=8&&!tur&&Math.random()<.4){tur=1;pr[w]+=8;lead+=sg*400;L(T[w]+' take the Turtle')}
    else if(min>=14&&!lord[w]&&Math.random()<.3){lord[w]=1;pr[w]+=22;lead+=sg*800;L(T[w]+' slay the Lord')}
    else if(Math.random()<.3){pr[w]+=3;L(T[w]+' push down a tower')}
  }
  const wn=pr[0]>=pr[1]?0:1;L(T[wn]+' destroy the base');
  S.forEach((t,i)=>t.forEach(x=>{
    x.gold=Math.round(min*420*GW[x.p.r]+x.k*300+x.a*120);
    const s=x.p.s,e=ent(x.p,T[i])[bk];
    s.g++;s.k+=x.k;s.d+=x.d;s.a+=x.a;
    e.g++;e.k+=x.k;e.d+=x.d;e.a+=x.a;if(i==wn)e.w++;
    x.sc=x.k*3-x.d*1.5+x.a*1.2+(i==wn?4:0)+Math.random();
  }));
  const best=S[wn].reduce((m,x)=>x.sc>m.sc?x:m);best.p.s.m++;ent(best.p,T[wn])[bk].m++;
  return {w:wn,min,ks:S.map(t=>t.reduce((s,x)=>s+x.k,0)),S,lg,mvp:best.p.n};
}
function bo(a,b,n,tag){
  if(b===G.me)[a,b]=[b,a];   // my team always on the left
  const need=(n+1)/2,gs=[];let x=0,y=0;
  while(x<need&&y<need){const g=game(a,b,1,tag);gs.push(g);g.w?y++:x++}
  return {a,b,w:x>y?a:b,l:x>y?b:a,sw:Math.max(x,y),sl:Math.min(x,y),gs,tag,n};
}

/* ---------- tournaments as generators: each yield = one game day ---------- */
function sched(t){const a=t.slice();if(a.length%2)a.push(null);const n=a.length,rs=[];
  for(let r=0;r<n-1;r++){const m=[];for(let i=0;i<n/2;i++)if(a[i]&&a[n-1-i])m.push([a[i],a[n-1-i]]);rs.push(m);a.splice(1,0,a.pop())}
  return rs}
function* par(gs){ // run several tournaments on the same days
  const last=gs.map(()=>undefined),out=[],live=gs.map(()=>true);
  while(true){const ms=[],ix=[];
    gs.forEach((g,i)=>{if(!live[i])return;const r=g.next(last[i]);if(r.done){live[i]=false;out[i]=r.value;return}ix.push([i,r.value.length]);ms.push(...r.value)});
    if(!ms.length)return out;
    const res=yield ms;let p=0;ix.forEach(([i,n])=>{last[i]=res.slice(p,p+n);p+=n});}
}
function* rrG(ts,tag){ // single round robin, BO1
  const tb={};ts.forEach(x=>tb[x]={w:0,l:0});
  for(const rd of sched(ts)){const res=yield rd.map(([a,b])=>[a,b,1,tag]);res.forEach(m=>{tb[m.w].w++;tb[m.l].l++})}
  return ts.slice().sort((a,b)=>tb[b].w-tb[a].w||hs(a)-hs(b));
}
function* mpl(r){
  const T=R[r],tb=G.tb[r]={};T.forEach(x=>tb[x]={w:0,l:0});
  for(let leg=0;leg<2;leg++)for(const rd of sched(T)){
    const res=yield rd.map(([a,b])=>[a,b,3,'MPL '+r]);res.forEach(m=>{tb[m.w].w++;tb[m.l].l++});}
  const s=T.slice().sort((a,b)=>tb[b].w-tb[a].w||hs(a)-hs(b));
  const [o1,o2]=yield [[s[2],s[5],5,'MPL '+r+' Opening'],[s[3],s[4],5,'MPL '+r+' Opening']];
  const [u1,u2]=yield [[s[0],o2.w,5,'MPL '+r+' Upper'],[s[1],o1.w,5,'MPL '+r+' Upper']];
  const [uf,l1]=yield [[u1.w,u2.w,5,'MPL '+r+' Upper Final'],[u1.l,u2.l,5,'MPL '+r+' Lower']];
  const [lf]=yield [[l1.w,uf.l,7,'MPL '+r+' Lower Final']];
  const [gf]=yield [[uf.w,lf.w,7,'MPL '+r+' Grand Final']];
  const fm=finalsMvp(gf);
  if(fm){awd(r).fmvp={id:fm.p.id,n:fm.p.n,t:fm.t};fm.p.ach.push(hk()+' · MPL '+r+' Finals MVP');}
  G.pl[r]=[gf.w,gf.l,lf.l,l1.l,o1.l,o2.l,s[6],s[7],...s.slice(8)];
  const PRIZE=[150,100,70,50,30,30];
  G.pl[r].forEach((t,i)=>pay(t,PRIZE[i]??15));
  ach(gf.w,'MPL '+r+' Champion');ach(gf.l,'MPL '+r+' Runner-up');ach(lf.l,'MPL '+r+' 3rd place');
  (chE().mpl??={})[r]={w:gf.w,l:gf.l};
  fanBoost(gf.w,1.06);fanBoost(gf.l,1.02);
}
function* mplAll(){
  yield* par(RG.map(mpl));
  const t=RG.map(r=>r+' '+G.pl[r][0]).join(', ');
  G.msg='MPL champions: '+t;G.hist.unshift(`${G.yr} S${G.sp+1} MPL champions: ${t}`);
}
function pool(n){
  const a=[];RG.forEach(r=>G.pl[r].slice(0,6).forEach((t,i)=>a.push([i,t])));
  a.sort((x,y)=>x[0]-y[0]||rt(y[1])-rt(x[1]));const t=a.map(x=>x[1]);
  if(n==25)t.push(RG.map(r=>G.pl[r][6]).sort((x,y)=>rt(y)-rt(x))[0]);
  return t.slice(0,n);
}
function fin(n,m,p){
  pay(m.w,p);
  pay(m.l,p/2);
  ach(m.w,n+' Champion');
  ach(m.l,n+' Runner-up');
    const fm=finalsMvp(m);
  awd('intl').n=n;if(fm)awd('intl').fmvp={id:fm.p.id,n:fm.p.n,t:fm.t};
  if(fm)fm.p.ach.push(hk()+' · '+n+' Finals MVP');
  G.lastTournament={name:n,winner:m.w,runnerUp:m.l,score:`${m.sw}-${m.sl}`,fmvp:fm?fm.p.n:'—'};
  chE().intl={n,w:m.w,l:m.l,sc:`${m.sw}-${m.sl}`,fmvp:fm?fm.p.n:'—'};
  fanBoost(m.w,1.12);fanBoost(m.l,1.04);
  G.hist.unshift(`${G.yr} ${n}: ${m.w} def. ${m.l} ${m.sw}-${m.sl}`+(fm?` (Finals MVP: ${fm.p.n})`:''));
  G.msg=`${n} champion: ${m.w}`;
}
/* MSC */
function* mscWC(){
  const q=G.q=G.q||pool(25),w=q.slice(15);
  const [A,B]=yield* par([rrG([w[0],w[3],w[4],w[7],w[8]],'Wild Card A'),rrG([w[1],w[2],w[5],w[6],w[9]],'Wild Card B')]);
  const [x,y]=yield [[A[3],B[2],3,'Gauntlet'],[B[3],A[2],3,'Gauntlet']];
  const [g1,g2]=yield [[x.w,B[1],3,'Gauntlet'],[y.w,A[1],3,'Gauntlet']];
  const [d1,d2]=yield [[A[0],g2.w,3,'Decider'],[B[0],g1.w,3,'Decider']];
  const [d]=yield [[d1.w,d2.w,3,'Decider']];
  G.f=[...q.slice(0,15),d.w];
}
function* g8(t,n){
  const tg='MSC Group '+n,r1=yield [0,1,2,3].map(i=>[t[i],t[7-i],3,tg]);
  const [wa,wb,la,lb]=yield [[r1[0].w,r1[1].w,3,tg],[r1[2].w,r1[3].w,3,tg],[r1[0].l,r1[1].l,3,tg],[r1[2].l,r1[3].l,3,tg]];
  const [ma,mb]=yield [[la.w,wb.l,3,tg],[lb.w,wa.l,3,tg]];
  return {top:[wa.w,wb.w],mid:[ma.w,mb.w]};
}
function* mscGroups(){
  const f=G.f,r=yield* par([g8([0,3,4,7,8,11,12,15].map(i=>f[i]),'A'),g8([1,2,5,6,9,10,13,14].map(i=>f[i]),'B')]);
  G.top=[...r[0].top,...r[1].top];G.mid=[...r[0].mid,...r[1].mid];
}
function* mscKO(){
  const m=G.mid.slice().sort((a,b)=>rt(a)-rt(b)),tp=G.top.slice().sort((a,b)=>rt(b)-rt(a));
  const q=yield tp.map(t=>[t,m.shift(),3,'MSC Quarterfinal']);
  const s=yield [[q[0].w,q[1].w,5,'MSC Semifinal'],[q[2].w,q[3].w,5,'MSC Semifinal']];
  const [f]=yield [[s[0].w,s[1].w,7,'MSC Grand Final']];
  fin('MSC',f,300);
}
/* M Series */
function* mWC(){
  const q=G.q=G.q||pool(23),w=q.slice(13);
  const [A,B]=yield* par([rrG([w[0],w[3],w[4],w[7],w[8]],'Wild Card A'),rrG([w[1],w[2],w[5],w[6],w[9]],'Wild Card B')]);
  const s=yield [[A[1],B[2],5,'Phase 2'],[B[1],A[2],5,'Phase 2']];
  const [p]=yield [[s[0].w,s[1].w,5,'Phase 2']];
  G.f=[...q.slice(0,13),A[0],B[0],p.w];
}
function* mSwiss(){
  const t=G.f,r={};t.forEach(x=>r[x]={w:0,l:0});
  for(let k=0;k<5;k++){const gp={};
    t.filter(x=>r[x].w<3&&r[x].l<3).forEach(x=>(gp[r[x].w+'-'+r[x].l]??=[]).push(x));
    const ms=[];for(const g in gp){const a=gp[g].sort(()=>Math.random()-.5);for(let i=0;i+1<a.length;i+=2)ms.push([a[i],a[i+1],3,'Swiss '+g])}
    if(!ms.length)break;
    const res=yield ms;res.forEach(m=>{r[m.w].w++;r[m.l].l++});}
  G.k=t.slice().sort((a,b)=>r[b].w-r[a].w||r[a].l-r[b].l).slice(0,8);
}
function* mKO(){
  const s=G.k,u1=yield [0,1,2,3].map(i=>[s[i],s[7-i],3,'Upper R1']);
  const [u2a,u2b,l1a,l1b]=yield [[u1[0].w,u1[3].w,5,'Upper'],[u1[1].w,u1[2].w,5,'Upper'],[u1[0].l,u1[3].l,5,'Lower'],[u1[1].l,u1[2].l,5,'Lower']];
  const [uf,l2a,l2b]=yield [[u2a.w,u2b.w,5,'Upper Final'],[l1a.w,u2b.l,5,'Lower'],[l1b.w,u2a.l,5,'Lower']];
  const [l3]=yield [[l2a.w,l2b.w,5,'Lower']];
  const [lf]=yield [[l3.w,uf.l,5,'Lower Final']];
  const [gf]=yield [[uf.w,lf.w,7,'M Series Grand Final']];
  fin('M Series',gf,500);
}
const ST=[
 [['MPL Season',mplAll],['MSC Wild Card',mscWC],['MSC Group Stage',mscGroups],['MSC Knockout',mscKO]],
 [['MPL Season',mplAll],['M Series Wild Card',mWC],['M Series Swiss Stage',mSwiss],['M Series Knockout',mKO]]];

/* =====================================================================
   FREE AGENCY, AI TRANSFERS, OFFERS
   ===================================================================== */
/* a player whose deal ended goes to the market with hidden offers from other teams */
function toMarket(p,tn){
  p.contract=0;p.nt=0;p.ex=1;p.old=tn;
  const ai=Object.keys(G.T).filter(t=>t!==G.me&&t!==tn),rv=[];
  const n=ov(p)>=88?3:ov(p)>=80?2:1; // better players attract more suitors
  if(tn!==G.me&&Math.random()<.7)rv.push({t:tn,r:+((.8+Math.random()*.4)*1.05).toFixed(2)}); // old team gets a 5% edge
  for(let i=0;i<n&&ai.length;i++){
    const t=ai.splice(rnd(0,ai.length-1),1)[0];
    rv.push({t,r:+(.8+Math.random()*.4).toFixed(2)});
  }
  if(!rv.length)rv.push({t:Object.keys(G.T).find(t=>t!==G.me),r:.9});
  p.rv=rv;
  G.fa.unshift(p);
  G.faOpen=true;
}

/* contracts tick down after every MSC / M Series. EVERY expiring player (all teams) hits free agency */
function advanceContracts(){
  const expired=[],back=[];
  for(const tn of Object.keys(G.T))G.T[tn].win=winScore(tn);
  for(const tn of Object.keys(G.T)){
    const team=G.T[tn];
    for(const field of ['p','b']){
      const list=team[field];
      for(let i=list.length-1;i>=0;i--){
        const p=list[i];
        p.contract=Math.max(0,(p.contract??rnd(1,4))-1);
        p.nt=0;
        if(p.loan)p.loan.left--;
        if(p.contract>0){
          if(p.loan&&p.loan.left<=0){list.splice(i,1);back.push({p,tn})} // loan over
          continue;
        }
        // contract ended: winning AI teams often re-sign instead of losing him
        if(!p.loan&&tn!==G.me&&Math.random()<keepChance(tn,p)){
          p.contract=rnd(1,3);
          if(ov(p)>=80)news(`${tn} re-signed ${p.n} (${p.r}, OVR ${ov(p)})`);
          continue;
        }
        const home=p.loan?.from??tn;
        list.splice(i,1);delete p.loan;
        if(home===G.me)expired.push(`${p.n} (${p.r})`);
        toMarket(p,home);
      }
    }
  }
  back.forEach(({p,tn})=>{
    const home=p.loan.from;delete p.loan;
    if(home===G.me){place(p);news(`${p.n} is back from his loan at ${tn}`)}
    else{aiPlace(p,home);if(tn===G.me)news(`${p.n} returned to ${home} after his loan with you`)}
    if(tn!==G.me)aiFix(tn);
  });
  return expired;
}

/* keep an AI roster legal: 5 starters, 1 to BMAX subs */
function aiFix(tn){
  const T=G.T[tn];
  for(const role of ROLES){
    if(T.p.some(x=>x.r===role))continue;
    let x=null,j=T.b.findIndex(y=>y.r===role);
    if(j<0)j=T.b.findIndex(y=>y.r==='FLEX');
    if(j>=0)x=T.b.splice(j,1)[0];
    else{
      let bi=-1;
      G.fa.forEach((f,i)=>{if(!f.rv&&f.r===role&&(bi<0||ov(f)>ov(G.fa[bi])))bi=i});
      if(bi>=0){x=G.fa.splice(bi,1)[0];news(`${tn} signed free agent ${x.n} (${role}, OVR ${ov(x)})`)}
      else x=mk(ign(T.reg),role,rnd(62,74),rnd(16,19),T.reg);
    }
    x.r=role;x.contract=x.contract>0?x.contract:rnd(1,4);delete x.old;T.p.push(x);
  }
  while(T.b.length>BMAX){
        let w=-1;T.b.forEach((y,i)=>{if(!y.loan&&(w<0||ov(y)<ov(T.b[w])))w=i});
    if(w<0)break;
    const d=T.b.splice(w,1)[0];d.contract=0;delete d.rv;d.old=tn;G.fa.push(d);
  }
  if(!T.b.length)T.b.push(mk(ign(T.reg),ROLES[rnd(0,4)],rnd(60,72),rnd(16,19),T.reg));
  aiTrimImports(tn);
}
const aiFixAll=()=>Object.keys(G.T).filter(n=>n!==G.me).forEach(aiFix);

/* an AI team adds a player: he takes the starting spot if he is better */
function aiPlace(p,tn){
  const T=G.T[tn];
  if(p.r==='FLEX'){const w=T.p.slice().sort((a,b)=>ov(a)-ov(b))[0];p.r=w?w.r:'EXP'}
  const j=T.p.findIndex(x=>x.r===p.r);
  const outgoing=j>=0&&ov(p)>ov(T.p[j])?T.p[j]:null;
  if(!aiCanReceive(p,tn,outgoing))return false;
  if(j<0)T.p.push(p);
  else if(ov(p)>ov(T.p[j])){T.b.push(T.p[j]);T.p[j]=p}
  else T.b.push(p);
  delete p.rv;delete p.ex;delete p.old;
  aiFix(tn);aiTrimImports(tn);
  return true;
}

/* AI teams buy out and trade with each other */
function aiMoves(){
  const ai=shuf(Object.keys(G.T).filter(n=>n!==G.me));
  const goal=rnd(3,6);let done=0;
  for(const tn of ai){
    if(done>=goal)break;
    const B=G.T[tn],w=B.p.filter(x=>!x.loan).sort((a,b)=>ov(a)-ov(b))[0];
    if(!w)continue;
    const pool=[];
    for(const on of ai){
      if(on===tn)continue;
      const S=G.T[on];
            for(const p of [...S.p,...S.b])if((p.r===w.r||p.r==='FLEX')&&ov(p)>=ov(w)+4&&!p.loan)pool.push({p,on});
    }
    if(!pool.length)continue;
        const c=pool.sort((a,b)=>ov(b.p)-ov(a.p)).slice(0,3)[rnd(0,Math.min(2,pool.length-1))];
    if(Math.random()<(G.T[c.on].win??.5)*.6)continue; // winning teams refuse to sell
    const price=bcost(c.p);
    const outgoing=B.p.find(x=>x.r===c.p.r);
    if(!aiCanReceive(c.p,tn,outgoing))continue;
    if(B.cash>=price&&Math.random()<.65){ // buyout
      const S=G.T[c.on];
      removeFrom(S,c.p);B.cash-=price;S.cash+=price;
      c.p.contract=rnd(1,4);
      if(!aiPlace(c.p,tn)){
        removeFrom(B,c.p);aiPlace(c.p,c.on);B.cash+=price;S.cash-=price;continue;
      }
      aiFix(c.on);
      news(`${tn} bought out ${c.p.n} (${c.p.r}, OVR ${ov(c.p)}) from ${c.on} for $${price}k`);done++;
    }else{ // trade: their weakest starter + cash for the target
      const ask=Math.round(tv(c.p)*greedT(c.on,c.p)),offer=tv(w),diff=Math.max(0,ask-offer);
      if(B.cash<diff)continue;
      const S=G.T[c.on];
      if(!aiCanReceive(c.p,tn,w)||!aiCanReceive(w,c.on,c.p))continue;
      removeFrom(B,w);removeFrom(S,c.p);
      B.cash-=diff;S.cash+=diff;
      c.p.contract=c.p.contract||rnd(1,4);
      aiPlace(c.p,tn);aiPlace(w,c.on);
      news(`${tn} traded ${w.n} (OVR ${ov(w)})${diff?` + $${diff}k`:''} to ${c.on} for ${c.p.n} (OVR ${ov(c.p)})`);done++;
    }
  }
  // contender / rebuilding swaps: win-now player for a higher-potential player
  for(let i=0;i<rnd(1,3);i++){
    const [A,B]=shuf(ai).slice(0,2);if(!A||!B)continue;
        const role=ROLES[rnd(0,4)],pa=G.T[A].p.find(x=>x.r===role&&!x.loan),pb=G.T[B].p.find(x=>x.r===role&&!x.loan);
    if(!pa||!pb)continue;
    if(ov(pb)>ov(pa)+3&&pa.pot>=pb.pot+3&&Math.abs(tv(pa)-tv(pb))<=tv(pb)*.35){
      const diff=Math.max(0,tv(pb)-tv(pa)),X=G.T[A],Y=G.T[B];
      if(X.cash<diff||!aiCanReceive(pb,A,pa)||!aiCanReceive(pa,B,pb))continue;
      X.cash-=diff;Y.cash+=diff;
      removeFrom(X,pa);removeFrom(Y,pb);
      aiPlace(pb,A);aiPlace(pa,B);
      news(`${A} traded ${pa.n} (OVR ${ov(pa)}, POT ${pa.pot}) to ${B} for ${pb.n} (OVR ${ov(pb)})${diff?` + $${Math.round(diff)}k`:''}`);
    }
  }
}

/* AI teams make offers for YOUR players */
function aiOffers(){
  G.offers=[];
    const mine=all(G.me).filter(p=>!p.loan);
  for(const tn of shuf(Object.keys(G.T).filter(n=>n!==G.me))){
    if(G.offers.length>=4)break;
    if(Math.random()>.3)continue;
    const T=G.T[tn],w=T.p.slice().sort((a,b)=>ov(a)-ov(b))[0];
    if(!w)continue;
    const c=mine.filter(p=>p.r===w.r&&ov(p)>=ov(w)+3&&!G.offers.some(x=>x.pid===p.id));
    if(!c.length)continue;
    const p=c[rnd(0,c.length-1)],price=Math.round(bcost(p)*cmult(p)*rf(1,1.25));
    if(T.cash>=price&&Math.random()<.55){
      G.offers.push({id:++G.nid,type:'buyout',from:tn,pid:p.id,amt:price});
    }else{
      const mate=[...T.p,...T.b].filter(x=>x.r===p.r&&ov(x)<ov(p)).sort((a,b)=>ov(b)-ov(a))[0];
      if(!mate)continue;
      const cash=Math.max(0,Math.round(tv(p)-tv(mate)));
      if(T.cash<cash)continue;
      G.offers.push({id:++G.nid,type:'trade',from:tn,pid:p.id,give:mate.id,cash});
    }
  }
}

function canRoom(p,out){ // can I place p after `out` leaves?
  const A=G.T[G.me];
  return (ROLES.includes(p.r)&&!A.p.some(x=>x!==out&&x.r===p.r))||A.b.length-(A.b.includes(out)?1:0)<BMAX;
}
function acceptOffer(id){
  const o=G.offers.find(x=>x.id===id);if(!o)return;
  const f=findP(o.pid),B=G.T[o.from],A=G.T[G.me];
  const drop=()=>{G.offers=G.offers.filter(x=>x!==o)};
  if(!f||f.t!==G.me){drop();G.msg='That player is no longer on your roster.';return render()}
  const p=f.p;
  if(o.type==='buyout'){
    if(B.cash<o.amt){drop();G.msg=`${o.from} can no longer afford the offer.`;return render()}
    removeFrom(A,p);money(o.amt,'Transfers');B.cash-=o.amt;
    p.contract=p.contract||1;aiPlace(p,o.from);
    G.msg=`Sold ${p.n} to ${o.from} for $${o.amt}k.`;
    news(`${o.from} bought ${p.n} from ${G.me} for $${o.amt}k`);
  }else{
    const gf=findP(o.give);
    if(!gf||gf.t!==o.from||B.cash<o.cash){drop();G.msg='That trade is no longer available.';return render()}
    if(!canRoom(gf.p,p)){G.msg=`No room on your roster for ${gf.p.n}. Release someone first.`;return render()}
    const g=gf.p;
    removeFrom(A,p);removeFrom(B,g);
    money(o.cash,'Transfers');B.cash-=o.cash;
    aiPlace(p,o.from);place(g);
    G.msg=`Traded ${p.n} to ${o.from} for ${g.n}`+(o.cash?` (+$${o.cash}k)`:'')+'.';
    news(`${o.from} traded ${g.n} to ${G.me} for ${p.n}`);
  }
  G.offers=G.offers.filter(x=>x.pid!==p.id);
  render();
}
function declineOffer(id){G.offers=G.offers.filter(x=>x.id!==id);render()}

function signAIpick(p){ // best suitor that still has room in this window
  return p.rv.slice().sort((a,b)=>b.r-a.r);
}
function closeFA(){
  if(!G.faOpen)return '';
  G.faOpen=false;
  const cnt={},signed=[];
  const rvs=G.fa.filter(p=>p.rv).sort((a,b)=>ov(b)-ov(a));
  for(const p of rvs){
    const opts=signAIpick(p).filter(x=>(cnt[x.t]||0)<2); // a team signs at most 2 per window
    const i=G.fa.indexOf(p);
    if(!opts.length){delete p.rv;delete p.ex;continue}   // nobody picked him: stays a free agent
    const w=opts[0];cnt[w.t]=(cnt[w.t]||0)+1;
    G.fa.splice(i,1);
    p.contract=rnd(1,4);
    aiPlace(p,w.t);
    signed.push({p,t:w.t});
    news(`${p.n} (${p.r}, OVR ${ov(p)}) signed with ${w.t}`);
  }
  aiFixAll();
  aiMoves();
  aiOffers();
  aiRookies();
  // keep the pool tidy
    const gen=G.fa.filter(p=>!p.rv&&!p.cls).sort((a,b)=>ov(a)-ov(b));
  while(gen.length>24){const d=gen.shift();G.fa.splice(G.fa.indexOf(d),1)}
  genFA();
  if(!signed.length)return '';
  const top=signed.sort((a,b)=>ov(b.p)-ov(a.p)).slice(0,5).map(x=>`${x.p.n} → ${x.t}`).join(', ');
  G.hist.unshift(`${G.yr} S${G.sp+1} free agency: ${signed.length} players signed. Top: ${top}`);
  return `Free agency closed: ${signed.length} players signed with other teams (${top}${signed.length>5?', …':''}). See the Market for transfer news.`;
}

/* =====================================================================
   PROGRESSION, RETIREMENT, HALL OF FAME
   ===================================================================== */
const retireChance=(p,a=p.age)=>{
  if(a<31)return 0;
  if(a>=38)return 1;
  return Math.min(1,({31:.08,32:.18,33:.35,34:.55}[a]??.85)+(ov(p)<70?.15:0));
};
const retiring=p=>G.rp?G.rp.includes(p.id):Math.random()<retireChance(p);
function planRetire(){
  const ids=[],rows=[];
  const roll=(p,tn)=>{
    const by=p.by??G.yr-p.age,a=G.yr+1-by;
    if(Math.random()>=retireChance(p,a))return;
    ids.push(p.id);
    rows.push({n:p.n,r:p.r,age:a-1,team:tn,mine:tn===G.me,pk:Math.max(p.pk||0,ov(p)),sc:hofScore(p)});
  };
  for(const tn in G.T)all(tn).forEach(p=>roll(p,tn));
  G.fa.forEach(p=>roll(p,p.old||'Free agent'));
  G.rp=ids;
  return rows.sort((x,y)=>(y.mine-x.mine)||y.pk-x.pk);
}
function develop(p,boost=0){
    p.by??=G.yr-p.age;p.age=G.yr+1-p.by;
  const a=p.age,gap=Math.max(0,p.pot-ov(p));
  const base=a<=25?Math.round(gap*rf(.25+boost,.55+boost)):a<=28?0:a<=30?-rnd(0,2):a<=33?-rnd(1,3):-rnd(2,4);
  ['mec','mac','tf','con'].forEach(s=>{
    let d=base+(a<=25?rnd(-2,2):rnd(-1,1));
    if(a>=29)d+=s==='mec'?-1:s==='mac'?1:0; // reflexes fade first, game sense holds
    p[s]=cl(p[s]+d);
  });
  if(a<=22)p.pot=cl(p.pot+rnd(-2,2));
  p.pot=a>=26?ov(p):Math.max(p.pot,ov(p));
  p.pk=Math.max(p.pk||0,ov(p));
}
function hofScore(p){
  let s=0;
  p.ach.forEach(a=>{
    const n=a.slice(a.indexOf(' · ')+3);
    if(/^(MSC|M Series) Champion/.test(n))s+=12;
        else if(/Finals MVP/.test(n))s+=6;
    else if(/Tournament MVP/.test(n))s+=5;
    else if(/All-Tournament/.test(n))s+=2;
    else if(/Champion$/.test(n))s+=5;
    else if(/Regular Season MVP/.test(n))s+=6;
    else if(/Runner-up/.test(n))s+=2;
    else if(/All-League 1st/.test(n))s+=3;
    else if(/All-League 2nd/.test(n))s+=1.5;
    else if(/All-League 3rd/.test(n))s+=1;
    else if(/Rookie of the Year/.test(n))s+=2;
  });
  s+=Math.min(10,Object.keys(p.h).length*.8)+Math.max(0,(p.pk||0)-85)*.5;
  return Math.round(s);
}
function retire(p,tn){
  const c=S0();
  Object.values(p.h).forEach(e=>['rs','po','in'].forEach(b=>{for(const x in c)c[x]+=e[b][x]}));
    const teams=[...new Set(Object.values(p.h).flatMap(e=>e.ts||[e.t]))];
  const rec={id:p.id,n:p.n,r:p.r,age:p.by!=null?G.yr-p.by:p.age-1,by:p.by,yr:G.yr,team:tn,teams,pk:p.pk||ov(p),
    pot:p.pot,mec:p.mec,mac:p.mac,tf:p.tf,con:p.con,contract:p.contract||0,
    h:JSON.parse(JSON.stringify(p.h||{})),ach:p.ach.slice(),c,earn:Math.round(p.earn),sc:hofScore(p)};
  rec.hof=rec.sc>=HOF_MIN;
  G.ret.unshift(rec);if(G.ret.length>300)G.ret.pop();
  if(rec.hof){G.hof.unshift(rec);G.hist.unshift(`${G.yr} Hall of Fame: ${p.n} retired and was inducted (score ${rec.sc})`)}
  return rec;
}
function developAll(){
  const mineRows=[],ret=[];
  for(const tn in G.T){
    const T=G.T[tn];
    for(const f of ['p','b']){
      for(let i=T[f].length-1;i>=0;i--){
        const p=T[f][i],from=ov(p);
        develop(p);
        if(retiring(p)){T[f].splice(i,1);ret.push({p,tn,o:ov(p),rec:retire(p,tn)});continue}
        if(tn===G.me)mineRows.push({p,from,to:ov(p)});
      }
    }
  }
  for(let i=G.fa.length-1;i>=0;i--){
    const p=G.fa[i];develop(p);
    if(retiring(p)){ret.push({p,tn:p.old||'Free agent',o:ov(p),rec:retire(p,p.old||'Free agent')});G.fa.splice(i,1)}
  }
    acad();
  for(let i=G.ac.length-1;i>=0;i--){
    const p=G.ac[i];develop(p,.04*G.acad.lv);
    if(p.age>=21){G.ac.splice(i,1);p.contract=0;p.old='Academy';G.fa.push(p);news(`${p.n} aged out of ${G.me}'s academy and is now a free agent`)}
  }
  const mr=ret.filter(x=>x.tn===G.me),big=ret.filter(x=>x.tn!==G.me&&x.o>=80);
const hf=ret.filter(x=>x.rec.hof);
    if(mr.length||big.length)G.hist.unshift(`${G.yr} retirements: `+[...mr,...big].map(x=>`${x.p.n} (${x.tn}, ${x.rec.age}, OVR ${x.o})`).join(', '));
  const mv=mineRows.map(r=>({...r,d:r.to-r.from})).sort((a,b)=>b.d-a.d);
  const up=mv.filter(r=>r.d>0).slice(0,3),dn=mv.filter(r=>r.d<0).slice(-3).reverse();
  const f2=r=>`${r.p.n} ${r.from}→${r.to} (${r.d>0?'+':''}${r.d})`;
  let h=`<b>${G.yr} offseason</b>`;
  if(up.length)h+=`<br>📈 ${up.map(f2).join(', ')}`;
  if(dn.length)h+=`<br>📉 ${dn.map(f2).join(', ')}`;

    if(mr.length)h+=`<br>👋 Retired from your team: ${mr.map(x=>`${x.p.n} (${x.rec.age})${x.rec.hof?' ⭐ Hall of Fame':''}`).join(', ')}. Sign replacements in the Market before simming.`;
  if(hf.length)h+=`<br>⭐ Hall of Fame inductees: ${hf.map(x=>x.p.n).join(', ')}`;
  return h;
}
function rollover(){
  archivePO();
  const rep=G.sp?developAll():'';
    G.rp=null;
  G.st=0;
  G.cur=null;
  G.tb={};G.pl={};G.po={};
  if(G.sp){
    G.yr++;
    G.sp=0;
    genFA();
        genDraft();
        for(const k in G.T)all(k).forEach(p=>p.s=S0());
    genRookies();
    genYouth();
  }
    if(rep)G.msg=rep+(G.yMsg?'<br>'+G.yMsg:'');
  G.yMsg='';
}
/* =====================================================================
   ROOKIE DRAFT + SCOUTING (runs every new year, after the M Series)
   ===================================================================== */
const DR_FUZZ=5,SCOUT_COST=10;
const potTxt=p=>(p.scouted||p.fz==null)?p.pot:'~'+Math.min(99,Math.round(p.pot+p.fz));
const drTeam=()=>G.dr.order[G.dr.pick];
function mkProspect(){
  const c=RG[rnd(0,RG.length-1)],age=rnd(16,19);
  const o=rnd(55,70)+(Math.random()<.12?rnd(4,8):0);   // a few are nearly ready
  const p=mk(ign(c),ROLES[rnd(0,4)],o,age,c);
  p.rk=1;p.dy=G.yr;p.contract=0;
  p.pot=Math.min(99,ov(p)+rnd(8,26));
  p.pk=ov(p);p.fz=rnd(-DR_FUZZ,DR_FUZZ);p.scouted=0;   // fz = scouting error on the shown POT
  return p;
}
function genDraft(){
  const names=Object.keys(G.T);
  const order=names.slice().sort((a,b)=>(G.T[a].win??.5)-(G.T[b].win??.5)||hs(a)-hs(b)); // worst picks first
  G.dr={yr:G.yr,pool:Array.from({length:names.length+12},mkProspect),order,pick:0,done:false,log:[]};
  drAdvance(true);
}
function aiDraftPick(tn){
  const T=G.T[tn],c=G.dr.pool.filter(p=>aiCanReceive(p,tn,null));
  if(!c.length)return null;
  const sc=p=>p.pot*.6+ov(p)*.4+(T.p.some(x=>x.r===p.r&&ov(x)>=70)?0:3)+rf(-4,4);
  return c.sort((a,b)=>sc(b)-sc(a))[0];
}
function drTake(p,tn){
  const D=G.dr;
  D.pool.splice(D.pool.indexOf(p),1);
  p.contract=rnd(2,4);delete p.fz;
  D.log.push(`#${D.pick+1} ${tn}: ${p.n} (${p.r}, ${p.age}, OVR ${ov(p)})`);
  if(tn!==G.me&&!aiPlace(p,tn)){p.contract=0;G.fa.push(p)}
}
function drAdvance(stopAtMe){
  const D=G.dr;
  while(D.pick<D.order.length&&D.pool.length){
    const tn=D.order[D.pick];
    if(tn===G.me){
      if(stopAtMe)return;
      D.log.push(`#${D.pick+1} ${tn}: passed`);D.pick++;continue;
    }
    const p=aiDraftPick(tn);
    if(p)drTake(p,tn);else D.log.push(`#${D.pick+1} ${tn}: passed`);
    D.pick++;
  }
  finishDraft();
}
function finishDraft(){
  const D=G.dr;if(D.done)return;
  D.pool.forEach(p=>{delete p.fz;p.contract=0;G.fa.push(p)});   // undrafted -> free agency
  D.pool=[];D.done=true;
  if(D.log[0])G.hist.unshift(`${D.yr} Rookie Draft: ${D.log[0]}`);
}
function scoutP(id){
  const p=G.dr?.pool.find(x=>x.id==id);if(!p||p.scouted)return;
  if(G.cash<SCOUT_COST){G.msg=`Scouting costs $${SCOUT_COST}k.`;return render()}
  money(-SCOUT_COST,'Scouting');p.scouted=1;render();
}
function draftPick(id){
  const D=G.dr;if(!D||D.done||drTeam()!==G.me)return;
  const p=D.pool.find(x=>x.id==id);if(!p)return;
  if(!canPlace(p)){G.msg=`Your bench is full (${BMAX}). Release someone first, then pick.`;return render()}
  drTake(p,G.me);const where=place(p);
  G.msg=`Drafted ${p.n} with pick #${D.pick+1}. Added to your ${where}.`;
  D.pick++;
  drAdvance(true);
  render();
}
function draftAuto(){
  const D=G.dr;if(!D||D.done||drTeam()!==G.me)return;
  const est=p=>ov(p)*.4+(p.pot+(p.scouted?0:p.fz))*.6;
  const b=D.pool.slice().sort((x,y)=>est(y)-est(x))[0];
  if(b)draftPick(b.id);
}
function draftPass(){
  const D=G.dr;if(!D||D.done||drTeam()!==G.me)return;
  D.log.push(`#${D.pick+1} ${G.me}: passed`);D.pick++;
  drAdvance(true);G.msg='You skipped your pick.';render();
}
function draftHtml(){
  const D=G.dr;
  if(!D)return '<div class="box mu">The rookie draft opens at the start of every new year, after the M Series. Prospects are 16-19 years old with high potential.</div>';
  const mine=!D.done&&drTeam()===G.me,pos=D.order.indexOf(G.me)+1;
  let h=`<div class="box"><b>${D.yr} Rookie Draft</b> · ${D.done?'Draft complete':`pick ${D.pick+1} of ${D.order.length} · on the clock: <b>${drTeam()}</b>${mine?' (you)':''}`}
    <p class="mu">Order is the reverse of last year's results; you pick #${pos}. Unscouted POT is an estimate (off by up to ±${DR_FUZZ}); scouting costs $${SCOUT_COST}k and shows the true number. If you sim before picking, your pick is skipped, the draft finishes automatically and undrafted prospects go to free agency. Rookies from this class are eligible for Rookie of the Year, but bench players don't play, so use Start in the Roster tab.</p>
    ${mine?`<button onclick="draftAuto()">Auto-pick best available</button> <button class="t" onclick="draftPass()">Skip my pick</button>`:''}</div>`;
  if(!D.done&&D.pool.length){
    const pool=D.pool.slice().sort((a,b)=>ov(b)-ov(a)||a.n.localeCompare(b.n));
    h+=`<div class="box"><b>Prospects (${pool.length})</b><table><tr><th>Role</th><th>Player</th><th>Age</th><th>Ctry</th><th>MEC</th><th>MAC</th><th>TF</th><th>CON</th><th>OVR</th><th>POT</th><th></th><th></th></tr>
    ${pool.map(p=>`<tr><td>${p.r}</td><td class="hi">${pl(p)}</td><td>${p.age}</td><td>${ctry(p)}</td><td>${p.mec}</td><td>${p.mac}</td><td>${p.tf}</td><td>${p.con}</td><td class="hi">${ov(p)}</td><td>${potTxt(p)}${p.scouted?' ✔':''}</td>
      <td>${p.scouted?'<span class="mu">scouted</span>':`<button class="t" onclick="scoutP(${p.id})" ${G.cash<SCOUT_COST?'disabled':''}>Scout $${SCOUT_COST}k</button>`}</td>
      <td>${mine?`<button onclick="draftPick(${p.id})">Draft</button>`:''}</td></tr>`).join('')}</table></div>`;
  }
  h+=`<div class="box"><details ${D.done?'open':''}><summary><b>Draft board</b> (${D.log.length} picks)</summary>${D.log.map(x=>`<div>${x}</div>`).join('')||'<span class="mu">No picks yet.</span>'}</details></div>`;
  return h;
}

/* =====================================================================
   FINANCE: sponsors, merch, tickets, wages
   ===================================================================== */
function sponsorOffers(){
  const f=G.T[G.me].fans,out=[];
  const names=shuf(SPONS.filter(n=>!G.fin.sp.some(s=>s.name===n)));
  for(let i=0;i<3&&i<names.length;i++){
    const pay=Math.round(f*rf(.05,.1)+rnd(8,18));
    out.push({id:++G.nid,name:names[i],pay,len:rnd(2,4),clause:CLAUSES[rnd(0,CLAUSES.length-1)].k,bonus:Math.round(pay*.5)});
  }
  return out;
}
const clauseTxt=k=>CLAUSES.find(c=>c.k===k)?.t||'';
function clauseMet(k){
  const pos=G.pl[G.reg]?.indexOf(G.me)??-1;
  if(k==='top6')return pos>=0&&pos<6;
  if(k==='intl')return (G.io[hk()]||[]).some(m=>m.a===G.me||m.b===G.me);
  if(k==='title')return pos===0||G.lastTournament?.winner===G.me;
  return false;
}
function acceptSpon(id){
  const o=G.fin.off.find(x=>x.id===id);if(!o)return;
  if(G.fin.sp.length>=4){G.msg='You can only hold 4 sponsorship deals at once.';return render()}
  G.fin.sp.push({id:o.id,name:o.name,pay:o.pay,left:o.len,clause:o.clause,bonus:o.bonus});
  G.fin.off=G.fin.off.filter(x=>x!==o);
  G.msg=`Signed ${o.name}: $${o.pay}k per split for ${o.len} splits.`;
  render();
}
function campaign(k){
  const C={social:{c:30,f:.025,n:'Social media campaign'},event:{c:60,f:.05,n:'Fan meet-and-greet tour'}}[k];
  const fl=(G.fin.mk??={}),key=hk()+k;
  if(fl[key]){G.msg=`You already ran the ${C.n.toLowerCase()} this split.`;return render()}
  if(G.cash<C.c){G.msg=`You need $${C.c}k for that.`;return render()}
  money(-C.c,'Marketing');fl[key]=1;
  G.T[G.me].fans*=1+C.f;
  G.msg=`${C.n}: +${(C.f*100).toFixed(1)}% fans.`;
  render();
}
/* runs once per split, when the international event ends */
function settleSplit(){
  const me=G.T[G.me],stars=me.p.filter(p=>ov(p)>=88).length;
  G.fin.sp.forEach(s=>{
    money(s.pay,'Sponsors');
    if(clauseMet(s.clause))money(s.bonus,'Sponsors');
    s.left--;
  });
  G.fin.sp=G.fin.sp.filter(s=>s.left>0);
  money(Math.round(me.fans*.14*(1+stars*.15)*rf(.9,1.1)),'Merch');
  const wages=all(G.me).reduce((s,p)=>s+Math.max(2,(ov(p)-62)*WAGE),0);
    if(wages>0)money(-Math.round(wages),'Wages');
  if(acUp()>0)money(-acUp(),'Academy');
  for(const tn in G.T){
    const T=G.T[tn],st=T.p.filter(p=>ov(p)>=88).length;
    T.fans=Math.max(20,T.fans*.99+st*2);
    if(tn!==G.me)T.cash=Math.min(1500,T.cash+rnd(100,200)+T.fans*.2);
  }
  G.fin.off=sponsorOffers();
}

/* =====================================================================
   RECAPS, DAY DRIVER
   ===================================================================== */
function intlResult(tn=G.me){
  const lt=G.lastTournament;
  if(lt&&lt.winner===tn)return 'Champions';
  if(lt&&lt.runnerUp===tn)return 'Runner-up';
  const ms=(G.io?.[hk()]||[]).filter(m=>m.a===tn||m.b===tn);
  if(!ms.length)return 'Did not qualify';
  const last=ms[ms.length-1].stage;
  return /Knockout/.test(last)?'Playoffs':/Group|Swiss/.test(last)?'Group stage':'Wild Card';
}
function finishRecap(name,type){
    if(type==='split')computeAwards();else computeIntlAwards(name);
  const players=Object.keys(G.T).flatMap(teamName=>
    all(teamName).map(p=>({name:p.n,team:teamName,role:p.r,games:p.s.g,kda:Number(kda(p.s)),mvp:p.s.m}))
  ).filter(p=>p.games>0);
  const kdaLeaders=players.slice().filter(p=>p.games>=3).sort((a,b)=>b.kda-a.kda).slice(0,5);
  const mvpLeaders=players.slice().filter(p=>p.mvp>0).sort((a,b)=>b.mvp-a.mvp).slice(0,5);
  const leagues=type==='split'?RG.map(region=>({
    region,
    champion:G.pl[region]?.[0]||'—',
    runnerUp:G.pl[region]?.[1]||'—',
    standings:Object.keys(G.tb[region]||{})
      .sort((a,b)=>G.tb[region][b].w-G.tb[region][a].w)
      .map(team=>({team,wins:G.tb[region][team].w,losses:G.tb[region][team].l}))
  })):[];
  if(type==='split')Object.keys(G.T).forEach(tn=>{
    const r=G.T[tn].reg,pos=G.pl[r]?.indexOf(tn)??-1,tb=G.tb[r]?.[tn],e=orgEntry(tn);
    e.place=pos>=0?pos+1:null;e.w=tb?.w??0;e.l=tb?.l??0;e.champ=pos===0;
  });
        let expired=[],fin$=null,retList=[];
  if(type==='international'){
    settleSplit();                // sponsors, merch, wages
    expired=advanceContracts();   // tick contracts, expiring players go to free agency
        if(G.sp===1)retList=planRetire();
    Object.keys(G.T).forEach(tn=>{
      const e=orgEntry(tn);
      e.intl=intlResult(tn);e.fans=Math.round(G.T[tn].fans);e.cash=Math.round(tn===G.me?G.cash:G.T[tn].cash);
    });
    fin$={...tally()};
  }

  G.recap={
    name,title:`${G.yr} ${name}`,type,leagues,
    tournament:type==='international'?G.lastTournament:null,
    myPlacement:type==='split'?(G.pl[G.reg]?.indexOf(G.me)??-1)+1:null,
        awards:type==='split'?G.aw[hk()]:null,
    ia:type==='international'?G.aw?.[hk()]?.intl:null,
        kdaLeaders,mvpLeaders,expired,fin:fin$,retiring:retList,
    nextAction:name==='MSC'?'split2':name==='M Series'?'rollover':null
  };
  for(const team of Object.values(G.T))[...team.p,...team.b].forEach(p=>p.s=S0());
  G.fa.forEach(p=>p.s=S0());
  G.pendingRecap=true;
}
function continueRecap(){
  if(!G.pendingRecap)return;
  const action=G.recap?.nextAction;
  G.pendingRecap=false;
  G.recap=null;
  G.msg='';
  if(action==='split2'){
    archivePO();
    G.sp=1;G.st=0;
    G.tb={};G.pl={};G.po={};
    G.q=G.f=G.top=G.mid=G.k=null;
  }else if(action==='rollover'){
    rollover();
  }
  if(G.faOpen)G.msg=(G.msg?G.msg+'<br>':'')+'📋 Free agency is open: every expiring contract in the league is on the Market. Make your offers before you sim.';
    if(G.dr&&!G.dr.done&&G.dr.yr===G.yr)G.msg=(G.msg?G.msg+'<br>':'')+'🎓 The rookie draft is open. Check the Rookie Draft tab before you sim.';
  render();
}
function recapHtml(){
  const r=G.recap;
  if(!r)return '';
  let html=`<div style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto">
    <div class="box" style="width:min(920px,100%);max-height:92vh;overflow:auto;border:2px solid var(--gold)">
      <h2>${r.title} Recap</h2>`;
  if(r.type==='split'){
    html+=`<h3>League Champions</h3><table><tr><th>League</th><th>Champion</th><th>Runner-up</th></tr>
      ${r.leagues.map(l=>`<tr><td>MPL ${l.region}</td><td>${l.champion}</td><td>${l.runnerUp}</td></tr>`).join('')}
      </table><h3>Final Standings</h3>
      ${r.leagues.map(l=>`<details><summary>MPL ${l.region}</summary><table><tr><th>#</th><th>Team</th><th>W</th><th>L</th></tr>
        ${l.standings.map((t,i)=>`<tr><td>${i+1}</td><td>${t.team}</td><td>${t.wins}</td><td>${t.losses}</td></tr>`).join('')}
      </table></details>`).join('')}
      <p><b>Your league placement:</b> ${r.myPlacement>0?'#'+r.myPlacement:'Not placed'}</p>`;
  }else{
    html+=`<h3>International Tournament Results</h3>${r.tournament?`
      <p><b>Champion:</b> ${r.tournament.winner}</p>
      <p><b>Runner-up:</b> ${r.tournament.runnerUp}</p>
      <p><b>Grand Final:</b> ${r.tournament.score}</p>
      <p><b>Finals MVP:</b> ${r.tournament.fmvp||'—'}</p>`:'<p class="mu">Tournament results unavailable.</p>'}`;
  }
   if(r.ia)html+=`<h3>Tournament awards</h3>${iaHtml(r.ia)}`;
  if(r.awards){
    html+=`<h3>Awards</h3><table><tr><th>League</th><th>Regular Season MVP</th><th>Finals MVP</th><th>Rookie of the Year</th></tr>
      ${RG.map(x=>{const a=r.awards[x]||{};return `<tr><td>MPL ${x}</td><td>${awName(a.rsmvp)}</td><td>${awName(a.fmvp)}</td><td>${awName(a.roty)}</td></tr>`}).join('')}
      </table><h3>All-League Teams</h3>
      ${RG.map(x=>`<details><summary>MPL ${x}</summary>${allL(r.awards[x]||{})}</details>`).join('')}`;
  }
  html+=`<h3>Top KDA Performers</h3><table><tr><th>Player</th><th>Team</th><th>KDA</th><th>GP</th></tr>
    ${r.kdaLeaders.map(p=>`<tr><td>${p.name}</td><td>${p.team}</td><td>${p.kda.toFixed(2)}</td><td>${p.games}</td></tr>`).join('')||'<tr><td colspan="4">No statistics yet.</td></tr>'}
    </table><h3>MVP Leaders</h3><table><tr><th>Player</th><th>Team</th><th>MVP</th></tr>
    ${r.mvpLeaders.map(p=>`<tr><td>${p.name}</td><td>${p.team}</td><td>${p.mvp}</td></tr>`).join('')||'<tr><td colspan="3">No MVPs yet.</td></tr>'}
    </table>`;
  if(r.fin){
    const rows=Object.keys(r.fin).filter(k=>r.fin[k]),net=Object.values(r.fin).reduce((s,x)=>s+x,0);
    html+=`<h3>Your finances this split</h3><table><tr><th>Category</th><th>$k</th></tr>${rows.map(k=>`<tr><td>${k}</td><td style="color:${r.fin[k]>=0?'var(--green)':'var(--ac2)'}">${r.fin[k]>=0?'+':''}${Math.round(r.fin[k])}</td></tr>`).join('')}
      <tr><td><b>Net</b></td><td><b>${net>=0?'+':''}${Math.round(net)}</b></td></tr></table>`;
  }
  if(r.type==='international'){
    html+=`<h3>Contracts</h3><p>${r.expired.length?`Your expiring players: ${r.expired.join(', ')}.`:'None of your contracts expired.'}</p>
      <p class="mu">Every player whose deal ended, on every team, is now in free agency. Go to the Market to make offers before the AI teams sign them. You can't sim until you have 5 starters and a 6th man.</p>`;
  }
    if(r.type==='international'&&r.retiring&&r.retiring.length){
    const mine=r.retiring.filter(x=>x.mine).length;
    html+=`<h3>Retiring after this season (${r.retiring.length})</h3>
      <p class="mu">${mine?`${mine} of your players will retire. Sign replacements in the Market before simming.`:'None of your players retire.'}</p>
      <table><tr><th>Player</th><th>Role</th><th>Age</th><th>Team</th><th>Peak OVR</th><th></th></tr>
      ${r.retiring.map(x=>`<tr${x.mine?' class="me"':''}><td>${x.n}</td><td>${x.r}</td><td>${x.age}</td><td>${x.team}</td><td>${x.pk}</td><td>${x.sc>=HOF_MIN?'⭐ Hall of Fame bound':''}</td></tr>`).join('')}</table>`;
  }
  html+=`<button onclick="continueRecap()">Continue →</button></div></div>`;
  return html;
}

function step(){
   if(G.pendingRecap)return 'recap';
  G.msg='';
  stamp();
  if(!G.cur){
    const g=ST[G.sp][G.st][1]();
    G.cur={g,nx:g.next(),n:0,hist:[]};
  }
  const c=G.cur;
  const stageName=ST[G.sp][G.st][0];
  c.n++;
  const label=`${G.yr} Split ${G.sp+1} · ${stageName} · Day ${c.n}`;
  const res=c.nx.value.map(m=>bo(...m));

  G.mh??=[];G.io??={};
  res.forEach(m=>{
    fanMove(m);
    if(m.a==G.me||m.b==G.me){ // ticket sales
      const imp=/^MPL \w\w$/.test(m.tag)?1:/^MPL/.test(m.tag)?1.6:2.2;
      money(Math.round(G.T[G.me].fans*.012*imp*rf(.8,1.2)),'Tickets');
    }
    const region=RG.find(x=>m.tag.startsWith('MPL '+x+' '));
    if(region){
      (G.po[region]??=[]).push({a:m.a,b:m.b,tag:m.tag,w:m.w,l:m.l,sw:m.sw,sl:m.sl,gs:m.gs,n:m.n});
    }else if(!m.tag.startsWith('MPL')){
      (G.io[hk()]??=[]).push({a:m.a,b:m.b,tag:m.tag,w:m.w,l:m.l,sw:m.sw,sl:m.sl,gs:m.gs,n:m.n,stage:stageName,day:c.n});
    }
    if(m.a==G.me||m.b==G.me){
      G.mh.push({k:hk(),stage:stageName,day:c.n,tag:m.tag,a:m.a,b:m.b,w:m.w,sw:m.sw,sl:m.sl,n:m.n,
                g:m.gs.map(g=>({w:g.w,min:g.min,ks:g.ks,mvp:g.mvp,ps:g.S[m.a==G.me?0:1].map(x=>[x.p.n,x.p.r,x.k,x.d,x.a])}))});
      if(G.mh.length>600)G.mh.shift();
    }
  });
  const mm=res.find(m=>m.a==G.me||m.b==G.me);
  if(mm)G.last=mm;
  G.day={label,res:res.slice().sort((x,y)=>((y.a==G.me||y.b==G.me)?1:0)-((x.a==G.me||x.b==G.me)?1:0))};
  c.hist.push(res.map(m=>({a:m.a,b:m.b,w:m.w,l:m.l,sw:m.sw,sl:m.sl,tag:m.tag,n:m.n})));

  const nx=c.g.next(res);
  if(nx.done){
    G.cur=null;
    G.q=null;
    G.st++;
    if(stageName==='MPL Season')finishRecap(`Split ${G.sp+1}`,'split');
    else if(stageName==='MSC Knockout')finishRecap('MSC','international');
    else if(stageName==='M Series Knockout')finishRecap('M Series','international');
    else if(G.st>=ST[G.sp].length){if(G.sp===1)rollover()}
  }else{
    c.nx=nx;
  }
  return mm?'me':'day';
}
// ---------- live tactical map (smooth, event-driven) ----------
const LIVE_LANES=[
  {name:'EXP LANE', pts:[[100,500],[100,100],[800,100]]},
  {name:'MID LANE', pts:[[100,500],[800,100]]},
  {name:'GOLD LANE',pts:[[100,500],[800,500],[800,100]]}
];
const LM_BASES=[[100,500],[800,100]];            // team 0 = left team (blue), team 1 = right team (red)
const LM_TURTLE=[381,174], LM_LORD=[519,426];    // both sit on the river, away from the lanes
const LM_TOWER_T=[.15,.28,.41];                  // tower spots, measured from each team's own base (0 = base)
const LM_CAMPS=[                                 // jungle camps, one half of the map per team
  [[205,250],[310,235],[240,350],[380,450]],
  [[695,350],[590,365],[660,250],[520,150]]
];
const LM_COL=['#3aa8ff','#ff5d6a'];
const LM_RIVER='M300 60 C420 200 480 400 600 540';
const LM_SPEED=190;                 // map units per second
let LIVE_MOVE=null,LIVE_LAST=0;

const lmClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lmEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lmTr=(x,y)=>`translate(${Math.round(x*10)/10}px,${Math.round(y*10)/10}px)`;

function lmCss(){
  if(document.getElementById('lm-css'))return;
  const s=document.createElement('style');s.id='lm-css';
  s.textContent=`
  .lm-mv{transition:transform .75s linear}
  .lm-pl circle{transition:fill .3s}
  .lm-pl{transition:opacity .3s}
  .lm-pl.dead{opacity:.4}
  .lm-pl.dead circle{fill:#5a6470}
  .lm-pl text,.lm-obj text,.lm-base text,.lm-tw text{pointer-events:none;user-select:none}
  .lm-tw{transition:opacity .4s,transform .4s;transform-box:fill-box;transform-origin:center}
  .lm-tw.dead{opacity:0;transform:scale(.3)}
  .lm-obj circle{fill:#172b36;stroke:#d9c77a;stroke-width:4;transition:stroke .3s}
  .lm-obj.o0 circle{stroke:#48b8ff}.lm-obj.o1 circle{stroke:#ff6872}
  .lm-base circle{fill:#172b36;stroke-width:4;transition:opacity .4s}
  .lm-base.dead{opacity:.35}
  .lm-ping{transform-box:fill-box;transform-origin:center;animation:lmPing .9s ease-out forwards;pointer-events:none}
  @keyframes lmPing{from{opacity:.95;transform:scale(.3)}to{opacity:0;transform:scale(2.8)}}
  .lv-score{position:sticky;top:0;z-index:20;background:var(--panel);padding:8px;border-radius:8px;border:1px solid var(--line);margin-bottom:8px}
  .lv-wrap{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}
  .lv-map{flex:2 1 520px;min-width:0}
  .lv-side{flex:1 1 260px;min-width:240px}
  .lv-side .live-log{max-height:520px;overflow-y:auto;background:var(--panel);padding:6px 10px;border-radius:8px}
  @media(max-width:820px){.lv-side{order:-1}.lv-side .live-log{max-height:220px}}`;
  document.head.appendChild(s);
}
/* ----- geometry ----- */
function liveMapPoint(lane,t){
  const pts=LIVE_LANES[lane].pts,seg=[];let total=0;
  for(let i=1;i<pts.length;i++){const dx=pts[i][0]-pts[i-1][0],dy=pts[i][1]-pts[i-1][1],len=Math.hypot(dx,dy);seg.push({a:pts[i-1],b:pts[i],len});total+=len}
  let d=lmClamp(t,0,1)*total;
  for(const q of seg){
    if(d<=q.len||q===seg[seg.length-1]){const f=q.len?lmClamp(d/q.len,0,1):0;return [q.a[0]+(q.b[0]-q.a[0])*f,q.a[1]+(q.b[1]-q.a[1])*f]}
    d-=q.len;
  }
  return pts[pts.length-1];
}
const lmLanePoint=liveMapPoint;
function liveMapPath(lane){return LIVE_LANES[lane].pts.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ')}
const lmPt=(team,lane,own)=>liveMapPoint(lane,team?1-own:own);   // point on a lane, measured from that team's base

/* ----- map state (one per game) ----- */
function lmFresh(ro){
  return {
    min:1,ev:0,kills:[0,0],adv:[0,0,0],            // adv[lane]: +1 = blue is pushing, -1 = red is pushing
    tw:[0,1].map(()=>[0,1,2].map(()=>[1,1,1])),    // tw[team][lane][k] 1 = standing (k=2 is the outer tower)
    turtle:null,lord:[0,0],lordLast:null,baseDown:null,over:null,focus:null,fx:[],
        pl:[0,1].map(t=>((ro&&ro[t])||[]).map((p,i)=>{
      const B=LM_BASES[t],x=B[0]+(t?-1:1)*(26+i*5),y=B[1]+(t?1:-1)*(26+i*5);
      return {n:p.n,r:p.r,dead:false,rs:0,eng:null,x,y,tx:x,ty:y};
    }))
  };
}
function lmBestLane(st,t){
  let b=1,bv=-9;
  [1,0,2].forEach(l=>{const v=(t?-1:1)*st.adv[l];if(v>bv+1e-9){bv=v;b=l}});
  return b;
}
function lmLane(st,t,role){
  if(role==='EXP')return 0;
  if(role==='MID')return 1;
  if(role==='GOLD')return 2;
  if(role==='ROAM')return st.min<5?2:lmBestLane(st,t);
  return lmBestLane(st,t);
}
const lmFront=(st,l)=>lmClamp(.5+.2*st.adv[l],.3,.7);   // where the two minion waves meet, as a fraction of the lane from blue's base

function lmTarget(st,t,i,p){
  if(p.dead)return [p.x,p.y];          // dead players stay where they fell until they respawn
  if(p.eng&&st.ev<p.eng.until)return [p.eng.x,p.eng.y];
  const f=st.focus;
  if(f&&f.team===t&&st.ev<f.until){
    const a=i/5*Math.PI*2+(t?Math.PI:0);
    return [f.x+Math.cos(a)*34,f.y+Math.sin(a)*34];
  }
  let pt;
  if(p.r==='JG'){
    const cyc=Math.floor(st.min/1.5)%5,camps=LM_CAMPS[t];
    if(cyc===4){const L=lmBestLane(st,t);pt=lmLanePoint(L,lmFront(st,L)+(t?.09:-.09))}   // gank
    else pt=camps[cyc];
  }else{
    const L=lmLane(st,t,p.r);
    pt=lmLanePoint(L,lmFront(st,L)+(t?1:-1)*(.07+(p.r==='ROAM'?.05:0)));
  }
  // small idle wobble so players look alive without teleporting
  return [pt[0]+Math.sin(st.ev*.9+i*1.7+t*2)*6,pt[1]+Math.cos(st.ev*.8+i*2.3+t)*6];
}
function lmRetarget(st){
  st.pl.forEach((side,t)=>side.forEach((p,i)=>{const q=lmTarget(st,t,i,p);p.tx=q[0];p.ty=q[1]}));
}
function lmWaves(st){
  return [0,1].map(t=>[0,1,2].map(l=>{
    const f=lmFront(st,l)+(t?1:-1)*.03+Math.sin(st.ev*.6+l*2)*.012;
    return lmLanePoint(l,lmClamp(f,.06,.94));
  }));
}

/* ----- parsing the play-by-play text into structured events ----- */
function lmParse(t,m){
  t=String(t).replace(/^FIRST BLOOD:\s*/,'');
  let r=/^(.+?) (?:trades and )?kills (.+?)(?: \(assist (.+)\))?$/.exec(t);
  if(r)return {kind:'kill',k:r[1],v:r[2],as:r[3]?r[3].split(', '):[]};
  r=/^(.+) (take the Turtle|slay the Lord|push down a tower|destroy the base)$/.exec(t);
  if(r){
    const team=r[1]===m.a?0:r[1]===m.b?1:-1;
    return {kind:{'take the Turtle':'turtle','slay the Lord':'lord','push down a tower':'tower','destroy the base':'base'}[r[2]],team};
  }
  return {kind:'other'};
}

/* ----- apply one event to the map state ----- */
function lmTowerPick(st,t,siege,only){
  const en=1-t;let bl=-1,bv=-1e9;
  (only>=0?[only]:[1,0,2]).forEach(l=>{
    const n=st.tw[en][l].filter(Boolean).length;
    if(!n)return;
    const v=(siege?-n*10:0)+(t?-1:1)*st.adv[l];      // a siege keeps hitting the lane that is already weakest
    if(v>bv){bv=v;bl=l}
  });
  if(bl<0)return null;
  let k=2;while(k>0&&!st.tw[en][bl][k])k--;          // outermost standing tower first
  return {l:bl,k,en};
}
function lmRevive(st,t){
  st.pl[t].forEach((p,i)=>{if(p.dead){const B=LM_BASES[t];p.dead=false;p.eng=null;p.x=B[0]+(t?-1:1)*(26+i*5);p.y=B[1]+(t?1:-1)*(26+i*5)}});
}
/* before an objective event is applied, send the team there and make the event wait until they arrive */
function lmPrep(e){
  e.prep=1;e.wait=0;
  const st=LIVE.map,x=e.info||{};
  let pt=null,tm=e.team??x.team;
  if(e.type==='siege'){
    if(x.kind==='tower'){
      const only=LIVE.siege&&LIVE.siege.game===e.game?LIVE.siege.l:-1;
      const pk=lmTowerPick(st,tm,true,only);
      if(!pk){e.skip=true;return}
      LIVE.siege={game:e.game,l:pk.l};
      e.pick=pk;pt=lmPt(pk.en,pk.l,LM_TOWER_T[pk.k]);
    }else pt=LM_BASES[1-tm];
    lmRevive(st,tm);
  }else if(x.kind==='tower'&&x.team>=0){
    const pk=lmTowerPick(st,x.team,false,-1);
    if(pk){e.pick=pk;pt=lmPt(pk.en,pk.l,LM_TOWER_T[pk.k])}
  }else if(x.kind==='turtle'&&x.team>=0)pt=LM_TURTLE;
  else if(x.kind==='lord'&&x.team>=0)pt=LM_LORD;
  else if(x.kind==='base'&&x.team>=0){pt=LM_BASES[1-x.team];lmRevive(st,tm)}
  if(!pt)return;
  st.pl[tm].forEach(p=>p.eng=null);
  e.gate={t:tm,x:pt[0],y:pt[1]};
  st.focus={team:tm,x:pt[0],y:pt[1],until:st.ev+99};
  lmRetarget(st);
}
function lmArrived(e){
  const st=LIVE.map,g=e.gate,alive=st.pl[g.t].filter(p=>!p.dead);
  if(!alive.length)return true;
  return alive.filter(p=>Math.hypot(p.x-g.x,p.y-g.y)<80).length>=Math.min(3,alive.length);
}
/* constant-speed walking, runs every 50 ms independent of the event clock */
function lmMove(){
  if(!LIVE||!LIVE.map)return;
  const now=performance.now(),dt=Math.min(.25,(now-LIVE_LAST)/1000),step=LM_SPEED*dt;
  LIVE_LAST=now;
  LIVE.map.pl.forEach((side,t)=>side.forEach((p,i)=>{
    if(p.dead)return;
    const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy);
    if(d>.5){const f=Math.min(1,step/d);p.x+=dx*f;p.y+=dy*f}
    const el=document.getElementById(`lm-p${t}${i}`);
    if(el)el.style.transform=lmTr(p.x,p.y);
  }));
}

function lmApply(e){
  if(e.type==='start'){LIVE.map=lmFresh(LIVE.rosters[e.game]||LIVE.rosters[0]);lmRetarget(LIVE.map);return}
  const st=LIVE.map;
  if(e.type==='end'){st.over=e.winner;return}
  st.ev++;
  if(e.min)st.min=Math.max(st.min,e.min);
  st.pl.forEach((side,t)=>side.forEach((p,i)=>{   // respawn at own base
    if(p.dead&&st.ev>=p.rs){const B=LM_BASES[t];p.dead=false;p.eng=null;p.x=B[0]+(t?-1:1)*(26+i*5);p.y=B[1]+(t?1:-1)*(26+i*5)}
  }));
  st.adv=st.adv.map(v=>v*.93);
  const x=e.info||{},find=(n,t)=>st.pl[t].find(p=>p.n===n);
  if(x.kind==='kill'){
    const kt=(find(x.k,0)&&find(x.v,1))?0:(find(x.k,1)&&find(x.v,0))?1:-1;
    if(kt>=0){
      const vt=1-kt,K=find(x.k,kt),V=find(x.v,vt),lane=lmLane(st,vt,V.r);
      st.kills[kt]++;
      st.adv[lane]=lmClamp(st.adv[lane]+(kt?-.16:.16),-1,1);
      const loc=[V.x,V.y];                              // he dies where he stands, the killer walks to him
      V.dead=true;V.rs=st.ev+3+Math.floor(st.min/10);V.eng=null;
      const until=st.ev+2;
      K.eng={x:loc[0]+(kt?12:-12),y:loc[1]+(kt?-12:12),until};
      x.as.forEach((n,j)=>{const A=find(n,kt);if(A&&A!==K)A.eng={x:loc[0]+(kt?24:-24),y:loc[1]+(j?-20:20),until}});
      st.fx.push({x:loc[0],y:loc[1],c:LM_COL[kt]});
      e.tm=kt;e.res={kt,k:K.n,v:V.n,as:x.as.filter(n=>find(n,kt))};
    }
  }else if(x.kind==='turtle'&&x.team>=0){
    st.turtle=x.team;st.focus={team:x.team,x:LM_TURTLE[0],y:LM_TURTLE[1],until:st.ev+3};
    st.fx.push({x:LM_TURTLE[0],y:LM_TURTLE[1],c:LM_COL[x.team]});e.tm=x.team;
  }else if(x.kind==='lord'&&x.team>=0){
    st.lord[x.team]++;st.lordLast=x.team;st.focus={team:x.team,x:LM_LORD[0],y:LM_LORD[1],until:st.ev+3};
    st.fx.push({x:LM_LORD[0],y:LM_LORD[1],c:LM_COL[x.team]});e.tm=x.team;
  }else if(x.kind==='tower'&&x.team>=0){
    const t=x.team,pk=e.pick||lmTowerPick(st,t,e.type==='siege',-1);
    if(pk){
      st.tw[pk.en][pk.l][pk.k]=0;
      const tp=lmPt(pk.en,pk.l,LM_TOWER_T[pk.k]);
      st.adv[pk.l]=lmClamp(st.adv[pk.l]+(t?-.2:.2),-1,1);
      st.focus={team:t,x:tp[0],y:tp[1],until:st.ev+2};
      st.fx.push({x:tp[0],y:tp[1],c:LM_COL[t]});
    }else st.focus=null;
    e.tm=t;
  }else if(x.kind==='storm'&&x.team>=0){
    const B=LM_BASES[1-x.team];
    st.focus={team:x.team,x:B[0],y:B[1],until:st.ev+3};e.tm=x.team;
  }else if(x.kind==='base'&&x.team>=0){
    const B=LM_BASES[1-x.team];
    st.baseDown=1-x.team;st.focus={team:x.team,x:B[0],y:B[1],until:st.ev+6};
    st.fx.push({x:B[0],y:B[1],c:LM_COL[x.team]});e.tm=x.team;
  }
  lmRetarget(st);
}

/* ----- drawing ----- */
function lmObjText(st){
  const tt=st.turtle===null?(st.min<8?'SPAWNING':'UP'):'TAKEN · '+(st.turtle?'RED':'BLUE');
  const lt=(st.lord[0]||st.lord[1])?`BLUE ×${st.lord[0]} · RED ×${st.lord[1]}`:(st.min<14?'SPAWNING':'UP');
  return [tt,lt];
}
function lmHud(st){
  return `<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><b>🗺️ LIVE BATTLE MAP</b>
    <span><b style="color:${LM_COL[0]}">${lmEsc(LIVE.a)} ${st.kills[0]}</b> <span class="mu">kills</span> <b style="color:${LM_COL[1]}">${st.kills[1]} ${lmEsc(LIVE.b)}</b></span>
    <span class="mu">Game ${LIVE.game+1} · ${st.min}'</span></div>`;
}
function lmSvg(st){
  const lanes=LIVE_LANES.map((l,i)=>`<path d="${liveMapPath(i)}" fill="none" stroke="#c8b98a" stroke-width="42" stroke-linecap="round" opacity=".14"/><path d="${liveMapPath(i)}" fill="none" stroke="#d7c28c" stroke-width="3" stroke-dasharray="8 8" opacity=".6"/>`).join('');
  const river=`<path d="${LM_RIVER}" fill="none" stroke="#4b9fc1" stroke-width="38" opacity=".28"/><path d="${LM_RIVER}" fill="none" stroke="#8bd5e8" stroke-width="3" opacity=".35"/>`;
  const camps=LM_CAMPS.map(side=>side.map(([x,y],i)=>`<g transform="translate(${x} ${y})"><circle r="18" fill="#244c35" stroke="#80b879" stroke-width="2"/><text y="3" text-anchor="middle" font-size="8" fill="#eaffdf">${i%3===0?'BUFF':'CAMP'}</text></g>`).join('')).join('');
  let towers='';
  for(let t=0;t<2;t++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
    const [x,y]=lmPt(t,l,LM_TOWER_T[k]);
    towers+=`<g class="lm-tw${st.tw[t][l][k]?'':' dead'}" id="lm-t${t}${l}${k}"><rect x="${x-8}" y="${y-8}" width="16" height="16" rx="3" fill="${LM_COL[t]}" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="10" font-weight="bold" fill="#101820">T</text></g>`;
  }
  const W=lmWaves(st);let waves='';
  for(let t=0;t<2;t++)for(let l=0;l<3;l++)
    waves+=`<g class="lm-mv" id="lm-w${t}${l}" style="transform:${lmTr(W[t][l][0],W[t][l][1])}" fill="${t?'#ff9ca3':'#75c9ff'}" stroke="#15202a" stroke-width="2"><circle cx="-10" cy="3" r="5"/><circle cx="0" cy="-4" r="5"/><circle cx="10" cy="3" r="5"/></g>`;
  const players=st.pl.map((side,t)=>side.map((p,i)=>
    `<g class="lm-pl${p.dead?' dead':''}" id="lm-p${t}${i}" style="transform:${lmTr(p.x,p.y)}"><circle r="15" fill="${LM_COL[t]}" stroke="#fff" stroke-width="3"/><text y="4" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">${lmEsc(String(p.n).slice(0,2).toUpperCase())}</text><title>${lmEsc(p.n)} · ${lmEsc(p.r)}</title></g>`).join('')).join('');
  const bases=[0,1].map(t=>`<g class="lm-base${st.baseDown===t?' dead':''}" id="lm-b${t}" transform="translate(${LM_BASES[t][0]} ${LM_BASES[t][1]})"><circle r="24" style="stroke:${LM_COL[t]}"/><text y="4" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">BASE</text></g>`).join('');
  const ot=lmObjText(st);
  const objs=`<g class="lm-obj${st.turtle===null?'':' o'+st.turtle}" id="lm-turtle" transform="translate(${LM_TURTLE[0]} ${LM_TURTLE[1]})"><circle r="24"/><text y="4" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">TURTLE</text><text id="lm-tt" y="42" text-anchor="middle" font-size="10" fill="#fff">${ot[0]}</text></g>
    <g class="lm-obj${st.lordLast===null?'':' o'+st.lordLast}" id="lm-lord" transform="translate(${LM_LORD[0]} ${LM_LORD[1]})"><circle r="24"/><text y="4" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">LORD</text><text id="lm-lt" y="42" text-anchor="middle" font-size="10" fill="#fff">${ot[1]}</text></g>`;
  return `<div style="background:#173b35;border:1px solid #456b59;border-radius:12px;overflow:hidden;margin-top:8px"><svg id="lm-svg" viewBox="0 0 900 600" role="img" aria-label="Live MOBA map" style="display:block;width:100%;height:auto;max-height:520px">
    <defs><linearGradient id="mapGrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#285b43"/><stop offset="1" stop-color="#183d35"/></linearGradient></defs>
    <rect width="900" height="600" fill="url(#mapGrass)"/>
    ${river}${lanes}${camps}
    <g fill="#e9f4e8" font-size="12" opacity=".5" text-anchor="middle" style="pointer-events:none"><text x="450" y="66">EXP LANE</text><text x="450" y="544">GOLD LANE</text><text x="430" y="266" transform="rotate(-29.7 430 266)">MID LANE</text></g>
    ${towers}${bases}${objs}${waves}${players}
    <g id="lm-fx"></g>
    <text x="40" y="580" fill="#bde4ff" font-size="15" font-weight="bold">${lmEsc(LIVE.a)}</text>
    <text x="860" y="34" text-anchor="end" fill="#ffd0d2" font-size="15" font-weight="bold">${lmEsc(LIVE.b)}</text>
  </svg></div>`;
}
function liveMapHtml(){
  if(!LIVE||!LIVE.map)return '';
  return `<div class="box" style="margin-top:12px"><div id="lm-hud">${lmHud(LIVE.map)}</div>${lmSvg(LIVE.map)}
    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;margin-top:8px"><span style="color:${LM_COL[0]}">● ${lmEsc(LIVE.a)}</span><span style="color:${LM_COL[1]}">● ${lmEsc(LIVE.b)}</span><span>▣ Towers</span><span>⚫ Minion waves</span><span>○ Jungle camps</span></div>
    <div class="mu" style="font-size:12px;margin-top:5px">Positions are simulated from the match events. Kills, towers and objectives happen when the play-by-play says they do.</div></div>`;
}

/* ----- update the existing SVG in place (this is what makes it glide instead of flicker) ----- */
function liveMapUpdate(){
  if(!LIVE||!LIVE.map)return;
  const st=LIVE.map,svg=document.getElementById('lm-svg');
  if(!svg){st.fx.length=0;return}
  const $i=id=>document.getElementById(id);
    st.pl.forEach((side,t)=>side.forEach((p,i)=>{
    const el=$i(`lm-p${t}${i}`);if(el)el.classList.toggle('dead',!!p.dead);
  }));

  const W=lmWaves(st);
  for(let t=0;t<2;t++)for(let l=0;l<3;l++){const el=$i(`lm-w${t}${l}`);if(el)el.style.transform=lmTr(W[t][l][0],W[t][l][1])}
  for(let t=0;t<2;t++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){const el=$i(`lm-t${t}${l}${k}`);if(el)el.classList.toggle('dead',!st.tw[t][l][k])}
  [0,1].forEach(t=>{const el=$i('lm-b'+t);if(el)el.classList.toggle('dead',st.baseDown===t)});
  const ot=lmObjText(st),tu=$i('lm-turtle'),lo=$i('lm-lord');
  if(tu){tu.setAttribute('class','lm-obj'+(st.turtle===null?'':' o'+st.turtle));const tx=$i('lm-tt');if(tx)tx.textContent=ot[0]}
  if(lo){lo.setAttribute('class','lm-obj'+(st.lordLast===null?'':' o'+st.lordLast));const tx=$i('lm-lt');if(tx)tx.textContent=ot[1]}
  const hud=$i('lm-hud');if(hud)hud.innerHTML=lmHud(st);
  const g=$i('lm-fx');
  while(st.fx.length){
    const f=st.fx.shift();
    if(!g)continue;
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',f.x);c.setAttribute('cy',f.y);c.setAttribute('r',22);
    c.setAttribute('fill','none');c.setAttribute('stroke',f.c);c.setAttribute('stroke-width',5);
    c.setAttribute('class','lm-ping');
    g.appendChild(c);setTimeout(()=>c.remove(),1000);
  }
}

/* ----- panel pieces ----- */
function livePlaybackStatsHtml(){
  if(!LIVE)return '';
  const rows=[];
  (LIVE.stats||[]).forEach((t,ti)=>{
    rows.push(`<tr><th colspan="5" style="text-align:left;color:${LM_COL[ti]}">${lmEsc(t.team)}</th></tr>`);
    t.players.forEach(p=>rows.push(`<tr><td>${lmEsc(p.name)}</td><td>${p.k}</td><td>${p.d}</td><td>${p.a}</td><td>${p.gold}</td></tr>`));
  });
  return `<div style="overflow-x:auto;margin-top:10px"><b>📊 Live player stats</b> <span class="mu">(series totals)</span><table style="width:100%"><tr><th>Player</th><th>K</th><th>D</th><th>A</th><th>Gold</th></tr>${rows.join('')}</table></div>`;
}
function lvScoreHtml(){
  const fin=LIVE.done,s=LIVE.wins||[0,0],k=LIVE.map?LIVE.map.kills:[0,0];
  return `<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px">
      <b>🔴 ${fin?'MATCH COMPLETE':'LIVE MATCH'}</b><span class="mu">Game ${LIVE.game+1} · ${LIVE.map?LIVE.map.min:1}' · kills ${k[0]} – ${k[1]}</span></div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-top:4px">
      <b style="text-align:right;color:${LM_COL[0]}">${lmEsc(LIVE.a)}</b>
      <div style="font-size:28px;font-weight:800;white-space:nowrap">${s[0]} <span class="mu">–</span> ${s[1]}</div>
      <b style="text-align:left;color:${LM_COL[1]}">${lmEsc(LIVE.b)}</b></div>`;
}
function lvLogHtml(){
  const fin=LIVE.done;
  const vis=LIVE.events.slice(0,LIVE.index).filter(e=>!e.skip).slice(-30).reverse();   // newest on top
  return (fin?'<p><b>🏆 Series finished!</b></p>':(LIVE.index?'':'<p class="mu">Waiting for the first play...</p>'))
    +vis.map((e,i)=>`<div style="padding:8px 3px;border-bottom:1px solid var(--line);${i?'opacity:.75':''}"><span class="mu">${e.gameLabel}</span><br>${e.tm===0||e.tm===1?`<span style="color:${LM_COL[e.tm]}">●</span> `:''}<b>${lmEsc(e.line)}</b></div>`).join('');
}
function lvFootHtml(){
  return `<p class="mu">${LIVE.index} / ${LIVE.events.length} events · ${LIVE.done?'Playback finished':'Live playback'}</p>${LIVE.done?'':`<button class="t" onclick="endLivePlayback()">⏹ End simulation</button>`}`;
}

function livePlaybackHtml(){
  if(!LIVE)return '';
  lmCss();
  return `<div class="box" style="border:1px solid var(--gold)">
    <div id="lv-score" class="lv-score">${lvScoreHtml()}</div>
    <div class="lv-wrap">
      <div class="lv-map">${liveMapHtml()}</div>
      <div class="lv-side"><b>📜 Play-by-play</b><div class="live-log" id="lv-log">${lvLogHtml()}</div></div>
    </div>
    <div id="lv-stats">${livePlaybackStatsHtml()}</div>
    <div id="lv-foot">${lvFootHtml()}</div>
  </div>`;
}
/* repaint only the live panel (no full render(), no save()) */
function lvPaint(){
  const log=document.getElementById('lv-log');
  if(!log){if(LIVE&&LIVE.map)LIVE.map.fx.length=0;return}   // user is on another tab; state keeps advancing
  const set=(id,h)=>{const el=document.getElementById(id);if(el)el.innerHTML=h};
  set('lv-score',lvScoreHtml());set('lv-stats',livePlaybackStatsHtml());set('lv-foot',lvFootHtml());
  log.innerHTML=lvLogHtml();
  liveMapUpdate();
}

/* ----- playback engine ----- */
function stopLive(){
  if(LIVE_TIMER){clearInterval(LIVE_TIMER);LIVE_TIMER=null}
  if(LIVE_MOVE){clearInterval(LIVE_MOVE);LIVE_MOVE=null}
}
function lvStep(e){
  LIVE.game=e.game;
  lmApply(e);
  if(e.type==='start')LIVE.stats.forEach(t=>t.players.forEach(p=>{p.gold=0}));
  if(e.type==='play'&&e.res){
    const r=e.res,kS=LIVE.stats[r.kt],vS=LIVE.stats[1-r.kt];
    const kp=kS.players.find(x=>x.name===r.k),vp=vS.players.find(x=>x.name===r.v);
    if(kp)kp.k++;
    if(vp)vp.d++;
    r.as.forEach(n=>{const a=kS.players.find(x=>x.name===n);if(a)a.a++});
  }
  if(e.type==='end'){
    LIVE.wins[e.winner]++;
    (e.gameStats||[]).forEach((side,ti)=>side.forEach(x=>{
      const row=LIVE.stats[ti].players.find(y=>y.name===x.p.n);
      if(row)row.gold=x.gold;
    }));
  }
}
function liveTick(){
  if(!LIVE){stopLive();return}
  let e=LIVE.events[LIVE.index];
  while(e&&e.type==='siege'){            // siege steps with no tower left are skipped silently
    if(!e.prep)lmPrep(e);
    if(!e.skip)break;
    e=LIVE.events[++LIVE.index];
  }
  if(e&&e.type==='play'&&!e.prep)lmPrep(e);
  if(e&&e.gate&&!e.skip){                // the event waits until the team has walked there
    e.wait++;
        const cap=(e.type==='siege'||(e.info&&e.info.kind==='base'))?10:9;
    if(!lmArrived(e)&&e.wait<cap)return;
  }
  if(LIVE.index<LIVE.events.length)lvStep(LIVE.events[LIVE.index++]);
  if(LIVE.index>=LIVE.events.length){LIVE.done=true;stopLive();render();return}
  lvPaint();
}
function startLivePlayback(m){
  stopLive();
  if(!m||!Array.isArray(m.gs))return;
  const rosters=m.gs.map(g=>g.S.map(side=>side.map(x=>({n:x.p.n,r:x.p.r}))));
  const events=[];
  m.gs.forEach((g,i)=>{
    events.push({type:'start',game:i,min:1,gameLabel:`GAME ${i+1} · START`,line:`Game ${i+1} is underway!`});
    (g.lg||[]).forEach(raw=>{
      const mm=/^(\d+)'\s*(.*)$/.exec(String(raw)),min=mm?+mm[1]:0,text=mm?mm[2]:String(raw);
      const info=lmParse(text,m),lab=`GAME ${i+1} · ${min}'`;
      if(info.kind==='base'&&info.team>=0){      // the base only falls after a real push through the towers
        const nm=[m.a,m.b][info.team];
        for(let k=0;k<3;k++)events.push({type:'siege',game:i,min,team:info.team,gameLabel:lab,line:`${nm} break through an enemy tower`,info:{kind:'tower',team:info.team}});
        for(let k=0;k<2;k++)events.push({type:'siege',game:i,min,team:info.team,gameLabel:lab,line:`${nm} storm the enemy base`,info:{kind:'storm',team:info.team}});
      }
      events.push({type:'play',game:i,min,gameLabel:lab,line:text,info});
    });
    events.push({type:'end',game:i,winner:g.w,gameLabel:`GAME ${i+1} · RESULT`,line:`${[m.a,m.b][g.w]} wins Game ${i+1}!`,gameStats:g.S});
  });
  LIVE={a:m.a,b:m.b,events,index:0,wins:[0,0],done:false,game:0,rosters,siege:null,
    stats:[m.a,m.b].map((team,t)=>({team,players:rosters[0][t].map(p=>({name:p.n,k:0,d:0,a:0,gold:0}))})),
    map:lmFresh(rosters[0])};
  TAB='match';
  render();
  LIVE_TIMER=setInterval(liveTick,700);
  LIVE_LAST=performance.now();
  LIVE_MOVE=setInterval(lmMove,50);
}
function endLivePlayback(){
  if(!LIVE)return;
  stopLive();
  while(LIVE.index<LIVE.events.length)lvStep(LIVE.events[LIVE.index++]);   // fast-forward: same code path, so stats stay correct
  LIVE.done=true;
  render();
}

function sim(mode,watch=false){
  if(LIVE&&!LIVE.done){G.msg='End the current live match before starting another simulation.';return render();}
    stopLive();
  LIVE=null;
  let faNews='',replay=null;
    if(!G.pendingRecap){
    const issue=rosterIssue();
    if(issue){G.msg=issue;go('market');return}
    if(G.dr&&!G.dr.done){const skipped=drTeam()===G.me;drAdvance(false);if(skipped)faNews='🎓 You skipped your draft pick.<br>'}
    faNews+=closeFA();
    aiFixAll();
  }
  for(let n=0;n<400;n++){
    const r=step();
    if(r==='me'&&G.last)replay=G.last;
    if(G.pendingRecap||mode==='day'||!G.cur||(mode==='me'&&r==='me'))break;
  }
  TAB='match';
  if(faNews)G.msg=faNews+(G.msg?'<br>'+G.msg:'');
  render();
  if(replay&&watch)startLivePlayback(replay);
    else if(replay&&!watch){
    LIVE=null;
    const sa=replay.w===replay.a?replay.sw:replay.sl,sb=replay.w===replay.b?replay.sw:replay.sl;
    G.msg=`<b>${replay.a} ${sa} – ${sb} ${replay.b}</b> · Quick simulation complete.`;
    render();
  }
}

/* =====================================================================
   USER ACTIONS: sign, buyout, trade, release, contracts
   ===================================================================== */
function canPlace(p){
  const t=G.T[G.me];
  return (ROLES.includes(p.r)&&!t.p.some(x=>x.r===p.r))||t.b.length<BMAX;
}
function place(p){
  const t=G.T[G.me];
  if(ROLES.includes(p.r)&&!t.p.some(x=>x.r===p.r)){t.p.push(p);return 'starting five'}
  t.b.push(p);return 'bench';
}
function rosterIssue(){
  const t=G.T[G.me],miss=ROLES.filter(r=>!t.p.some(x=>x.r===r)),need=[];
  if(miss.length)need.push(`${miss.length} starter${miss.length>1?'s':''} missing (${miss.join(', ')})`);
  if(!t.b.length)need.push('no 6th man on the bench');
  return need.length?`⚠ You don't have enough players: ${need.join(' and ')}. Sign players in the Market before simming.`:'';
}
function sign(i){
  const f=G.fa[i];
  if(!f||f.rv)return;
  const c=cost(f);
  if(G.cash<c)return;
  if(!canPlace(f)){G.msg=`Your bench is full (${BMAX}). Release someone first.`;return render()}
  money(-c,'Signings');
    f.contract=rnd(1,4);delete f.old;delete f.cls;
  G.fa.splice(i,1);
  const where=place(f);
  genFA();
  G.msg=`Signed ${f.n} for ${f.contract} split(s). Added to your ${where}.`;
  render();
}
function buyout(tn,i,b=false){
  const T=G.T[tn],A=b?T.b:T.p,p=A[i];
    if(!p||tn==G.me||p.loan)return;
  const c=bcost(p);
  if(G.cash<c)return;
  if(!canPlace(p)){G.msg=`Your bench is full (${BMAX}). Release someone first.`;return render()}
  money(-c,'Transfers');T.cash+=c;
  A.splice(i,1);
  p.contract=p.contract||rnd(1,4);
  const where=place(p);
  aiFix(tn);
  G.msg=`Bought ${p.n} from ${tn} for $${c}k. Added to your ${where}.`;
  news(`${G.me} bought out ${p.n} from ${tn} for $${c}k`);
  render();
}
function startP(i){
  const t=G.T[G.me],sub=t.b[i];
  let role=sub.r;
  if(role==='FLEX'){
    const choice=prompt('Choose a role: EXP, JG, MID, GOLD, or ROAM','EXP');
    role=String(choice||'').toUpperCase();
    if(!ROLES.includes(role))return;
  }
  const j=t.p.findIndex(x=>x.r===role);
  sub.r=role;
  if(j<0){t.p.push(sub);t.b.splice(i,1)}
  else{[t.p[j],t.b[i]]=[sub,t.p[j]]}
  render();
}

function sell(id){
  const f=findP(id);
  if(!f||f.t!==G.me)return;
    const p=f.p,price=sellPrice(p);
  if(p.loan){G.msg='Loaned players can\'t be sold. Return or recall him first.';return render()}
  const buyers=shuf(Object.keys(G.T).filter(n=>n!==G.me&&G.T[n].cash>=price));
  if(!buyers.length){G.msg=`No team can afford ${p.n} right now.`;return render()}
  if(!confirm(`Sell ${p.n} for $${price}k?`))return;
  const tn=buyers[0];
  removeFrom(G.T[G.me],p);
  money(price,'Transfers');G.T[tn].cash-=price;
  p.contract=p.contract||1;
  aiPlace(p,tn);
  G.offers=(G.offers||[]).filter(x=>x.pid!==p.id&&x.give!==p.id);
  G.msg=`Sold ${p.n} to ${tn} for $${price}k.`;
  news(`${G.me} sold ${p.n} to ${tn} for $${price}k`);
  render();
}

function relP(i){
    if(G.T[G.me].b[i]?.loan){G.msg='Loaned players can\'t be released. Return him instead.';return render()}
  const p=G.T[G.me].b.splice(i,1)[0];
  p.contract=0;p.old=G.me;
  G.fa.push(p);
  render();
}

/* ----- trading: put any players from both sides on the table, add cash if needed ----- */
const pkgVal=l=>l.map(tv).sort((a,b)=>b-a).reduce((s,v,i)=>s+v*Math.pow(.85,i),0); // extra players on one side count a bit less
function fitsMe(inc,out){ // will everyone fit on my roster?
  const A=G.T[G.me],open=ROLES.filter(r=>!A.p.some(x=>!out.includes(x)&&x.r===r));
  let b=A.b.filter(x=>!out.includes(x)).length;
  for(const x of inc){const i=open.indexOf(x.r);if(i>=0)open.splice(i,1);else b++}
  return b<=BMAX;
}
function settleAI(tn,add){ // like aiPlace, but fixes the roster once after everyone arrives
  const T=G.T[tn];
  add.forEach(x=>{
    delete x.rv;delete x.ex;delete x.old;
    if(x.r==='FLEX'){const w=T.p.slice().sort((a,b)=>ov(a)-ov(b))[0];x.r=w?w.r:'EXP'}
    const j=T.p.findIndex(y=>y.r===x.r);
    if(j<0)T.p.push(x);
    else if(ov(x)>ov(T.p[j])){T.b.push(T.p[j]);T.p[j]=x}
    else T.b.push(x);
  });
  aiFix(tn);
}
function openTrade(tn,i,b){
  const T=G.T[tn],t=(b?T.b:T.p)[i];if(!t||t.loan)return;
  const same=all(G.me).find(x=>x.r===t.r&&!x.loan);
  TR={tn,get:[t.id],give:same?[same.id]:[],cash:0,res:''};
  render();
}
function closeTrade(){TR=null;render()}
function trTog(side,id){
  const a=TR[side],i=a.indexOf(id);
  if(i<0)a.push(id);else a.splice(i,1);
  TR.res='';render();
}
function trSel(){
  const T=G.T[TR.tn];
  return {
    T,
    get:TR.get.map(id=>[...T.p,...T.b].find(x=>x.id===id&&!x.loan)).filter(Boolean),
    give:TR.give.map(id=>all(G.me).find(x=>x.id===id&&!x.loan)).filter(Boolean)
  };
}
function tradeHtml(){
  if(!TR)return '';
  const {T,get,give}=trSel();
  const mine=all(G.me).filter(x=>!x.loan),theirs=[...T.p,...T.b].filter(x=>!x.loan);
  const tbl=(arr,side,sel)=>`<table><tr><th></th><th>Role</th><th>Player</th><th>Age</th><th>Ctry</th><th>OVR</th><th>POT</th><th>Value</th></tr>${arr.map(x=>`<tr><td><input type="checkbox" ${sel.includes(x)?'checked':''} onchange="trTog('${side}',${x.id})"></td><td>${x.r}</td><td>${pl(x)}</td><td>${x.age}</td><td>${x.c}</td><td>${ov(x)}</td><td>${x.pot}</td><td>$${tv(x)}k</td></tr>`).join('')}</table>`;
  const gv=Math.round(pkgVal(give)),tvv=Math.round(pkgVal(get)),cash=TR.cash||0;
  return `<div class="box" style="border:2px solid var(--gold)"><b>Trade with ${TR.tn}</b> <span class="mu">tick the players on each side</span>
    <div class="gm-grid"><div><b>You give</b>${tbl(mine,'give',give)}</div><div><b>You get (${TR.tn})</b>${tbl(theirs,'get',get)}</div></div>
    <p>Cash ($k): <input type="number" style="width:90px" value="${cash}" onchange="TR.cash=Math.round(+this.value||0);TR.res='';render()">
      <span class="mu">positive = you add cash, negative = they add cash. You have $${Math.round(G.cash)}k, ${TR.tn} has $${Math.round(T.cash)}k.</span></p>
    <p>You give ~<b>$${gv}k</b>${cash>0?` + $${cash}k cash`:''} · You get ~<b>$${tvv}k</b>${cash<0?` + $${-cash}k cash`:''}<br>
      <span class="mu">Value counts age, OVR and potential, so a high-potential youngster can be worth more than his rating. Extra players on the same side are worth a bit less than the first. ${TR.tn} has a hidden asking price, so these numbers are only a guide.</span></p>
    <button onclick="doTrade()">Propose trade</button> <button class="t" onclick="closeTrade()">Cancel</button>
    ${TR.res?`<p>${TR.res}</p>`:''}</div>`;
}
function doTrade(){
  if(!TR)return;
  const {T:B,get,give}=trSel(),A=G.T[G.me],cash=Math.round(+TR.cash||0);
  if(!get.length||(!give.length&&cash<=0)){TR.res='Pick at least one player to get, and offer a player or some cash.';return render()}
  if(cash>0&&G.cash<cash){TR.res=`You can't afford to add $${cash}k.`;return render()}
  if(cash<0&&B.cash<-cash){TR.res=`${TR.tn} can't afford to add $${-cash}k.`;return render()}
  if(!fitsMe(get,give)){TR.res='Your bench would overflow. Give more players or release someone first.';return render()}
  const gr=get.reduce((s,p)=>s+greedT(TR.tn,p),0)/get.length;
  const miss=get.filter(x=>B.p.includes(x)&&!give.some(y=>y.r===x.r||y.r==='FLEX'||x.r==='FLEX')).length; // starters they lose without a same-role replacement
  const ask=pkgVal(get)*gr*(1+.06*miss),r=(pkgVal(give)+cash)/ask;
  if(r>=1){
    get.forEach(x=>removeFrom(B,x));give.forEach(x=>removeFrom(A,x));
    if(cash){money(-cash,'Transfers');B.cash+=cash}
    give.forEach(x=>{x.contract=x.contract||1});
    get.forEach(x=>{x.contract=x.contract||1});
    settleAI(TR.tn,give);
    get.slice().sort((a,b)=>ov(b)-ov(a)).forEach(x=>place(x));
    G.offers=(G.offers||[]).filter(o=>!give.some(x=>x.id===o.pid||x.id===o.give));
    const gN=give.map(x=>x.n).join(', ')||'nobody',tN=get.map(x=>x.n).join(', ');
    G.msg=`Trade done: ${gN}${cash>0?` + $${cash}k`:''} to ${TR.tn} for ${tN}${cash<0?` (+$${-cash}k from them)`:''}.`;
    news(`${G.me} traded ${gN} to ${TR.tn} for ${tN}`);
    TR=null;
  }else{
    TR.res=`${TR.tn}: `+(r>=.92?'"We\'re very close. Add a little more."':r>=.75?'"That\'s not enough for us."':'"No chance. Come back with a real offer."');
  }
  render();
}

/* ----- contract extensions (your own players) ----- */
function setOffer(id){
  const f=findP(id);if(!f)return;
  const v=est(f.p,+$('#ns'+id).value);
  $('#no'+id).value=v;
  $('#nv'+id).textContent='~$'+v+'k';
}
function negotiate(id){
  const f=findP(id);
  if(!f||f.t!==G.me)return;
  const p=f.p,s=+$('#ns'+id).value,o=Math.round(+$('#no'+id).value);
  NEG[id]={s,o};
  if((p.nt||0)>=3){G.msg=`${p.n} refuses to talk until next split.`;return render()}
  if(!(o>0)){G.msg='Enter an offer first.';return render()}
  if((p.contract||0)+s>6){G.msg=`${p.n}'s deal can't run past 6 splits.`;return render()}
  if(G.cash<o){G.msg=`You can't afford a $${o}k offer.`;return render()}
    const ask=Math.round(est(p,s)*greed(p)*(1-.12*(G.T[G.me].win??.5)));
  if(o>=ask){
    money(-o,'Contracts');
    p.contract=(p.contract||0)+s;
    p.nt=0;
    delete NEG[id];
    G.msg=`${p.n} signed a ${s}-split extension for $${o}k.`;
  }else{
    p.nt=(p.nt||0)+1;
    const r=o/ask,left=3-p.nt;
    G.msg=`${p.n}: `+(r>=.9?'"We\'re close. A little more."':r>=.7?'"That\'s well short of what I\'m worth."':'"That\'s insulting."')
      +(left?` (${left} attempt${left>1?'s':''} left)`:' He is done talking until next split.');
  }
  render();
}
/* ----- bidding on free agents who just came off contract ----- */
function setFOffer(id){
  const p=G.fa.find(x=>x.id==id);if(!p)return;
  const v=est(p,+$('#fs'+id).value);
  $('#fo'+id).value=v;$('#fv'+id).textContent='~$'+v+'k';
}
function bid(i){
  const p=G.fa[i];
  if(!p||!p.rv)return;
  const s=+$('#fs'+p.id).value,o=Math.round(+$('#fo'+p.id).value);
  FNEG[p.id]={s,o};
  if(!(o>0)){G.msg='Enter an offer first.';return render()}
  if(G.cash<o){G.msg=`You can't afford a $${o}k offer.`;return render()}
  if(!canPlace(p)){G.msg=`No room: your bench is full (${BMAX}) and ${p.r} isn't vacant. Release someone first.`;return render()}
    const best=Math.max(...p.rv.map(x=>x.r)),score=o/est(p,s)*(p.old===G.me?1.05+.1*(G.T[G.me].win??.5):1); // old team edge grows when you win
  if(score>=best){
    money(-o,'Signings');
    p.contract=s;p.nt=0;delete p.rv;delete p.ex;delete p.old;
    G.fa.splice(i,1);
    delete FNEG[p.id];
    G.msg=`${p.n} chose your offer: ${s} split(s) for $${o}k. Added to your ${place(p)}.`;
  }else{
    p.nt=(p.nt||0)+1;
    const left=3-p.nt,r=score/best;
    if(left<=0){
      // talks broke down: he goes with his best AI suitor if one has room, otherwise stays a free agent
            const w=p.rv.filter(x=>impOK(p,x.t)).sort((a,b)=>b.r-a.r)[0];
      G.fa.splice(i,1);
            if(w){p.contract=rnd(1,4);aiPlace(p,w.t);G.msg=`${p.n} signed with ${w.t} after talks broke down.`;news(`${p.n} signed with ${w.t}`)}
      else{delete p.rv;delete p.ex;G.fa.push(p);G.msg=`${p.n} found no team and stays a free agent.`}
    }else{
      G.msg=`${p.n}: `+(r>=.9?'"I\'m leaning your way, but another team is offering a bit more."':r>=.7?'"Another team\'s offer is well above that."':'"That\'s insulting."')
        +` (${left} attempt${left>1?'s':''} left)`;
    }
  }
  render();
}

/* ---------- loans, retention, history stamping, international awards ---------- */
let LN=null,OT=null;   // LN = loan dialog, OT = org being viewed
const loanFee=(p,n)=>Math.max(5,Math.round(tv(p)*.12*n));
const ctry=p=>{const label=COUNTRY[p.c]||p.c||'Unknown';return p.c===G.T[G.me].reg?label:`<b style="color:var(--gold)">${label} · import</b>`};
const ohOf=tn=>tn===G.me?G.oh:((G.th??={})[tn]??=[]);

/* 0 = bottom of the league, 1 = champion */
function winScore(tn){
  const T=G.T[tn],pl=G.pl[T.reg]||[],pos=pl.indexOf(tn);
  let s=pos<0?.4:1-pos/Math.max(1,pl.length-1);
  const lt=G.lastTournament;
  if(lt?.winner===tn)s+=.4;else if(lt?.runnerUp===tn)s+=.2;
  return Math.min(1,s);
}
// chance an AI team re-signs an expiring player: ~80% for a champion, ~12% for the worst team
const keepChance=(tn,p)=>Math.max(.05,Math.min(.92,.12+.68*(G.T[tn].win??.5)-(p.age>=30?.1:0)));

/* records every rostered player (even bench players who never played) under the current split */
function stamp(){
  for(const tn in G.T){
    const ros=(orgEntry(tn).ros??={});
    all(tn).forEach(p=>{ent(p,tn);ros[p.n]=p.r});
  }
}

function computeIntlAwards(name){
  const key=hk(),a=awd('intl'),pool=[];
  const score=e=>e.m*2+(e.k+e.a)/Math.max(1,e.d)*3+(e.w/e.g)*5;
  Object.keys(G.T).forEach(tn=>all(tn).forEach(p=>{
    const e=p.h[key];
    if(!e||e.in.g<3)return;
    pool.push({p,id:p.id,n:p.n,t:e.t,r:p.r,sc:score(e.in)});
  }));
  pool.sort((x,y)=>y.sc-x.sc);
  const slim=x=>x&&{id:x.id,n:x.n,t:x.t,r:x.r};
  a.n=name;
  a.mvp=slim(pool[0]);
  if(pool[0])pool[0].p.ach.push(key+' · '+name+' Tournament MVP');
  a.t1=[];
  ROLES.forEach(role=>{
    const x=pool.find(y=>y.r===role);
    if(x){a.t1.push(slim(x));x.p.ach.push(key+' · '+name+' All-Tournament Team')}
  });
}

/* ----- loans ----- */
function openLoan(id){
  const f=findP(id);if(!f||f.t!==G.me||f.p.loan)return;
  LN={k:'out',id,tn:Object.keys(G.T).find(n=>n!==G.me),n:1};render();
}
function openLoanIn(tn,i,b){
  const p=(b?G.T[tn].b:G.T[tn].p)[i];if(!p||p.loan)return;
  LN={k:'in',tn,i,b:!!b,n:1};render();
}
function closeLoan(){LN=null;render()}
function loanHtml(k){
  if(!LN||LN.k!==k)return '';
  const len=`<select onchange="LN.n=+this.value;render()">${[1,2].map(x=>`<option ${x==LN.n?'selected':''}>${x}</option>`).join('')}</select>`;
  if(k==='out'){
    const f=findP(LN.id);
    if(!f||f.t!==G.me){LN=null;return ''}
        const p=f.p,fee=loanFee(p,LN.n),teams=Object.keys(G.T).filter(n=>n!==G.me).map(n=>({n,need:loanNeed(p,n)})).filter(x=>x.need).sort((a,b)=>b.need.s-a.need.s);
    if(!teams.some(x=>x.n===LN.tn))LN.tn=teams[0]?.n;
    if(!teams.length)return `<div class="box" style="border:2px solid var(--gold)"><b>Loan out ${p.n}</b><p class="mu">No team needs a ${p.r} right now. Either they have no starting ${p.r}, or he wouldn't be an upgrade. Try again after the next free agency.</p><button class="t" onclick="closeLoan()">Close</button></div>`;
    return `<div class="box" style="border:2px solid var(--gold)"><b>Loan out ${p.n}</b> (${p.r}, OVR ${ov(p)}, POT ${p.pot}, ${p.contract} split(s) left)
      <p>Loan to: <select onchange="LN.tn=this.value;render()">${teams.map(x=>`<option value="${x.n}" ${x.n===LN.tn?'selected':''}>${x.n} (${G.T[x.n].reg}) · ${x.need.t}</option>`).join('')}</select>
      for ${len} split(s) · they pay you <b>$${fee}k</b> · his wages stop while he is away</p>
      <p class="mu">He stays under your contract and returns when the loan ends. If his contract runs out first, he goes to free agency.</p>
      <button onclick="doLoanOut()">Confirm loan</button> <button class="t" onclick="closeLoan()">Cancel</button></div>`;
  }
  const T=G.T[LN.tn],p=(LN.b?T.b:T.p)[LN.i];
  if(!p){LN=null;return ''}
  const fee=loanFee(p,LN.n);
  return `<div class="box" style="border:2px solid var(--gold)"><b>Loan in ${p.n}</b> from ${LN.tn} (${p.r}, OVR ${ov(p)}, POT ${p.pot}, ${p.contract} split(s) left)
    <p>Loan length: ${len} split(s) · you pay <b>$${fee}k</b> now (you have $${Math.round(G.cash)}k) · his wages count as yours while he is here</p>
    <p class="mu">He returns to ${LN.tn} when the loan ends. You can't sell, trade or release him.</p>
    <button onclick="doLoanIn()">Confirm loan</button> <button class="t" onclick="closeLoan()">Cancel</button></div>`;
}
function doLoanOut(){
  if(!LN)return;
  const f=findP(LN.id);
  if(!f||f.t!==G.me)return;
    if(!LN.tn)return;
  const p=f.p,n=LN.n,tn=LN.tn,fee=loanFee(p,n),T=G.T[tn];
  if(!loanNeed(p,tn)){G.msg=`${tn} doesn't need a ${p.r} right now.`;return render()}
  if((p.contract||0)<=n){G.msg=`${p.n}'s contract ends too soon for a ${n}-split loan.`;return render()}
  if(T.cash<fee){G.msg=`${tn} can't afford the $${fee}k loan fee.`;return render()}
  removeFrom(G.T[G.me],p);
  money(fee,'Loans');T.cash-=fee;
  p.loan={from:G.me,left:n};
  aiPlace(p,tn);
  G.offers=(G.offers||[]).filter(x=>x.pid!==p.id&&x.give!==p.id);
  G.msg=`${p.n} is on loan at ${tn} for ${n} split(s). You received $${fee}k.`;
  news(`${G.me} loaned ${p.n} to ${tn}`);
  LN=null;render();
}
function doLoanIn(){
  if(!LN)return;
  const tn=LN.tn,T=G.T[tn],p=(LN.b?T.b:T.p)[LN.i];
  if(!p||p.loan){LN=null;return render()}
  const n=LN.n,fee=loanFee(p,n);
  if((p.contract||0)<=n){G.msg=`${p.n}'s contract ends too soon for a ${n}-split loan.`;return render()}
  if(G.cash<fee){G.msg=`You can't afford the $${fee}k loan fee.`;return render()}
  if(!canPlace(p)){G.msg=`Your bench is full (${BMAX}). Release someone first.`;return render()}
  removeFrom(T,p);money(-fee,'Loans');T.cash+=fee;
  p.loan={from:tn,left:n};
  const where=place(p);aiFix(tn);
  G.msg=`${p.n} joined your ${where} on loan from ${tn} for ${n} split(s) ($${fee}k).`;
  news(`${G.me} loaned ${p.n} from ${tn}`);
  LN=null;render();
}
function endLoan(id){ // recall my loaned-out player, or send a borrowed player back
  const f=findP(id);if(!f||!f.p.loan)return;
  const p=f.p,home=p.loan.from,holder=f.t;
  if(home===G.me){
    if(!canPlace(p)){G.msg=`Your bench is full (${BMAX}). Release someone first.`;return render()}
    removeFrom(G.T[holder],p);delete p.loan;place(p);aiFix(holder);
    G.msg=`${p.n} is back on your roster.`;
  }else{
    removeFrom(G.T[G.me],p);delete p.loan;aiPlace(p,home);
    G.msg=`${p.n} returned to ${home}.`;
  }
  render();
}
function loansHtml(){
  const L=[];
  for(const tn in G.T)all(tn).forEach(p=>{if(p.loan&&(tn===G.me||p.loan.from===G.me))L.push({p,tn})});
  if(!L.length)return '';
  return `<div class="box"><b>Loans</b><table><tr><th>Player</th><th>Role</th><th>OVR</th><th>Where</th><th>Splits left</th><th></th></tr>
  ${L.map(({p,tn})=>`<tr><td>${pl(p)}</td><td>${p.r}</td><td>${ov(p)}</td><td>${tn===G.me?'Borrowed from '+p.loan.from:'Loaned to '+tn}</td><td>${p.loan.left}</td><td><button class="t" onclick="endLoan(${p.id})">${tn===G.me?'Return':'Recall'}</button></td></tr>`).join('')}</table>
  <p class="mu">Fees are paid up front. Loans end automatically after each MSC / M Series once the set number of splits has passed.</p></div>`;
}

/* ---------- player links, loan needs, player search ---------- */
const nl=n=>`<a href="#" onclick="goPN(decodeURIComponent('${encodeURIComponent(n).replace(/'/g,'%27')}'));return false">${n}</a>`;
function goPN(n){ // open a player's profile by name, including players in saved matches
  const f=Object.keys(G.T).flatMap(tn=>all(tn)).concat(G.fa).find(p=>p.n===n);
  if(f)return goP(f.id);
  const retired=(G.ret||[]).find(p=>p.n===n&&p.id);
  if(retired)return goP(retired.id);
  const matches=[G.last,...Object.values(G.po||{}).flat(),...Object.values(G.io||{}).flat()];
  for(const m of matches.filter(Boolean))for(const g of m.gs||[])for(const side of g.S||[]){
    const x=side.find(v=>v.p?.n===n);
    if(x)return goP(x.p.id);
  }
  G.msg=`${n} has retired. See the Hall of Fame tab for retired players.`;render();
}

/* does this team need him? no starter at that role, or he'd be an upgrade */
function loanNeed(p,tn){
  if(p.r==='FLEX')return null;
  const st=G.T[tn].p.find(x=>x.r===p.r);
  if(!st)return {t:`has no starting ${p.r}`,s:100};
  const d=ov(p)-ov(st);
  return d>=2?{t:`upgrade over ${st.n} (+${d} OVR)`,s:d}:null;
}

const SQ0=()=>({q:'',role:'ALL',c:'ALL',wh:'ALL',min:0,pot:0,age:45,sort:'ovr'});
let SQ=SQ0();
function searchHtml(){
  const rows=[];
  for(const tn in G.T){const T=G.T[tn];T.p.forEach((p,i)=>rows.push({p,tn,i,b:0}));T.b.forEach((p,i)=>rows.push({p,tn,i,b:1}))}
  G.fa.forEach((p,i)=>rows.push({p,tn:'Free agent',i,b:0}));
  const q=SQ.q.trim().toLowerCase(),cs=[...new Set(rows.map(x=>x.p.c))].sort();
  const isFA=x=>x.tn==='Free agent';
  const sortF={ovr:x=>ov(x.p),pot:x=>x.p.pot,age:x=>-x.p.age,value:x=>tv(x.p)}[SQ.sort];
  const res=rows.filter(x=>(!q||x.p.n.toLowerCase().includes(q)||x.tn.toLowerCase().includes(q))
      &&(SQ.role==='ALL'||x.p.r===SQ.role)&&(SQ.c==='ALL'||x.p.c===SQ.c)
      &&(SQ.wh==='ALL'||(SQ.wh==='FA'?isFA(x):SQ.wh==='MINE'?x.tn===G.me:!isFA(x)&&x.tn!==G.me))
      &&ov(x.p)>=SQ.min&&x.p.pot>=SQ.pot&&x.p.age<=SQ.age)
    .sort((a,b)=>sortF(b)-sortF(a));
  const sel=(k,opts)=>`<select onchange="SQ.${k}=this.value;render()">${opts.map(o=>`<option value="${o[0]}" ${SQ[k]===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`;
  const num=(k,l,d)=>`${l} <input type="number" style="width:60px" value="${SQ[k]}" onchange="SQ.${k}=this.value===''?${d}:+this.value;render()">`;
  const act=x=>x.tn===G.me?'<span class="mu">your player</span>'
    :isFA(x)?(x.p.rv?`<button class="t" onclick="go('market')">Bid in Market</button>`:`<button onclick="sign(${x.i})" ${G.cash<cost(x.p)?'disabled':''}>Sign $${cost(x.p)}k</button>`)
    :x.p.loan?'<span class="mu">on loan</span>'
    :`<button onclick="buyout('${x.tn}',${x.i},${x.b})" ${G.cash<bcost(x.p)?'disabled':''}>$${bcost(x.p)}k</button> <button onclick="openTrade('${x.tn}',${x.i},${x.b})">Trade</button> <button class="t" onclick="openLoanIn('${x.tn}',${x.i},${x.b})">Loan</button>`;
  return tradeHtml()+loanHtml('in')+`<div class="box"><b>Player search</b><br>
    Name or team <input value="${SQ.q.replace(/"/g,'&quot;')}" onchange="SQ.q=this.value;render()">
    Role ${sel('role',[['ALL','All'],...ROLES.map(r=>[r,r])])}
    Country ${sel('c',[['ALL','All'],...cs.map(c=>[c,c])])}
    Where ${sel('wh',[['ALL','Everywhere'],['OTHERS','Other teams'],['FA','Free agents'],['MINE','My team']])}<br>
    ${num('min','Min OVR',0)} ${num('pot','Min POT',0)} ${num('age','Max age',45)}
    Sort by ${sel('sort',[['ovr','OVR'],['pot','POT'],['age','Youngest'],['value','Value']])}
    <button class="t" onclick="SQ=SQ0();render()">Reset</button></div>
  <div class="box"><b>${res.length} player${res.length===1?'':'s'}</b>${res.length>60?' <span class="mu">(showing the first 60, narrow the filters)</span>':''}
    <table><tr><th>Team</th><th>Role</th><th>Player</th><th>Age</th><th>Ctry</th><th>OVR</th><th>POT</th><th>Contract</th><th>Value</th><th></th></tr>
    ${res.slice(0,60).map(x=>`<tr><td>${x.tn}</td><td>${x.p.r}</td><td class="hi">${pl(x.p)}</td><td>${x.p.age}</td><td>${ctry(x.p)}</td><td>${ov(x.p)}</td><td>${x.p.pot}</td><td>${x.p.contract||0}</td><td>$${tv(x.p)}k</td><td>${act(x)}</td></tr>`).join('')}</table></div>`;
}


/* ---------- rookies, youth academy, selling negotiation ---------- */
const acad=()=>{G.ac??=[];return G.acad??={lv:0}};
const ACOST=[60,120,200,320,500];               // cost to reach level 1..5
const acCap=()=>2+Math.ceil(acad().lv/2);       // academy squad size
const acUp=()=>acad().lv*8;                     // upkeep per split ($k)
const rcost=p=>Math.max(15,Math.round((p.pot-60)*3)); // rookie scouting cost depends on potential

/* a new class of 16-19 year olds every offseason: low OVR, high POT, 3 top prospects */
function genRookies(){
  aiRookies(); // last year's unsigned class becomes ordinary free agents
  G.rkYr=G.yr;
  let best=0;
  for(let k=0;k<14;k++){
    const c=Math.random()<.25?RG[rnd(0,RG.length-1)]:G.reg,top=k<3;
    const p=mk(ign(c),ROLES[k%5],top?rnd(62,70):rnd(54,66),rnd(16,19),c);
    p.pot=cl(top?rnd(88,96):rnd(72,88));p.rk=1;p.contract=0;p.cls=G.yr;
    best=Math.max(best,p.pot);
    G.fa.push(p);
  }
  G.yMsg=`🌱 The ${G.yr} rookie class is in the Academy tab (best prospect POT ${best}).`;
}
function aiRookies(){ // AI teams scout the class: best potential goes first
  const cls=G.fa.filter(p=>p.cls).sort((a,b)=>b.pot-a.pot);
  for(const tn of shuf(Object.keys(G.T).filter(n=>n!==G.me))){
    if(!cls.length)break;
    if(G.T[tn].b.length>=BMAX||Math.random()>.45)continue;
    const p=cls.shift();
    G.fa.splice(G.fa.indexOf(p),1);delete p.cls;
    p.contract=rnd(2,4);
    aiPlace(p,tn);
    if(p.pot>=88)news(`${tn} signed rookie prospect ${p.n} (${p.r}, POT ${p.pot})`);
  }
  G.fa.forEach(p=>{delete p.cls});
}
/* once a year: your academy graduates + AI teams promote their own youngsters */
function genYouth(){
  const a=acad(),out=[];
  if(a.lv>=1){
    const n=a.lv>=4?2:1;
    for(let k=0;k<n;k++){
      if(G.ac.length>=acCap()){news(`${G.me}'s academy squad is full: no new prospect this year.`);break}
      const p=mk(ign(G.reg),ROLES[rnd(0,4)],rnd(52+a.lv*2,60+a.lv*2),rnd(16,17),G.reg);
      p.pot=cl(rnd(70+a.lv*3,82+a.lv*3));p.rk=1;p.contract=0;
      G.ac.push(p);out.push(p.n);
    }
  }
  for(const tn of Object.keys(G.T)){
    const T=G.T[tn];
    if(tn===G.me||T.b.length>=BMAX||Math.random()>.5)continue;
    const p=mk(ign(T.reg),ROLES[rnd(0,4)],rnd(52,64),rnd(16,18),T.reg);
    p.pot=cl(rnd(70,80+Math.min(10,Math.round(T.fans/60))));p.rk=1;p.contract=rnd(2,4);
    T.b.push(p);
  }
  if(out.length)G.yMsg=(G.yMsg?G.yMsg+'<br>':'')+`🎓 Academy graduates: ${out.join(', ')}`;
  return out;
}
function acUpgrade(){
  const a=acad();
  if(a.lv>=5)return;
  const c=ACOST[a.lv];
  if(G.cash<c){G.msg=`You need $${c}k.`;return render()}
  money(-c,'Academy');a.lv++;
  G.msg=`Youth academy is now level ${a.lv}.`;render();
}
function promote(id){
  acad();
  const i=G.ac.findIndex(x=>x.id===id),p=G.ac[i];if(!p)return;
  if(!canPlace(p)){G.msg=`Your bench is full (${BMAX}). Release someone first.`;return render()}
  G.ac.splice(i,1);p.contract=rnd(3,4);
  G.msg=`${p.n} promoted from the academy. Added to your ${place(p)}.`;render();
}
function relAcad(id){
  acad();
  const i=G.ac.findIndex(x=>x.id===id),p=G.ac[i];if(!p)return;
  G.ac.splice(i,1);p.contract=0;p.old='Academy';G.fa.push(p);render();
}
function signRookie(id,toAcad){
  acad();
  const i=G.fa.findIndex(x=>x.id===id),p=G.fa[i];
  if(!p||!p.cls)return;
  const c=rcost(p);
  if(G.cash<c){G.msg=`You need $${c}k.`;return render()}
  if(toAcad){
    if(acad().lv<1){G.msg='Build a youth academy first.';return render()}
    if(G.ac.length>=acCap()){G.msg='Your academy squad is full.';return render()}
  }else if(!canPlace(p)){G.msg=`Your bench is full (${BMAX}). Release someone first.`;return render()}
  money(-c,'Rookies');
  G.fa.splice(i,1);delete p.cls;delete p.old;
  if(toAcad){G.ac.push(p);G.msg=`${p.n} (POT ${p.pot}) joined your academy.`}
  else{p.contract=rnd(3,4);G.msg=`Signed ${p.n} (POT ${p.pot}) for ${p.contract} splits. Added to your ${place(p)}.`}
  render();
}
function academyHtml(){
  const a=acad(),cls=G.fa.filter(p=>p.cls).sort((x,y)=>y.pot-x.pot);
  let h=`<div class="box"><b>Youth academy</b> · level ${a.lv}/5 · squad ${G.ac.length}/${acCap()}
    <p class="mu">${a.lv?`Each year it produces ${a.lv>=4?2:1} prospect${a.lv>=4?'s':''} (age 16-17, POT about ${70+a.lv*3}-${82+a.lv*3}). Academy players grow faster than normal, cost no wages, and leave for free agency at age 21 if you haven't promoted them. Upkeep $${acUp()}k per split.`:'Build an academy to raise your own prospects: free youngsters every year who grow faster. You can also sign rookies straight into it.'}</p>
    ${a.lv<5?`<button onclick="acUpgrade()" ${G.cash<ACOST[a.lv]?'disabled':''}>${a.lv?'Upgrade to':'Build'} level ${a.lv+1} · $${ACOST[a.lv]}k</button>`:'<span class="mu">Max level.</span>'}</div>`;
  h+=`<div class="box"><b>Academy squad</b>${G.ac.length?`<table>${hd(0)}<th></th></tr>${G.ac.map(p=>row(p,0,1)+`<td><button onclick="promote(${p.id})">Promote</button> <button class="t" onclick="relAcad(${p.id})">Release</button></td></tr>`).join('')}</table>`:'<p class="mu">Empty.</p>'}</div>`;
  h+=`<div class="box"><b>Rookie class${cls.length?' '+cls[0].cls:''}</b> (${cls.length})
    <p class="mu">A new class of 16-19 year olds arrives every offseason. Their OVR is low but their potential is high. AI teams sign the best ones when free agency closes, so move early. Sign to your academy (needs a free slot) or straight to your roster.</p>
    ${cls.length?`<table>${hd(0)}<th>Cost</th><th></th></tr>${cls.map(p=>`${row(p,0,1)}<td>$${rcost(p)}k</td><td><button onclick="signRookie(${p.id},1)" ${G.cash<rcost(p)||a.lv<1||G.ac.length>=acCap()?'disabled':''}>Academy</button> <button onclick="signRookie(${p.id},0)" ${G.cash<rcost(p)?'disabled':''}>Roster</button></td></tr>`).join('')}</table>`:'<p class="mu">No rookies available right now.</p>'}</div>`;
  return h;
}

/* ----- selling: a real negotiation ----- */
let SL=null;
function buyerMax(tn,p){ // the most this team would pay (hidden): 0 if they don't need him
  const need=loanNeed(p,tn)||(p.r==='FLEX'?{s:3}:null);
  if(!need)return 0;
  const bonus=need.s>=100?1.15:1+Math.min(.15,need.s*.015); // empty slot pays most, bigger upgrade pays more
  return Math.round(sellPrice(p)*(.85+(hs(tn+p.n+'s')%36)/100)*bonus);
}
function sell(id){
  const f=findP(id);
  if(!f||f.t!==G.me)return;
  if(f.p.loan){G.msg='Loaned players can\'t be sold. Return or recall him first.';return render()}
  SL={id,tn:null,ask:sellPrice(f.p),try:{},out:{},res:'',counter:null};
  render();
}
function closeSell(){SL=null;render()}
function sellHtml(){
  if(!SL)return '';
  const f=findP(SL.id);
  if(!f||f.t!==G.me||f.p.loan){SL=null;return ''}
  const p=f.p;
  const bs=Object.keys(G.T).filter(n=>n!==G.me&&!SL.out[n]).map(n=>({n,need:loanNeed(p,n)||(p.r==='FLEX'?{t:'wants depth',s:3}:null)})).filter(x=>x.need).sort((a,b)=>b.need.s-a.need.s);
  if(!bs.some(x=>x.n===SL.tn))SL.tn=bs[0]?.n;
  const head=`<b>Sell ${p.n}</b> (${p.r}, age ${p.age}, OVR ${ov(p)}, POT ${p.pot}) · contract ${p.contract||0} split(s) left · market price ~$${sellPrice(p)}k`;
  const note=`<p class="mu">Teams only pay for a player they need: an empty ${p.r} slot or an upgrade. The shorter his contract, the less they pay (1 split ×${CMULT[1]}, 2 ×${CMULT[2]}, 3 ×${CMULT[3]}, 4 or more ×1+). Each buyer gives you 3 tries, then walks away.</p>`;
  if(!bs.length)return `<div class="box" style="border:2px solid var(--gold)">${head}${note}<p>No team is interested right now.${SL.res?' '+SL.res:''}</p><button class="t" onclick="closeSell()">Close</button></div>`;
  const left=3-(SL.try[SL.tn]||0);
  return `<div class="box" style="border:2px solid var(--gold)">${head}${note}
    <p>Buyer: <select onchange="SL.tn=this.value;SL.res='';SL.counter=null;render()">${bs.map(x=>`<option value="${x.n}" ${x.n===SL.tn?'selected':''}>${x.n} (${G.T[x.n].reg}) · ${x.need.t} · cash $${Math.round(G.T[x.n].cash)}k</option>`).join('')}</select>
      Your price ($k): <input type="number" style="width:90px" value="${SL.ask}" onchange="SL.ask=Math.round(+this.value||0)">
      <button onclick="sellOffer()">Make offer</button> <span class="mu">${left} tr${left===1?'y':'ies'} left with ${SL.tn}</span></p>
    ${SL.res?`<p>${SL.res}</p>`:''}
    ${SL.counter?`<p><button onclick="sellAccept()">Accept ${SL.tn}'s $${SL.counter}k</button></p>`:''}
    <button class="t" onclick="closeSell()">Cancel</button></div>`;
}
function sellOffer(){
  if(!SL||!SL.tn)return;
  const f=findP(SL.id);if(!f||f.t!==G.me)return;
  const p=f.p,tn=SL.tn,B=G.T[tn],ask=Math.max(1,Math.round(+SL.ask||0));
  const max=Math.min(buyerMax(tn,p),Math.floor(B.cash));
  if(ask<=max)return completeSale(p,tn,ask);
  const t=SL.try[tn]=(SL.try[tn]||0)+1,r=ask/Math.max(1,max);
  SL.counter=null;
  if(r<=1.1){SL.counter=Math.max(1,Math.round(max*.97));SL.res=`${tn}: "We're close. We can do $${SL.counter}k."`}
  else if(r<=1.3)SL.res=`${tn}: "That's more than we want to pay. Come down a bit."`;
  else SL.res=`${tn}: "That's way too high."`;
  if(t>=3){SL.res+=` ${tn} has stopped negotiating.`;SL.out[tn]=1;SL.counter=null}
  render();
}
function sellAccept(){
  if(!SL||!SL.counter)return;
  const f=findP(SL.id);if(!f||f.t!==G.me)return;
  completeSale(f.p,SL.tn,SL.counter);
}
function completeSale(p,tn,price){
  const B=G.T[tn];
  removeFrom(G.T[G.me],p);
  money(price,'Transfers');B.cash-=price;
  p.contract=p.contract||1;
  aiPlace(p,tn);
  G.offers=(G.offers||[]).filter(x=>x.pid!==p.id&&x.give!==p.id);
  G.msg=`Sold ${p.n} to ${tn} for $${price}k.`;
  news(`${G.me} sold ${p.n} to ${tn} for $${price}k`);
  SL=null;render();
}


/* =====================================================================
   SAVE / LOAD / NAVIGATION
   ===================================================================== */
const SK='mlbb:save:';
function save(){
  try{
    G.t=Date.now();
    const po={},io={};
    for(const r in G.po)po[r]=G.po[r].map(m=>({...m,gs:null}));
    for(const k in G.io)io[k]=G.io[k].map(m=>({...m,gs:null}));
    const last=G.last?{...G.last,gs:null}:null;
    localStorage.setItem(SK+G.id,JSON.stringify({...G,po,io,last,day:null,cur:G.cur?{hist:G.cur.hist}:null}));
  }catch(e){G.msg='Save failed: '+e.message}
}
function saves(){
  const a=[];
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);
    if(k.startsWith(SK))try{const o=JSON.parse(localStorage.getItem(k));a.push({id:o.id,me:o.me,yr:o.yr,sp:o.sp,cash:o.cash,t:o.t})}catch(e){}}
  return a.sort((x,y)=>y.t-x.t);
}
function load(id){
  const raw=localStorage.getItem(SK+id);
  if(!raw)return;
  G=JSON.parse(raw);
  G.fa??=[];G.recap??=null;G.pendingRecap??=false;G.lastTournament??=null;
  G.po??={};G.tb??={};G.pl??={};G.hist??=[];
  G.ch??={};G.oh??=[];G.ret??=[];G.hof??=[];G.news??=[];G.offers??=[];G.nid??=0;
  G.fin??={};G.fin.t??={};G.fin.sp??=[];G.fin.off??=[];G.fin.mk??={};

  for(const region of RG){
    const savedTeams=Object.keys(G.T).filter(name=>G.T[name].reg===region);
    if(savedTeams.length&&savedTeams.some(name=>!R[region].includes(name)))R[region]=savedTeams;
  }
  used.clear();
  NID=0;
  for(const teamName in G.T){
    const T=G.T[teamName];
    T.b??=[];
    T.fans??=60+hs(teamName+'f')%220;
    T.cash??=300+hs(teamName+'c')%300;
    all(teamName).forEach(player=>{
      fixP(player);
      player.c??=T.reg;
      player.contract??=rnd(1,4);
      player.s??=S0();player.h??={};player.ach??=[];player.earn??=0;
      used.add(player.n);
      NID=Math.max(NID,player.id||0);
    });
  }
  G.fa.forEach(player=>{
    fixP(player);
    player.c??=G.reg;
    if(!player.rv)player.contract=0;
    player.s??=S0();player.h??={};player.ach??=[];player.earn??=0;
    used.add(player.n);
    NID=Math.max(NID,player.id||0);
  });
    if(G.dr)G.dr.pool.forEach(player=>{fixP(player);player.s??=S0();player.h??={};player.ach??=[];player.earn??=0;used.add(player.n);NID=Math.max(NID,player.id||0)});
    G.acad??={lv:0};G.ac??=[];
  G.ac.forEach(p=>{fixP(p);p.c??=G.reg;p.s??=S0();p.h??={};p.ach??=[];p.earn??=0;used.add(p.n);NID=Math.max(NID,p.id||0)});
  if(G.rkYr!==G.yr)genRookies();
  if(!G.fin.off.length&&G.T[G.me])G.fin.off=sponsorOffers();
  Object.keys(G.T).filter(tn=>tn!==G.me).forEach(tn=>{aiFix(tn);aiTrimImports(tn)});

  if(G.cur){
    const savedHistory=G.cur.hist||[];
    const generator=ST[G.sp][G.st][1]();
    let next=generator.next();
    for(const day of savedHistory)next=generator.next(day);
    G.cur=next.done?null:{g:generator,nx:next,n:savedHistory.length,hist:savedHistory};
  }
  TAB='roster';LR=LT=PV=null;NAV=[];TR=null;
  render();
}
function del(id){if(confirm('Delete this save?')){localStorage.removeItem(SK+id);render()}}
function menu(){save();NEG={};FNEG={};IK=null;MHK='';PK=null;TR=null;NAV=[];G=null;render()}
function findP(id){
  for(const k in G.T){const p=all(k).find(x=>x.id==id);if(p)return{p,t:k}}
  const p=G.fa.find(x=>x.id==id);if(p)return{p,t:'Free agent'};
  const q=(G.ac||[]).find(x=>x.id==id);return q?{p:q,t:'Academy'}:null;
  // A player may have retired after appearing in a saved playoff/tournament match.
  const matches=[G.last,...Object.values(G.po||{}).flat(),...Object.values(G.io||{}).flat()];
  for(const m of matches.filter(Boolean)){
    for(const g of m.gs||[])for(const side of g.S||[]){
      const x=side.find(v=>v.p?.id==id);
      if(x)return{p:x.p,t:'Retired'};
    }
  }
  const retired=(G.ret||[]).find(x=>x.id==id);
  return retired?{p:retired,t:'Retired'}:null;
}
function edit(id,k,v){
  const f=findP(id);if(!f)return;
  if(k=='n')f.p.n=v.trim()||f.p.n;
    else if(k=='age'){f.p.age=Math.max(16,Math.min(45,Math.round(+v)||f.p.age));f.p.by=G.yr-f.p.age;f.p.ageVerified=true;}
  else f.p[k]=cl(+v||f.p[k]);
  render();
}

/* ----- navigation with a back button ----- */
const snap=()=>({TAB,PV,LR,LT,PK,IS,TR});
function go(t){
  if(t!==TAB){NAV.push(snap());if(NAV.length>40)NAV.shift()}
  if(t==='league') LT=null;
  TAB=t;
  render();
}
function goP(id){NAV.push(snap());PV=id;TAB='player';render()}
function goTeam(k){NAV.push(snap());LT=k;TAB='league';TR=null;render()}
function setLR(x){LR=x;LT=null;TR=null;render()}
function back(){
  const s=NAV.pop();if(!s)return;
  ({TAB,PV,LR,LT,PK,IS,TR}=s);
  render();
}

/* =====================================================================
   UI
   ===================================================================== */
const pl=p=>`<a href="#" onclick="goP(${p.id});return false">${p.n}</a>${p.loan?' <span class="mu">(loan)</span>':''}`;
const row=(p,s,imp)=>`<tr><td>${p.r}</td><td class="hi">${pl(p)}</td><td>${p.age}</td><td>${imp?ctry(p):p.c}</td><td>${p.mec}</td><td>${p.mac}</td><td>${p.tf}</td><td>${p.con}</td><td class="hi">${ov(p)}</td><td>${p.pot}</td>${s?`<td>${p.s.g}</td><td>${p.s.k}/${p.s.d}/${p.s.a}</td><td>${kda(p.s)}</td><td>${p.s.m}</td>`:''}`;
const hd=s=>`<tr><th>Role</th><th>Player</th><th>Age</th><th>Ctry</th><th>MEC</th><th>MAC</th><th>TF</th><th>CON</th><th>OVR</th><th>POT</th>${s?'<th>GP</th><th>K/D/A</th><th>KDA</th><th>MVP</th>':''}`;

/* ----- match cards ----- */
const box=(t,S,win,mvp)=>`<table class="bx ${win?'bw':''}"><tr><th>${t}${win?' ✔':''}</th><th>K</th><th>D</th><th>A</th><th>KDA</th><th>Gold</th></tr>${S.map(x=>`<tr class="${x.p.n===mvp?'mv':''}"><td>${x.p.r} ${pl(x.p)}${x.p.n===mvp?' ★':''}</td><td>${x.k}</td><td>${x.d}</td><td>${x.a}</td><td>${kda(x)}</td><td>${x.gold}</td></tr>`).join('')}</table>`;
const gameHtml=(m,g,i,o)=>`<details class="gm" ${o?'open':''}><summary>Game ${i+1} · <b>${[m.a,m.b][g.w]}</b> won · ${g.min}:00 · kills ${g.ks[0]}-${g.ks[1]} · MVP ${nl(g.mvp)}</summary>
  <div class="gm-grid">${box(m.a,g.S[0],g.w===0,g.mvp)}${box(m.b,g.S[1],g.w===1,g.mvp)}</div>
  <details class="pbp"><summary>Play-by-play</summary><div class="mu">${g.lg.join('<br>')}</div></details></details>`;
function serKda(m){
  if(!Array.isArray(m.gs))return '';
  const tab=(name,side)=>{
    const t=new Map();
    m.gs.forEach(g=>g.S[side].forEach(x=>{
      const o=t.get(x.p.n)||{r:x.p.r,k:0,d:0,a:0};
      o.k+=x.k;o.d+=x.d;o.a+=x.a;t.set(x.p.n,o);
    }));
    return `<table class="bx"><tr><th>${name} · series</th><th>K</th><th>D</th><th>A</th><th>KDA</th></tr>${[...t].map(([n,o])=>`<tr><td>${o.r} ${nl(n)}</td><td>${o.k}</td><td>${o.d}</td><td>${o.a}</td><td>${kda(o)}</td></tr>`).join('')}</table>`;
  };
  return `<details class="gm"><summary>Series KDA totals</summary><div class="gm-grid">${tab(m.a,0)}${tab(m.b,1)}</div></details>`;
}
const matchHtml=(m,o)=>{
  const mine=m.a==G.me||m.b==G.me;
  const sc=x=>m.w===x?m.sw:m.sl;
  const head=`<span class="mt-h ${mine?'me':''}"><span class="mt-tag">${m.tag}</span>
    <span class="mt-s"><b class="${m.w===m.a?'win':''}">${m.a}</b><i>${sc(m.a)}</i><em>–</em><i>${sc(m.b)}</i><b class="${m.w===m.b?'win':''}">${m.b}</b></span></span>`;
  const body=Array.isArray(m.gs)
    ? m.gs.map((g,i)=>gameHtml(m,g,i,o&&i===0)).join('')+serKda(m)
    : '<p class="mu">Game details are not kept after reloading a save.</p>';
  return `<details class="mt" ${o?'open':''}><summary>${head}</summary><div class="mt-body">${body}</div></details>`;
};
const dayHtml=()=>!G.day?'':`<div class="box"><b>${G.day.label}</b>${G.day.res.map(m=>matchHtml(m,0)).join('')}</div>`;
const lead=(f,min)=>Object.keys(G.T).flatMap(t=>G.T[t].p.map(p=>({p,t}))).filter(x=>x.p.s.g>=min).sort((a,b)=>f(b.p.s)-f(a.p.s)).slice(0,10)
  .map(x=>`<tr><td>${x.p.r}</td><td class="hi">${pl(x.p)}</td><td>${x.t}</td><td>${x.p.s.g}</td><td>${kda(x.p.s)}</td><td>${x.p.s.m}</td></tr>`).join('');

/* ----- player profile ----- */
function profile(){
  const f=findP(PV);
  if(!f)return '<div class="box">Player not found (he may have retired).</div>';
  const p=f.p,g=G.god,ks=Object.keys(p.h).reverse();
  const inp=k=>g?`<input type="number" value="${p[k]}" onchange="edit(${p.id},'${k}',this.value)">`:p[k];
  const sm=s=>s.g?`${s.g} GP · ${s.w}W · ${kda(s)} KDA · ${s.m} MVP`:'-';
  const tot=S0();ks.forEach(k=>['rs','po','in'].forEach(b=>{for(const x in tot)tot[x]+=p.h[k][b][x]}));
  return `<div class="box"><b>${g?`<input style="width:150px" value="${p.n.replace(/"/g,'&quot;')}" onchange="edit(${p.id},'n',this.value)">`:p.n}</b> · ${ctry(p)} · ${p.r} · ${G.T[f.t]?`<a href="#" onclick="goTeam('${f.t}');return false">${f.t}</a>`:f.t} · OVR ${ov(p)} · Peak ${p.pk||ov(p)}
  <table><tr><th>Age</th><th>POT</th><th>MEC</th><th>MAC</th><th>TF</th><th>CON</th><th>Contract</th></tr>
  <tr><td>${g?`<input type="number" value="${p.age}" onchange="edit(${p.id},'age',this.value)">`:`${p.ageVerified?'':'~'}${p.age}`}</td><td>${f.t==='Draft prospect'&&!g?potTxt(p):inp('pot')}</td><td>${inp('mec')}</td><td>${inp('mac')}</td><td>${inp('tf')}</td><td>${inp('con')}</td><td>${p.contract||0} split(s)</td></tr></table>
  <p class="mu">~ indicates an estimated age. Nationality is independent of league/team region.</p>
  <p>Career earnings: $${Math.round(p.earn)}k · Career: ${sm(tot)}</p></div>
  <div class="box"><b>Season history</b><table><tr><th>Split</th><th>Age</th><th>Team</th><th>Regular season</th><th>Playoffs</th><th>International</th><th>Earned</th></tr>${ks.map(k=>{const e=p.h[k];return `<tr><td>${k}</td><td>${e.ageVerified||p.ageVerified?'':'~'}${p.by!=null?+k.slice(0,4)-p.by:(e.age??p.age)}</td><td>${(e.ts||[e.t]).map(tn=>G.T[tn]?`<a href="#" onclick="goTeam('${tn}');return false">${tn}</a>`:tn).join(' → ')}</td><td>${sm(e.rs)}</td><td>${sm(e.po)}</td><td>${sm(e.in)}</td><td>$${Math.round(e.earn)}k</td></tr>`}).join('')||'<tr><td colspan="7" class="mu">No games yet.</td></tr>'}</table></div>
  <div class="box"><b>Achievements</b>${p.ach.length?achHtml(p.ach):'<span class="mu">None yet.</span>'}</div>`;
}

/* ----- awards ----- */
const awd=r=>(((G.aw??={})[hk()]??={})[r]??={});
const awName=a=>a?`${a.n} <span class="mu">(${a.t})</span>`:'—';
const allL=a=>`<table><tr><th>Role</th><th>1st Team</th><th>2nd Team</th><th>3rd Team</th></tr>${ROLES.map(role=>`<tr><td>${role}</td>${['t1','t2','t3'].map(k=>`<td>${awName((a[k]||[]).find(x=>x.r===role))}</td>`).join('')}</tr>`).join('')}</table>`;
function finalsMvp(m){
  if(!m.gs)return null;
  const side=m.w===m.a?0:1,tot=new Map();
  m.gs.forEach(g=>g.S[side].forEach(x=>tot.set(x.p,(tot.get(x.p)||0)+x.sc)));
  let best=null;
  tot.forEach((v,p)=>{if(!best||v>best.v)best={p,v}});
  return best&&{p:best.p,t:m.w};
}
function computeAwards(){
  const key=hk(),pool={};
  const score=e=>e.m*2+(e.k+e.a)/Math.max(1,e.d)*3+(e.w/e.g)*5;
  RG.forEach(r=>pool[r]=[]);
  Object.keys(G.T).forEach(tn=>all(tn).forEach(p=>{
    const e=p.h[key];
    if(!e||e.rs.g<10)return;
    const reg=G.T[e.t]?.reg;
    if(!reg)return;
        const rookie=p.rk&&(p.dy!=null?p.dy===G.yr:!Object.keys(p.h).some(k=>k!==key&&['rs','po','in'].some(b=>p.h[k][b].g>0)));
    pool[reg].push({p,id:p.id,n:p.n,t:e.t,r:p.r,sc:score(e.rs),rookie});
    }));
  RG.forEach(r=>{
    const c=pool[r].sort((a,b)=>b.sc-a.sc),a=awd(r);
    const slim=x=>x&&{id:x.id,n:x.n,t:x.t,r:x.r};
    const give=(x,txt)=>x&&x.p.ach.push(key+' · MPL '+r+' '+txt);
    a.rsmvp=slim(c[0]);give(c[0],'Regular Season MVP');
    const roty=c.find(x=>x.rookie);
    a.roty=slim(roty);give(roty,'Rookie of the Year');
    ['t1','t2','t3'].forEach((k,i)=>{
      a[k]=[];
      ROLES.forEach(role=>{
        const x=c.filter(y=>y.r===role)[i];
        if(x){a[k].push(slim(x));give(x,`All-League ${i+1}${['st','nd','rd'][i]} Team`)}
      });
    });
  });
}
const iaHtml=a=>`<p>Finals MVP: ${awName(a.fmvp)}<br>Tournament MVP: ${awName(a.mvp)}</p><table><tr><th>Role</th><th>All-Tournament Team</th></tr>${ROLES.map(role=>`<tr><td>${role}</td><td>${awName((a.t1||[]).find(x=>x.r===role))}</td></tr>`).join('')}</table>`;
function awardsHtml(){
  const keys=Object.keys(G.aw||{}).reverse();
  if(!keys.length)return '<div class="box mu">No awards yet. They are handed out after each MPL split.</div>';
  return keys.map(k=>`<div class="box"><b>${k} Awards</b>${RG.map(r=>{
    const a=G.aw[k][r];
    return a?`<details><summary>MPL ${r}</summary><p>Regular Season MVP: ${awName(a.rsmvp)}<br>Finals MVP: ${awName(a.fmvp)}<br>Rookie of the Year: ${awName(a.roty)}</p>${allL(a)}</details>`:'';
    }).join('')}${G.aw[k].intl?`<details><summary>${G.aw[k].intl.n||'International'}</summary>${iaHtml(G.aw[k].intl)}</details>`:''}</div>`).join('');
}

/* ----- contracts (your roster) ----- */
function contractsHtml(){
  return `<div class="box"><b>Contract Negotiation</b>
    <p class="mu">Contracts count down after every MSC / M Series, and every expiring player in the league goes to free agency. Offers are one-time signing bonuses; longer deals get a small discount per split. Each player gives you 3 attempts per split and his real asking price is hidden, so lowball carefully. Highlighted players are in their last split.</p>
    <table><tr><th>Player</th><th>Role</th><th>Age</th><th>OVR</th><th>POT</th><th>Left</th><th>Splits</th><th>Offer ($k)</th><th>Market value</th><th></th></tr>
    ${all(G.me).filter(p=>!p.loan).map(p=>{
      const n=NEG[p.id]||{s:1,o:est(p,1)},tried=p.nt||0;
      return `<tr><td>${pl(p)}</td><td>${p.r}</td><td>${p.age}</td><td>${ov(p)}</td><td>${p.pot}</td>
        <td class="${(p.contract??0)<=1?'hi':''}">${p.contract??0}</td>
        <td><select id="ns${p.id}" onchange="setOffer(${p.id})">${[1,2,3,4].map(x=>`<option ${x==n.s?'selected':''}>${x}</option>`).join('')}</select></td>
        <td><input id="no${p.id}" type="number" value="${n.o}"></td>
        <td class="mu" id="nv${p.id}">~$${est(p,n.s)}k</td>
        <td><button onclick="negotiate(${p.id})" ${tried>=3?'disabled':''}>Offer</button> <span class="mu">${3-tried} left</span></td></tr>`;
    }).join('')}
    </table></div>`;
}

/* ----- MSC / M Series brackets ----- */
const TL={intl:'MSC / M Series',results:'Match History',history:'League History',org:'Org History',hof:'Hall of Fame',finance:'Finance',draft:'Rookie Draft'};

function recTable(list,swiss){
  const t={};
  list.forEach(m=>{(t[m.w]??={w:0,l:0}).w++;(t[m.l]??={w:0,l:0}).l++});
  const rows=Object.keys(t).sort((a,b)=>t[b].w-t[a].w||t[a].l-t[b].l||hs(a)-hs(b));
  return `<table><tr><th>#</th><th>Team</th><th>W</th><th>L</th>${swiss?'<th>Status</th>':''}</tr>${rows.map((x,i)=>`<tr class="${x==G.me?'me':''}"><td>${i+1}</td><td>${x}</td><td>${t[x].w}</td><td>${t[x].l}</td>${swiss?`<td>${t[x].w>=3?'Qualified':t[x].l>=3?'Eliminated':'Playing'}</td>`:''}</tr>`).join('')}</table>`;
}
function pickSeries(k,i){
  if(k.startsWith('PO '))PS=k+'|'+i;else SV=k+'|'+i;
  render();
}
function brCard(m,i,k){
  if(!m)return `<div class="br-m tbd"><div class="br-t"><span>TBD</span><b>–</b></div><div class="br-t"><span>TBD</span><b>–</b></div></div>`;
  const mine=m.a==G.me||m.b==G.me;
  const side=x=>`<div class="br-t ${m.w===x?'win':'lose'} ${x==G.me?'me':''}"><span>${x}</span><b>${m.w===x?m.sw:m.sl}</b></div>`;
  return `<div class="br-m ${mine?'mine':''}" onclick="pickSeries('${k}',${i})">
    ${/Swiss/.test(m.tag)?`<div class="br-tag">${m.tag.replace('Swiss ','')}</div>`:''}${side(m.a)}${side(m.b)}</div>`;
}
function brCols(cols,k,ms){
  return `<div class="br">${cols.map((c,i)=>{
    const p=cols[i-1],recv=p&&(p.c==='pair'||p.c==='straight');
    const n=c.n||c.m.length;
    const slots=Array.from({length:n},(_,j)=>{const m=c.m[j];return `<div class="br-slot">${brCard(m,m?ms.indexOf(m):-1,k)}</div>`}).join('');
    return `<div class="br-col ${c.c} ${recv?'recv':''}"><div class="br-title">${c.t}</div><div class="br-body">${slots}</div></div>`;
  }).join('')}</div>`;
}
function intlHtml(){
  const keys=Object.keys(G.io||{}).reverse();
  if(!keys.length)return '<div class="box mu">No MSC or M Series matches yet. They appear here once the international stages start.</div>';
  const k=keys.includes(PK)?PK:keys[0],ms=G.io[k],msc=ms[0].stage.startsWith('MSC'),nm=msc?'MSC':'M Series';
  const VIEWS=[['wc','Wild Card',nm+' Wild Card'],['grp',msc?'Group Stage':'Swiss Stage',msc?'MSC Group Stage':'M Series Swiss Stage'],['po','Playoffs',nm+' Knockout']];
  const has=v=>ms.some(m=>m.stage===v[2]);
  const cur=VIEWS.filter(has).find(v=>v[0]===IS)||VIEWS.filter(has).pop();
  const gf=ms.find(m=>/Grand Final$/.test(m.tag));
  let h=`<div class="box"><b>International tournaments</b><br>
    ${periodBar(keys,k,['Split 1 · MSC','Split 2 · M Series'])}
    <p>${gf?`Champion: <span class="hi">${gf.w}</span> def. ${gf.l} ${gf.sw}-${gf.sl}`:'<span class="mu">In progress</span>'}</p>
    ${VIEWS.map(v=>`<button class="t ${cur&&cur[0]===v[0]?'on':''}" ${has(v)?'':'disabled'} onclick="IS='${v[0]}';SV=null;render()">${v[1]}</button>`).join('')}</div>`;
  if(!cur)return h;
  const L=t=>ms.filter(m=>m.tag===t),S=s=>ms.filter(m=>m.stage===s);
  const sec=(title,cols)=>`<div class="box"><b>${title}</b>${brCols(cols,k,ms)}</div>`;
  if(cur[0]==='wc'){
    const st=S(cur[2]),tags=[...new Set(st.map(m=>m.tag))].filter(t=>t.startsWith('Wild Card'));
    h+=`<div class="box"><b>WILD CARD · ROUND ROBIN</b><div class="br-tables">${tags.map(t=>`<div><b>${t}</b>${recTable(st.filter(m=>m.tag===t))}</div>`).join('')}</div></div>`;
    const g=st.filter(m=>m.tag==='Gauntlet'),d=st.filter(m=>m.tag==='Decider'),p=st.filter(m=>m.tag==='Phase 2');
    h+=msc
      ?sec('GAUNTLET',[
        {t:'Gauntlet R1',m:g.slice(0,2),n:2,c:'straight'},
        {t:'Gauntlet R2',m:g.slice(2,4),n:2,c:'none'},
        {t:'Decider R1',m:d.slice(0,2),n:2,c:'pair'},
        {t:'Decider Final',m:d.slice(2,3),n:1,c:'none'}])
      :sec('PHASE 2',[
        {t:'Semifinals',m:p.slice(0,2),n:2,c:'pair'},
        {t:'Final',m:p.slice(2,3),n:1,c:'none'}]);
  }
  if(cur[0]==='grp'){
    const st=S(cur[2]);
    if(msc){
            ['A','B'].forEach(x=>{
        const l=L('MSC Group '+x),Y0=4.6;
        const nodes=[
          ...[0,1,2,3].map(i=>({id:'r'+i,c:0,y:i,m:l[i]})),
          {id:'wa',c:1,y:.5,m:l[4]},{id:'wb',c:1,y:2.5,m:l[5]},
          {id:'la',c:1,y:Y0,m:l[6]},{id:'lb',c:1,y:Y0+1,m:l[7]},
          {id:'ma',c:2,y:Y0,m:l[8]},{id:'mb',c:2,y:Y0+1,m:l[9]}];
        const edges=[['r0','wa'],['r1','wa'],['r2','wb'],['r3','wb'],
          ['r0','la',1],['r1','la',1],['r2','lb',1],['r3','lb',1],
          ['la','ma'],['wb','ma',1],['lb','mb'],['wa','mb',1]];
        const labs=[{c:0,y:0,t:'Round 1'},{c:1,y:.5,t:'Winners match'},{c:1,y:Y0,t:'Losers round'},{c:2,y:Y0,t:'Decider'}];
        h+=`<div class="box"><b>GROUP ${x}</b> <span class="mu">winners match + deciders qualify for the playoffs</span>${cbFlow(k,ms,nodes,edges,labs)}</div>`;
      });
    }else{
      const days=[...new Set(st.map(m=>m.day))];
      h+=`<div class="box"><b>SWISS STANDINGS</b>${recTable(st,true)}</div>`
        +sec('SWISS ROUNDS',days.map((d,i)=>({t:'Round '+(i+1),m:st.filter(m=>m.day===d),c:'list'})));
    }
  }
    if(cur[0]==='po'){
    if(msc){
      const q=L('MSC Quarterfinal'),s=L('MSC Semifinal'),g=L('MSC Grand Final');
      const nodes=[...[0,1,2,3].map(i=>({id:'q'+i,c:0,y:i,m:q[i]})),{id:'s0',c:1,y:.5,m:s[0]},{id:'s1',c:1,y:2.5,m:s[1]},{id:'g',c:2,y:1.5,m:g[0]}];
      const edges=[['q0','s0'],['q1','s0'],['q2','s1'],['q3','s1'],['s0','g'],['s1','g']];
      h+=`<div class="box"><b>PLAYOFF BRACKET</b>${cbFlow(k,ms,nodes,edges,[{c:0,y:0,t:'Quarterfinals'},{c:1,y:.5,t:'Semifinals'},{c:2,y:1.5,t:'Grand final'}])}</div>`;
    }else{
      const u1=L('Upper R1'),ub=L('Upper'),uf=L('Upper Final'),lo=L('Lower'),lf=L('Lower Final'),gf=L('M Series Grand Final'),Y0=4.6;
      const nodes=[
        {id:'a0',c:0,y:0,m:u1[0]},{id:'a3',c:0,y:1,m:u1[3]},{id:'a1',c:0,y:2,m:u1[1]},{id:'a2',c:0,y:3,m:u1[2]},
        {id:'b0',c:1,y:.5,m:ub[0]},{id:'b1',c:1,y:2.5,m:ub[1]},
        {id:'uf',c:2,y:1.5,m:uf[0]},
        {id:'p0',c:1,y:Y0,m:lo[0]},{id:'p1',c:1,y:Y0+1,m:lo[1]},
        {id:'q0',c:2,y:Y0,m:lo[2]},{id:'q1',c:2,y:Y0+1,m:lo[3]},
        {id:'r',c:3,y:Y0+.5,m:lo[4]},
        {id:'lf',c:4,y:Y0+.5,m:lf[0]},
        {id:'gf',c:5,y:(1.5+Y0+.5)/2,m:gf[0]}];
      const edges=[
        ['a0','b0'],['a3','b0'],['a1','b1'],['a2','b1'],['b0','uf'],['b1','uf'],
        ['a0','p0',1],['a3','p0',1],['a1','p1',1],['a2','p1',1],
        ['p0','q0'],['b1','q0',1],['p1','q1'],['b0','q1',1],
        ['q0','r'],['q1','r'],['r','lf'],['uf','lf',1],
        ['uf','gf'],['lf','gf']];
      const labs=[{c:0,y:0,t:'Upper round 1'},{c:1,y:.5,t:'Upper round 2'},{c:2,y:1.5,t:'Upper final'},
        {c:1,y:Y0,t:'Lower round 1'},{c:2,y:Y0,t:'Lower round 2'},{c:3,y:Y0+.5,t:'Lower round 3'},{c:4,y:Y0+.5,t:'Lower final'},{c:5,y:(1.5+Y0+.5)/2,t:'Grand final'}];
      h+=`<div class="box"><b>PLAYOFF BRACKET</b> <span class="mu">solid line = winner advances, dashed = loser drops to the lower bracket</span>${cbFlow(k,ms,nodes,edges,labs)}</div>`;
    }
  }
  const [sk,si]=(SV||'').split('|');
  if(sk===k&&ms[si])h+=`<div class="box"><b>Series details</b>${matchHtml(ms[si],1)}</div>`;
  return h;
}


/* ---------- one continuous bracket: cards placed on a grid, lines drawn between them ---------- */
// nodes: {id,c,y,m} (c = column, y = row in card units, m = match or undefined for TBD)
// edges: [from,to,drop] (solid = winner advances, dashed drop = loser falls to the lower bracket)
function cbFlow(k,ms,nodes,edges,labels){
  const W=176,G=56,H=58,U=78,T=22;
  const nd={};nodes.forEach(n=>nd[n.id]=n);
  const X=c=>c*(W+G),Y=y=>y*U+T,cnt={};
  const paths=edges.map(([a,b,drop])=>{
    const A=nd[a],B=nd[b];if(!A||!B)return '';
    const j=drop?(cnt[B.c]=(cnt[B.c]||0)+1)-1:0;
    const x1=X(A.c)+W,y1=Y(A.y)+H/2+(drop?9:0),x2=X(B.c),y2=Y(B.y)+H/2,xm=x2-(drop?18+8*j:10);
    const used=A.m&&B.m&&[B.m.a,B.m.b].includes(drop?A.m.l:A.m.w);
    return `<path d="M${x1} ${y1}H${xm}V${y2}H${x2}" fill="none" stroke="currentColor" stroke-width="1.5" ${drop?'stroke-dasharray="4 3"':''} opacity="${used?.75:A.m?.3:.15}"/>`;
  }).join('');
  const cards=nodes.map(n=>`<div class="cb-n" style="left:${X(n.c)}px;top:${Y(n.y)}px;width:${W}px;height:${H}px">${brCard(n.m,n.m?ms.indexOf(n.m):-1,k)}</div>`).join('');
  const labs=(labels||[]).map(l=>`<div class="cb-l" style="left:${X(l.c)}px;top:${Y(l.y)-16}px">${l.t}</div>`).join('');
  const w=X(Math.max(...nodes.map(n=>n.c)))+W,h=Y(Math.max(...nodes.map(n=>n.y)))+H+8;
  return `<div class="cb"><div class="cb-in" style="width:${w}px;height:${h}px"><svg width="${w}" height="${h}">${paths}</svg>${cards}${labs}</div></div>`;
}

function playoffHtml(r){
  const src=(VK&&VK!==hk()?(G.pa||{})[VK]:G.po)||{};
  const ms=src[r]||[],key='PO '+r+' '+(VK||hk());
  const L=s=>ms.filter(m=>m.tag==='MPL '+r+' '+s);
  const op=L('Opening'),up=L('Upper'),uf=L('Upper Final'),lo=L('Lower'),lf=L('Lower Final'),gf=L('Grand Final'),Y0=2.5;
  const nodes=[
    {id:'o2',c:0,y:0,m:op[1]},{id:'o1',c:0,y:1,m:op[0]},
    {id:'u1',c:1,y:0,m:up[0]},{id:'u2',c:1,y:1,m:up[1]},
    {id:'uf',c:2,y:.5,m:uf[0]},
    {id:'l1',c:2,y:Y0,m:lo[0]},
    {id:'lf',c:3,y:Y0,m:lf[0]},
    {id:'gf',c:4,y:(.5+Y0)/2,m:gf[0]}];
  const edges=[['o2','u1'],['o1','u2'],['u1','uf'],['u2','uf'],['u1','l1',1],['u2','l1',1],['l1','lf'],['uf','lf',1],['uf','gf'],['lf','gf']];
  const labs=[{c:0,y:0,t:'Opening round'},{c:1,y:0,t:'Upper round'},{c:2,y:.5,t:'Upper final'},{c:2,y:Y0,t:'Lower round'},{c:3,y:Y0,t:'Lower final'},{c:4,y:(.5+Y0)/2,t:'Grand final'}];
  const [sk,si]=(PS||'').split('|');
  return `<div class="box"><b>MPL ${r} Playoff Bracket</b>
      <p class="mu">Double-elimination · solid line = winner advances, dashed = loser drops to the lower bracket · click a series to see its games and KDA.</p>
      ${cbFlow(key,ms,nodes,edges,labs)}</div>`
    +(sk===key&&ms[si]?`<div class="box"><b>Series details</b>${matchHtml(ms[si],1)}</div>`:'');
}
/* ----- match history for your org ----- */
const mLbl=m=>{
  const r=/^MPL (\w\w)(?: (.+))?$/.exec(m.tag);
  return r?(r[2]?'MPL '+r[1]+' Playoffs · '+r[2]:'MPL '+r[1]+' Regular Season'):(m.stage.startsWith('MSC')?'MSC':'M Series')+' · '+m.tag;
};
function resultsHtml(){
  const mh=G.mh||[];
  if(!mh.length)return '<div class="box mu">No matches recorded yet. Your results are saved from here on.</div>';
  const keys=[...new Set(mh.map(m=>m.k))].reverse();
  const list=mh.filter(m=>!MHK||m.k===MHK).reverse();
  let sw=0,sl=0,gw=0,gl=0;
  list.forEach(m=>{const i=m.a===G.me?0:1;m.w===G.me?sw++:sl++;m.g.forEach(g=>g.w===i?gw++:gl++)});
  const pct=sw+sl?Math.round(sw/(sw+sl)*100):0;
  return `<div class="box"><b>${G.me} · Match History</b><br>
    <select onchange="MHK=this.value;render()"><option value="">All splits</option>${keys.map(x=>`<option value="${x}" ${x===MHK?'selected':''}>${x}</option>`).join('')}</select>
    <p>Series <b>${sw}-${sl}</b> (${pct}%) · Games <b>${gw}-${gl}</b></p></div>
  <div class="box"><table><tr><th>Split</th><th>Stage</th><th>Day</th><th>Opponent</th><th></th><th>Score</th><th>Games</th></tr>
  ${list.map(m=>{
    const i=m.a===G.me?0:1,opp=i?m.a:m.b,won=m.w===G.me;
    return `<tr><td>${m.k}</td><td>${mLbl(m)}</td><td>${m.day}</td><td>${opp}</td>
      <td style="font-weight:800;color:${won?'var(--green)':'var(--ac2)'}">${won?'W':'L'}</td>
      <td>${won?m.sw:m.sl}-${won?m.sl:m.sw}</td>
      <td><details><summary>View</summary>${m.g.map((g,j)=>`Game ${j+1}: ${g.w===i?'Won':'Lost'} · ${g.min}:00 · kills ${g.ks[i]}-${g.ks[1-i]} · MVP ${nl(g.mvp)}`).join('<br>')}</details></td></tr>`;
  }).join('')}</table></div>`;
}

/* ----- season picker + playoff archive ----- */
function archivePO(){
  const o={};
  for(const r in G.po)o[r]=G.po[r].map(m=>({...m,gs:null}));
  (G.pa??={})[hk()]=o;
}
function pickKey(y,s){return s.split(',').filter(x=>x.startsWith(y)).sort().pop()}
function periodBar(keys,k,labels){
  const ks=keys.slice().sort(),yrs=[...new Set(ks.map(x=>x.slice(0,4)))].reverse(),y=k.slice(0,4);
  return `Year <select onchange="PK=pickKey(this.value,'${ks.join(',')}');render()">${yrs.map(v=>`<option ${v===y?'selected':''}>${v}</option>`).join('')}</select>
    ${[1,2].map(s=>{const key=`${y} S${s}`;return `<button class="t ${key===k?'on':''}" ${ks.includes(key)?'':'disabled'} onclick="PK='${key}';render()">${labels[s-1]}</button>`}).join('')}
    <span class="mu">Viewing ${y} · ${labels[k.slice(-1)-1]}</span>`;
}

/* ----- league history (who won what) ----- */
function leagueHistHtml(){
  const ks=Object.keys(G.ch||{}).sort().reverse();
  let h='';
  if(!ks.length)h+='<div class="box mu">No champions yet. They are recorded at the end of every split.</div>';
  else{
    h+=`<div class="box"><b>Champions by split</b><div style="overflow-x:auto"><table><tr><th>Split</th>${RG.map(r=>`<th>MPL ${r}</th>`).join('')}<th>International</th></tr>
    ${ks.map(k=>{
      const e=G.ch[k];
      return `<tr><td>${k}</td>${RG.map(r=>{const c=(e.mpl||{})[r];return `<td class="${c&&c.w===G.me?'me':''}">${c?c.w:'—'}</td>`}).join('')}
        <td>${e.intl?`<b>${e.intl.n}</b>: <span class="hi">${e.intl.w}</span> def. ${e.intl.l} <span class="mu">${e.intl.sc}</span>`:'—'}</td></tr>`;
    }).join('')}</table></div></div>`;
    const tt={};
    ks.forEach(k=>{
      const e=G.ch[k];
      RG.forEach(r=>{const c=(e.mpl||{})[r];if(c)(tt[c.w]??={m:0,i:0}).m++});
      if(e.intl)(tt[e.intl.w]??={m:0,i:0}).i++;
    });
    const rows=Object.keys(tt).sort((a,b)=>(tt[b].i*3+tt[b].m)-(tt[a].i*3+tt[a].m));
    h+=`<div class="box"><b>All-time titles</b><table><tr><th>#</th><th>Team</th><th>Region</th><th>MPL titles</th><th>MSC / M Series</th></tr>
      ${rows.map((t,i)=>`<tr class="${t===G.me?'me':''}"><td>${i+1}</td><td>${t}</td><td>${G.T[t]?.reg||''}</td><td>${tt[t].m}</td><td>${tt[t].i}</td></tr>`).join('')}</table></div>`;
  }
  if(G.hist.length)h+=`<div class="box"><details><summary><b>League news</b> (${G.hist.length})</summary>${G.hist.map(x=>`<div>${x}</div>`).join('')}</details></div>`;
  return h;
}

/* ----- your org's history ----- */
function orgHtml(tn){
  const T=G.T[tn],mine=tn===G.me,rows=ohOf(tn).slice().reverse();
  const mplT=rows.filter(r=>r.champ).length,intT=rows.filter(r=>r.intl==='Champions').length;
  const best=rows.filter(r=>r.place).reduce((m,r)=>Math.min(m,r.place),99);
  const W=rows.reduce((s,r)=>s+(r.w||0),0),L=rows.reduce((s,r)=>s+(r.l||0),0);
  let h=`<div class="box"><b>View an org</b> <select onchange="OT=this.value;render()">${RG.map(r=>`<optgroup label="MPL ${r}">${Object.keys(G.T).filter(k=>G.T[k].reg===r).map(k=>`<option value="${k}" ${k===tn?'selected':''}>${k}${k===G.me?' (you)':''}</option>`).join('')}</optgroup>`).join('')}</select></div>`;
  h+=`<div class="box"><b>${tn}</b> · ${T.reg} · ${Math.round(T.fans)}k fans (${fanLvl(T.fans)})${mine?'':` · cash $${Math.round(T.cash)}k`}
    <p>MPL titles <b>${mplT}</b> · MSC / M Series titles <b>${intT}</b> · Best MPL finish <b>${best<99?'#'+best:'—'}</b> · Regular season series <b>${W}-${L}</b></p></div>`;
  if(!rows.length)return h+'<div class="box mu">History appears after the first completed split.</div>';
  h+=`<div class="box"><b>Season by season</b><table><tr><th>Split</th><th>MPL finish</th><th>Reg. season</th><th>International</th><th>Fans</th><th>Cash</th></tr>
    ${rows.map(r=>`<tr><td>${r.k}</td><td>${r.place?(r.champ?'🏆 ':'')+'#'+r.place:'—'}</td><td>${r.w??'—'}-${r.l??'—'}</td><td class="${r.intl==='Champions'?'hi':''}">${r.intl?(r.intl==='Champions'?'🏆 ':'')+r.intl:'<span class="mu">in progress</span>'}</td><td>${r.fans!=null?r.fans+'k':'—'}</td><td>${r.cash!=null?'$'+r.cash+'k':'—'}</td></tr>`).join('')}</table></div>`;
  const rr=rows.filter(r=>r.ros);
  if(rr.length)h+=`<div class="box"><b>Rosters by split</b><table><tr><th>Split</th><th>Everyone on the roster</th></tr>
    ${rr.map(r=>`<tr><td>${r.k}</td><td>${Object.entries(r.ros).sort((a,b)=>ROLES.indexOf(a[1])-ROLES.indexOf(b[1])).map(([n,role])=>`${role} ${nl(n)}`).join(' · ')}</td></tr>`).join('')}</table></div>`;
  return h;
}


function orgPlayersHtml(){
  const me=G.me,t={};
  (G.mh||[]).forEach(m=>{
    const i=m.a===me?0:1;
    m.g.forEach(g=>(g.ps||[]).forEach(([n,r,k,d,a])=>{
      const o=t[n]??={n,r,g:0,w:0,k:0,d:0,a:0};
      o.r=r;o.g++;if(g.w===i)o.w++;o.k+=k;o.d+=d;o.a+=a;
    }));
  });
    (G.oh||[]).forEach(e=>Object.entries(e.ros||{}).forEach(([n,r])=>{if(!t[n])t[n]={n,r,g:0,w:0,k:0,d:0,a:0}}));
  const rows=Object.values(t).sort((x,y)=>y.g-x.g);
  if(!rows.length)return '<div class="box mu">Player stats for your org are recorded from now on. Play some matches first.</div>';
  const cur=new Set(all(me).map(p=>p.n));
  let h=`<div class="box"><b>Players who played for ${me}</b><table><tr><th>Player</th><th>Role</th><th></th><th>Games</th><th>Win%</th><th>K/D/A</th><th>KDA</th><th></th></tr>
  ${rows.map(o=>`<tr class="${OP===o.n?'me':''}"><td class="hi">${nl(o.n)}</td><td>${o.r}</td><td class="mu">${cur.has(o.n)?'current':'former'}${o.g?'':' · did not play'}</td><td>${o.g}</td><td>${o.g?Math.round(o.w/o.g*100)+'%':'—'}</td><td>${o.k}/${o.d}/${o.a}</td><td>${kda(o)}</td>
    <td><button class="t" onclick="OP=decodeURIComponent('${encodeURIComponent(o.n)}');render()">Matches</button></td></tr>`).join('')}</table></div>`;
  if(OP){
    const ms=(G.mh||[]).filter(m=>m.g.some(g=>(g.ps||[]).some(x=>x[0]===OP))).reverse();
    h+=`<div class="box"><b>${OP} · matches for ${me}</b> <button class="t" onclick="OP=null;render()">Close</button>
    <table><tr><th>Split</th><th>Stage</th><th>Opponent</th><th></th><th>Score</th><th>Games (K/D/A)</th></tr>
    ${ms.map(m=>{
      const i=m.a===me?0:1,opp=i?m.a:m.b,won=m.w===me;
      return `<tr><td>${m.k}</td><td>${mLbl(m)}</td><td>${opp}</td>
        <td style="font-weight:800;color:${won?'var(--green)':'var(--ac2)'}">${won?'W':'L'}</td>
        <td>${won?m.sw:m.sl}-${won?m.sl:m.sw}</td>
        <td>${m.g.map((g,j)=>{const x=(g.ps||[]).find(y=>y[0]===OP);return x?`G${j+1} ${g.w===i?'W':'L'} ${x[2]}/${x[3]}/${x[4]}`:''}).filter(Boolean).join(' · ')}</td></tr>`;
    }).join('')}</table></div>`;
  }
  return h;
}


/* ----- hall of fame ----- */
function hofHtml(){
  const hof=G.hof||[],ret=(G.ret||[]).slice(0,40);
  let h=`<div class="box"><b>Hall of Fame</b><p class="mu">Players are inducted when they retire with a career score of ${HOF_MIN}+ (titles, MVPs, all-league teams, peak rating and longevity).</p>
    ${hof.length?hof.map(x=>`<details class="mt"><summary><span class="mt-h"><span><b>${x.n}</b> · ${x.r} · retired ${x.yr} at ${x.age}</span><span class="mu">Score ${x.sc} · Peak OVR ${x.pk} · ${x.teams.join(', ')||x.team}</span></span></summary>
      <div class="mt-body"><p>${x.c.g} games · ${x.c.k}/${x.c.d}/${x.c.a} (${kda(x.c)} KDA) · ${x.c.m} MVP · career earnings $${x.earn}k</p>${achHtml(x.ach)||'<span class="mu">No titles.</span>'}</div></details>`).join(''):'<p class="mu">Nobody has been inducted yet.</p>'}</div>`;
  h+=`<div class="box"><b>Recent retirements</b>${ret.length?`<table><tr><th>Player</th><th>Role</th><th>Age</th><th>Year</th><th>Last team</th><th>Peak</th><th>Score</th><th></th></tr>
    ${ret.map(x=>`<tr><td>${x.n}</td><td>${x.r}</td><td>${x.age}</td><td>${x.yr}</td><td>${x.team}</td><td>${x.pk}</td><td>${x.sc}</td><td>${x.hof?'⭐ HOF':''}</td></tr>`).join('')}</table>`:'<p class="mu">Nobody has retired yet. Players start retiring around age 31.</p>'}</div>`;
  return h;
}

/* ----- finance ----- */
function financeHtml(){
  const T=G.T[G.me],f=G.fin,stars=T.p.filter(p=>ov(p)>=88).length;
  const keys=Object.keys(f.t).sort().slice(-5);
  const cats=[...new Set(keys.flatMap(k=>Object.keys(f.t[k])))];
  const wages=Math.round(all(G.me).reduce((s,p)=>s+Math.max(2,(ov(p)-62)*WAGE),0));
  let h=`<div class="box"><b>Finance</b> · Cash <b>$${Math.round(G.cash)}k</b> · Fans <b>${Math.round(T.fans)}k</b> (${fanLvl(T.fans)})
    <p class="mu">Fans drive your money. Tickets sell on every match you play, merch and sponsors pay out when each MSC / M Series ends. Winning, titles and star players (OVR 88+) grow your fanbase. Expected per split: tickets ~$${Math.round(T.fans*.012*20)}k · merch ~$${Math.round(T.fans*.14*(1+stars*.15))}k · wages -$${wages}k.</p></div>`;
  h+=`<div class="box"><b>Sponsorships</b> (${f.sp.length}/4 active)
    ${f.sp.length?`<table><tr><th>Sponsor</th><th>Pays / split</th><th>Splits left</th><th>Bonus clause</th></tr>${f.sp.map(s=>`<tr><td>${s.name}</td><td>$${s.pay}k</td><td>${s.left}</td><td>${clauseTxt(s.clause)}: +$${s.bonus}k</td></tr>`).join('')}</table>`:'<p class="mu">No active deals.</p>'}
    <b>Offers</b>${f.off.length?`<table><tr><th>Sponsor</th><th>Pays / split</th><th>Length</th><th>Bonus clause</th><th></th></tr>${f.off.map(o=>`<tr><td>${o.name}</td><td>$${o.pay}k</td><td>${o.len} splits</td><td>${clauseTxt(o.clause)}: +$${o.bonus}k</td><td><button onclick="acceptSpon(${o.id})" ${f.sp.length>=4?'disabled':''}>Sign</button></td></tr>`).join('')}</table>`:'<p class="mu">New offers arrive after each MSC / M Series.</p>'}</div>`;
  h+=`<div class="box"><b>Marketing</b><p class="mu">Spend money to grow your fanbase. Each can be used once per split.</p>
    <button onclick="campaign('social')" ${G.cash<30||f.mk[hk()+'social']?'disabled':''}>Social media campaign · $30k · +2.5% fans</button>
    <button onclick="campaign('event')" ${G.cash<60||f.mk[hk()+'event']?'disabled':''}>Fan meet-and-greet tour · $60k · +5% fans</button></div>`;
  h+=`<div class="box"><b>Income and expenses ($k)</b>${keys.length?`<table><tr><th></th>${keys.map(k=>`<th>${k}</th>`).join('')}</tr>
    ${cats.map(c=>`<tr><td>${c}</td>${keys.map(k=>{const v=f.t[k][c]||0;return `<td style="color:${v>=0?'var(--green)':'var(--ac2)'}">${v?(v>0?'+':'')+Math.round(v):'—'}</td>`}).join('')}</tr>`).join('')}
    <tr><td><b>Net</b></td>${keys.map(k=>{const v=Object.values(f.t[k]).reduce((s,x)=>s+x,0);return `<td><b>${v>=0?'+':''}${Math.round(v)}</b></td>`}).join('')}</tr></table>`:'<p class="mu">Nothing recorded yet.</p>'}</div>`;
  return h;
}

/* ----- market ----- */
function offersHtml(){
  const o=(G.offers||[]).filter(x=>findP(x.pid));
  if(!o.length)return '';
  const f=id=>findP(id)?.p;
  return `<div class="box"><b>Offers received</b><p class="mu">AI teams want your players. These offers expire the next time free agency closes.</p><table><tr><th>From</th><th>Offer</th><th></th></tr>${o.map(x=>{
    const m=f(x.pid);
    if(x.type==='buyout')return `<tr><td>${x.from}</td><td>Buyout for ${pl(m)} (${m.r}, OVR ${ov(m)}): <b>$${x.amt}k</b></td><td><button onclick="acceptOffer(${x.id})">Accept</button> <button class="t" onclick="declineOffer(${x.id})">Decline</button></td></tr>`;
    const g=f(x.give);
    return `<tr><td>${x.from}</td><td>Trade: your ${pl(m)} (OVR ${ov(m)}) for ${g?pl(g)+` (${g.r}, OVR ${ov(g)})`:'?'}${x.cash?` + <b>$${x.cash}k</b>`:''}</td><td><button onclick="acceptOffer(${x.id})">Accept</button> <button class="t" onclick="declineOffer(${x.id})">Decline</button></td></tr>`;
  }).join('')}</table></div>`;
}

const FSK={name:p=>p.n.toLowerCase(),role:p=>ROLES.indexOf(p.r),age:p=>p.age,country:p=>p.c,ovr:p=>ov(p),pot:p=>p.pot,old:p=>(p.old||'').toLowerCase(),interest:p=>p.rv?p.rv.length:0,value:p=>est(p,1)};
const FSL=[['name','Name'],['role','Role'],['age','Age'],['country','Country'],['ovr','OVR'],['pot','POT'],['old','Old team'],['interest','Interest'],['value','Market value']];
const fsSort=(a,b)=>{const f=FSK[FS.k],x=f(a[0]),y=f(b[0]);return (x>y?1:x<y?-1:0)*FS.d||ov(b[0])-ov(a[0])};
function setFS(k){
  if(FS.k===k)FS.d*=-1;
  else{FS.k=k;FS.d=['name','role','old','country'].includes(k)?1:-1}
  render();
}

function marketHtml(){
  const t=G.T[G.me],issue=rosterIssue();
  let h=`<div class="box"><b>Your roster: ${t.p.length}/5 starters · ${t.b.length}/${BMAX} bench · imports ${impCount(G.me)}/${IMPMAX}</b>${issue?`<p style="color:var(--gold)">${issue}</p>`:''}</div>`;
  h+=offersHtml();
  const idx=G.fa.map((p,i)=>[p,i]).filter(([p])=>FF==='ALL'||p.r===FF).sort(fsSort);
  const ex=idx.filter(([p])=>p.rv),gen=idx.filter(([p])=>!p.rv&&!p.cls);
  h+=`<div class="box"><b>Filter by role</b> ${['ALL',...ROLES].map(x=>`<button class="t ${FF===x?'on':''}" onclick="FF='${x}';render()">${x}</button>`).join('')}</div>`;
    h+=`<div class="box"><b>Sort by</b> ${FSL.map(([k,l])=>`<button class="t ${FS.k===k?'on':''}" onclick="setFS('${k}')">${l}${FS.k===k?(FS.d>0?' ▲':' ▼'):''}</button>`).join('')}<span class="mu"> click again to flip the order</span></div>`;
  if(ex.length){
    h+=`<div class="box"><b>Free agency · players whose contracts ended (${ex.length})</b>
      <p class="mu">Every expiring contract in the league is here. Other teams have hidden offers and each player picks the best one; his old team gets a +5% edge. You have 3 attempts each. Anyone you haven't signed goes to another team the next time you sim.</p>
      <table><tr><th>Role</th><th>Player</th><th>Age</th><th>Ctry</th><th>OVR</th><th>POT</th><th>Old team</th><th>Interest</th><th>Splits</th><th>Offer ($k)</th><th>Market value</th><th></th></tr>
      ${ex.map(([p,i])=>{
        const n=FNEG[p.id]||{s:1,o:est(p,1)},left=3-(p.nt||0);
        return `<tr><td>${p.r}</td><td class="hi">${pl(p)}</td><td>${p.age}</td><td>${ctry(p)}</td><td>${ov(p)}</td><td>${p.pot}</td><td>${p.old||''}</td>
          <td title="${p.rv.map(x=>x.t).join(', ')}">${p.rv.length} team${p.rv.length>1?'s':''}</td>
          <td><select id="fs${p.id}" onchange="setFOffer(${p.id})">${[1,2,3,4].map(x=>`<option ${x==n.s?'selected':''}>${x}</option>`).join('')}</select></td>
          <td><input id="fo${p.id}" type="number" value="${n.o}"></td>
          <td class="mu" id="fv${p.id}">~$${est(p,n.s)}k</td>
          <td><button onclick="bid(${i})">Offer</button> <span class="mu">${left} left</span></td></tr>`;
      }).join('')}</table></div>`;
  }
  h+=`<div class="box"><b>Free agents</b><table>${hd(0)}<th>Cost</th><th></th></tr>${gen.map(([p,i])=>row(p,0,1)+`<td>$${cost(p)}k</td><td><button onclick="sign(${i})" ${G.cash<cost(p)?'disabled':''}>Sign</button></td></tr>`).join('')}</table></div>`;
  h+=`<div class="box"><details><summary><b>Transfer news</b> (${(G.news||[]).length})</summary>${(G.news||[]).slice(0,40).map(x=>`<div>${x}</div>`).join('')||'<span class="mu">Nothing yet.</span>'}</details></div>`;
  return h;
}

/* ----- league tab ----- */
function teamHtml(){
  const T=G.T[LT],mn=LT==G.me;
  const btn=(p,i,b)=>mn?'':p.loan?`<td colspan="2" class="mu">${p.loan.from===G.me?'On loan from you':'On loan'}</td>`:`<td><button onclick="buyout('${LT}',${i},${b})" ${G.cash<bcost(p)?'disabled':''}>$${bcost(p)}k</button></td><td><button onclick="openTrade('${LT}',${i},${b})">Trade</button> <button class="t" onclick="openLoanIn('${LT}',${i},${b})">Loan</button></td>`;
  const starters=ROLES.map(role=>{
    const i=T.p.findIndex(p=>p.r==role),p=T.p[i];
    if(!p)return `<tr><td>${role}</td><td colspan="12" class="mu">Vacant</td></tr>`;
    return row(p,1)+btn(p,i,0)+'</tr>';
  }).join('');
  const bench=T.b.map((p,i)=>row(p,1)+btn(p,i,1)+'</tr>').join('');
  const th=mn?'':'<th>Buyout</th><th>Trade</th>';
  return tradeHtml()+loanHtml('in')+`<div class="box"><b>${LT}</b> (${T.reg}) · rating ${rt(LT).toFixed(1)} · ${Math.round(T.fans)}k fans${mn?'':` · cash $${Math.round(T.cash)}k`}
    <table>${hd(1)}${th}</tr>${starters}</table>
    ${T.b.length?`<p><b>Bench</b></p><table>${hd(1)}${th}</tr>${bench}</table>`:''}</div>`;
}
function leagueHtml(){
  // Team selection opens a dedicated team page; Back returns to standings.
  if(LT&&G.T[LT])return teamHtml();
  const r=LR||G.reg,tb=G.tb[r];
  const ts=tb?Object.keys(tb).filter(k=>G.T[k]).sort((a,b)=>tb[b].w-tb[a].w):Object.keys(G.T).filter(k=>G.T[k].reg===r);
  let out=`<div class="box">`+
    RG.map(x=>`<button class="t ${r==x?'on':''}" onclick="setLR('${x}')">MPL ${x}</button>`).join('')+
    `<table><tr><th>Team</th><th>OVR</th><th>Fans</th>${tb?'<th>W</th><th>L</th>':''}</tr>
      ${ts.map(k=>`<tr class="${k==G.me?'me':''}">
        <td><a href="#" onclick="goTeam('${k}');return false">${k}</a></td>
        <td>${rt(k).toFixed(1)}</td><td>${Math.round(G.T[k].fans)}k</td>
        ${tb?`<td>${tb[k].w}</td><td>${tb[k].l}</td>`:''}
      </tr>`).join('')}
    </table><p class="mu">Click a team to see its players.</p></div>`;
  const po=G.po[r];
  if(po&&po.length){
    const stages=[...new Set(po.map(m=>m.tag))];
    out+=`<div class="box"><b>MPL ${r} Playoff Results</b>
      ${stages.map(stage=>`<div style="margin:12px 0"><b>${stage.replace('MPL '+r+' ','')}</b>${po.filter(m=>m.tag===stage).map(m=>matchHtml(m,0)).join('')}</div>`).join('')}</div>`;
  }
  return out;
}

/* ----- main render ----- */
const TABS=['roster','stats','market','draft','search','academy','finance','league','playoffs','intl','awards','match','results','history','org','hof'];
function render(){
  if(!G){
    const sv=saves();
    $('#app').innerHTML=(sv.length?`<div class="box"><b>Continue a career</b>${sv.map(s=>`<div style="margin:6px 0"><button onclick="load(${s.id})">${s.me}</button> ${s.yr} Split ${s.sp+1} · $${Math.round(s.cash)}k <span class="mu">${new Date(s.t).toLocaleString()}</span> <button class="t" onclick="del(${s.id})">Delete</button></div>`).join('')}</div>`:'')
      +'<p><b>New career</b>: pick your team</p>'+RG.map(r=>`<div class="box"><b>MPL ${r}</b><br>${R[r].map(k=>`<button onclick="newGame('${k}')">${k}</button>`).join('')}</div>`).join('');
    return;
  }
  const t=G.T[G.me].p;
  const nm=ST[G.sp]?.[G.st]?.[0]||'Competition complete';
  const seasonLabel=G.sp===0?'Split 1 / MSC':'Split 2 / M Series';
  const mine=G.cur?G.cur.nx.value.find(m=>m[0]==G.me||m[1]==G.me):null;
  let out=`<div class="box"><b>${G.yr} · ${seasonLabel}</b> · ${G.me} · ${G.god?`$<input type="number" value="${Math.round(G.cash)}" onchange="G.cash=+this.value||0;render()">k`:`$${Math.round(G.cash)}k`} · ${Math.round(G.T[G.me].fans)}k fans<br>
  <span class="mu">Next: ${nm} · Day ${G.cur?G.cur.n+1:1}${mine?` · Your match: ${mine[0]} vs ${mine[1]} (BO${mine[2]})`:''}</span><br>
  <button onclick="sim('day')">Sim day ▶</button><button onclick="sim('me',true)">Watch my next match 🔴</button><button onclick="sim('me',false)">Quick sim my next match ⏭</button><button onclick="sim('stage')">Sim stage ⏩</button>
  <button class="t" onclick="menu()">Menu</button><button class="t ${G.god?'on':''}" onclick="G.god=!G.god;render()">God mode</button></div>`;
    navCss();
  const navHtml=(NAV.length?`<button class="t" onclick="back()">← Back</button>`:`<button class="t" onclick="menu()">← Main menu</button>`)
    +TABS.map(x=>`<button class="t ${TAB==x?'on':''}" onclick="go('${x}')">${TL[x]||x[0].toUpperCase()+x.slice(1)}${x==='market'&&(G.offers||[]).length?` (${G.offers.length})`:''}${x==='draft'&&G.dr&&!G.dr.done?' 🎓':''}</button>`).join('');
  const head=out;out='';
  if(G.msg)out+=`<div class="box">${G.msg}</div>`;
  if(TAB=='player')out+=profile();
  if(TAB=='match')out+=livePlaybackHtml()+(G.last?`<div class="box"><b>Your latest match</b>${matchHtml(G.last,1)}</div>`:'<div class="box mu">Play a match to see the play-by-play.</div>')+dayHtml();
     if(TAB=='roster'){
    const B=G.T[G.me].b;
    const acts=p=>(p.loan?'':`<button class="t" onclick="sell(${p.id})">Sell ~$${sellPrice(p)}k</button> `)+(p.loan?`<button class="t" onclick="endLoan(${p.id})">Return</button>`:`<button class="t" onclick="openLoan(${p.id})">Loan</button>`);
    out+=sellHtml()+loanHtml('out')+`<div class="box"><b>Starting five</b><table>${hd(1)}<th title="Years with the team (2 splits = 1 year)">Yrs</th><th></th></tr>${ROLES.map(r=>{const v=t.find(p=>p.r==r);return v?row(v,1)+`<td>${tenure(v)}</td><td>${acts(v)}</td></tr>`:`<tr><td>${r}</td><td colspan="13" class="mu">⚠ Vacant. Sign a player in the Market.</td></tr>`}).join('')}</table><p class="mu">Team rating ${rt(G.me).toFixed(1)} · click a player for his profile</p></div>
    <div class="box"><b>Bench (${B.length}/${BMAX})</b>${B.length?`<table>${hd(1)}<th title="Years with the team (2 splits = 1 year)">Yrs</th><th></th><th></th></tr>${B.map((p,i)=>row(p,1)+`<td>${tenure(p)}</td><td><button onclick="startP(${i})">Start</button></td><td>${p.loan?'':`<button class="t" onclick="relP(${i})">Release</button> `}${acts(p)}</td></tr>`).join('')}</table>`:'<span class="mu">Empty. Sign players in the Market.</span>'}</div>`;
    out+=loansHtml()+contractsHtml();
  }
  if(TAB=='intl')out+=intlHtml();
  if(TAB=='results')out+=resultsHtml();
  if(TAB=='stats')out+=`<div class="box"><b>Top KDA (min 6 games)</b><table><tr><th>Role</th><th>Player</th><th>Team</th><th>GP</th><th>KDA</th><th>MVP</th></tr>${lead(s=>(s.k+s.a)/Math.max(1,s.d),6)}</table></div><div class="box"><b>MVP leaders</b><table><tr><th>Role</th><th>Player</th><th>Team</th><th>GP</th><th>KDA</th><th>MVP</th></tr>${lead(s=>s.m,1)}</table></div>`;
    if(TAB=='market')out+=marketHtml();
    if(TAB=='search')out+=searchHtml();
  if(TAB=='academy')out+=academyHtml();
  if(TAB=='finance')out+=financeHtml();
  if(TAB=='league')out+=leagueHtml();
  if(TAB=='playoffs'){
    const r=LR||G.reg;
    const keys=[...new Set([...Object.keys(G.pa||{}),hk()])].sort();
    VK=keys.includes(PK)?PK:hk();
    out+=`<div class="box"><b>Season</b><br>${periodBar(keys,VK,['Split 1','Split 2'])}<br><br>
      <b>Select a region</b><br>
      ${RG.map(x=>`<button class="t ${r==x?'on':''}" onclick="setLR('${x}')">MPL ${x}</button>`).join('')}
    </div>`;
    out+=playoffHtml(r);
  }
  if(TAB=='awards')out+=awardsHtml();
  if(TAB=='history')out+=leagueHistHtml();
   if(TAB=='org'){const tn=OT&&G.T[OT]?OT:G.me;out+=orgHtml(tn)+(tn===G.me?orgPlayersHtml():'');}
  if(TAB=='hof')out+=hofHtml();


  const keepScroll=window.scrollY;
  const keepLiveLogScroll=document.querySelector('.live-log')?.scrollTop;
    $('#app').innerHTML=head+`<div class="lay"><nav class="side">${navHtml}</nav><div class="main">${out}</div></div>`+(G.pendingRecap?recapHtml():'');
  if(LIVE){
    requestAnimationFrame(()=>{
      window.scrollTo(0,keepScroll);
      const liveLog=document.querySelector('.live-log');
      if(liveLog&&keepLiveLogScroll!==undefined)liveLog.scrollTop=keepLiveLogScroll;
    });
  }
  save();
}
function navCss(){
  if(document.getElementById('nav-css'))return;
  const s=document.createElement('style');s.id='nav-css';
  s.textContent=`.lay{display:flex;gap:12px;align-items:flex-start;margin-top:8px}
  .side{position:sticky;top:8px;flex:0 0 140px;display:flex;flex-direction:column;gap:4px;max-height:calc(100vh - 16px);overflow-y:auto}
  .side button{width:100%;text-align:left;margin:0}
  .main{flex:1;min-width:0}
  @media(max-width:760px){.lay{flex-direction:column}.side{position:static;flex:none;width:100%;flex-direction:row;flex-wrap:wrap;max-height:none}.side button{width:auto}}`;
  document.head.appendChild(s);
}

render();