const ROLES=['EXP','GOLD','MID','JG','ROAM'];
const R={
PH:["ONIC PH","Blacklist Intl","Aurora PH","Team Liquid PH","Smart Omega","Falcon PH","Omega Esports","Nexplay"],
ID:["RRQ Hoshi","Alter Ego","EVOS Glory","Bigetron Alpha","Geek Fam ID","Dewa United","Rebellion Zion","Pura Esports"],
MY:["Selangor Red Giants","Todak","Team HAQ","Kelantan Gaming","Johor Kings","Penang Wolves","KL Phoenix","Sabah Thunder"],
KH:["Angkor Warriors","Phnom Penh Kings","Mekong Rising","Siem Reap Tigers","Khmer Legends","Bayon Esports","Tonle Dragons","Kampot Storm"]};
const RG=Object.keys(R),OFF={PH:0,ID:0,MY:-3,KH:-6};
/* EDIT ME: real players. Any role not listed gets a generated player. */
const REAL={
"ONIC PH":[["Super Frince","EXP",84],["Sanford","GOLD",86],["Kairi","JG",90],["Dlar","ROAM",82]],
"Blacklist Intl":[["Wise","EXP",84],["Edward","GOLD",88],["Hadess","JG",82],["Oheb","ROAM",87]],
"RRQ Hoshi":[["Vyn","EXP",80],["Clay","GOLD",85],["Skylar","MID",84],["Alberttt","JG",85],["Lemon","ROAM",86]],
"Alter Ego":[["Celiboy","EXP",82],["Kelra","JG",84],["Udil","ROAM",80]]};
const NM={
PH:["Kai","Zen","Rex","Jax","Miko","Dre","Nate","Kiro","Lance","Vince","Elric","Tyron","Arlo","Brix","Cairo","Dax"],
ID:["Rizky","Bagas","Fajar","Dimas","Arya","Gilang","Raka","Wahyu","Adit","Bima","Yoga","Surya"],
MY:["Aiman","Hafiz","Danish","Irfan","Zikri","Faiz","Haziq","Amir","Syafiq","Adam"],
KH:["Sokha","Vibol","Rithy","Dara","Sovann","Piseth","Veasna","Chhay","Kosal","Mony"]};

const $=s=>document.querySelector(s);
let G,TAB='roster',LR=null,LT=null,PV=null,NID=0;
const used=new Set(),SUF=["","","x","Z","TV","GG","07","99"];
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const cl=v=>Math.max(50,Math.min(99,v));
const hs=s=>{let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return x};
function ign(reg){let s,k=0;do s=NM[reg][rnd(0,NM[reg].length-1)]+SUF[rnd(0,7)]+(k++>20?rnd(1,999):"");while(used.has(s));used.add(s);return s}
const S0=()=>({g:0,k:0,d:0,a:0,m:0,w:0});
const mk=(n,r,o)=>({id:++NID,n,r,mec:cl(o+hs(n+'a')%11-5),mac:cl(o+hs(n+'b')%11-5),tf:cl(o+hs(n+'c')%11-5),con:cl(o+hs(n+'d')%11-5),s:S0(),h:{},ach:[],earn:0});
const ov=p=>Math.round((p.mec+p.mac+p.tf+p.con)/4);
const rt=n=>G.T[n].p.reduce((s,p)=>s+.3*p.mec+.25*p.mac+.3*p.tf+.15*p.con,0)/5;
const cost=p=>Math.max(10,(ov(p)-60)*4);
const kda=s=>((s.k+s.a)/Math.max(1,s.d)).toFixed(2);
const hk=()=>G.yr+' S'+(G.sp+1);
const ent=(p,t)=>p.h[hk()]??={t,rs:S0(),po:S0(),in:S0(),earn:0};
const pay=(t,a)=>{if(t==G.me)G.cash+=a;G.T[t].p.forEach(p=>{const v=a*.2/5;p.earn+=v;ent(p,t).earn+=v})};
const ach=(t,x)=>G.T[t].p.forEach(p=>p.ach.push(hk()+' · '+x));
const BMAX=5; // Maximum substitutes per team. Change this to allow more.
const all=k=>[...G.T[k].p,...G.T[k].b];

function mkBench(reg,i){
  const base=80-i*1.6+OFF[reg];
  const role=ROLES[rnd(0,ROLES.length-1)];
  return [mk(ign(reg),role,Math.round(base+rnd(-4,3)))];
}
function mkTeam(n,reg,i){const base=88-i*1.6+OFF[reg];
  return ROLES.map(r=>{const f=(REAL[n]||[]).find(x=>x[1]==r);return f?mk(...f):mk(ign(reg),r,Math.round(base+rnd(-3,3)))})}
function newGame(me){
  G={id:Date.now(),yr:2026,sp:0,st:0,cash:300,me,T:{},pl:{},tb:{},hist:[],fa:[],msg:'',day:null,cur:null,po:{},last:null,god:false};
  RG.forEach(r=>R[r].forEach((n,i)=>G.T[n]={reg:r,p:mkTeam(n,r,i),b:mkBench(r,i)}));
  G.reg=G.T[me].reg;genFA();TAB='roster';LR=LT=PV=null;render();
}
function genFA(){G.fa=[];for(let i=0;i<10;i++)G.fa.push(mk(ign(G.reg),ROLES[i%5],rnd(66,80)))}

/* ---------- single game simulation ---------- */
const KW={EXP:1,GOLD:1.6,MID:1.5,JG:1.4,ROAM:.5},DW={EXP:1,GOLD:.8,MID:.9,JG:1,ROAM:1.3},
      AW={EXP:1,GOLD:.8,MID:1,JG:1.1,ROAM:1.8},GW={EXP:1,GOLD:1.25,MID:1.15,JG:1.1,ROAM:.6};
function pick(S,wf,ex){
  const c=S.filter(x=>!ex.includes(x)).map(x=>[x,wf(x)]);
  let r=Math.random()*c.reduce((s,y)=>s+y[1],0);
  for(const [x,w] of c){if((r-=w)<=0)return x}
  return c[0][0];
}
function game(a,b,keep, tag){
    const bk=/^MPL \w\w$/.test(tag)?'rs':/^MPL/.test(tag)?'po':'in';
  const T=[a,b],S=T.map(n=>G.T[n].p.map(p=>({p,k:0,d:0,a:0}))),pr=[0,0],lg=[];
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
  G.pl[r]=[gf.w,gf.l,lf.l,l1.l,o1.l,o2.l,s[6],s[7]];
  ach(gf.w,'MPL '+r+' Champion');ach(gf.l,'MPL '+r+' Runner-up');ach(lf.l,'MPL '+r+' 3rd place');
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
function fin(n,m,p){pay(m.w,p);pay(m.l,p/2);ach(m.w,n+' Champion');ach(m.l,n+' Runner-up');
  G.hist.unshift(`${G.yr} ${n}: ${m.w} def. ${m.l} ${m.sw}-${m.sl}`);G.msg=`${n} champion: ${m.w}`}
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

/* ---------- game-day driver ---------- */
function rollover(){
 for(const k in G.T)all(k).forEach(p=>['mec','mac','tf','con'].forEach(s=>p[s]=cl(p[s]+rnd(-2,2))));
   G.st=0;G.cur=null;G.tb={};G.pl={};G.po={};
  if(G.sp){G.yr++;G.sp=0;genFA();for(const k in G.T)all(k).forEach(p=>p.s=S0())}
}
function step(){
  G.msg='';
  if(!G.cur){const g=ST[G.sp][G.st][1]();G.cur={g,nx:g.next(),n:0,hist:[]}}
  const c=G.cur;c.n++;
  const label=`${G.yr} Split ${G.sp+1} · ${ST[G.sp][G.st][0]} · Day ${c.n}`;
  const res=c.nx.value.map(m=>bo(...m));
  res.forEach(m=>{
  const r=RG.find(x=>m.tag.startsWith('MPL '+x+' '));
  if(r){
    (G.po[r]??=[]).push({
      a:m.a,
      b:m.b,
      tag:m.tag,
      w:m.w,
      l:m.l,
      sw:m.sw,
      sl:m.sl,
      gs:m.gs,
      n:m.n
    });
  }
});
  const mm=res.find(m=>m.a==G.me||m.b==G.me);if(mm)G.last=mm;
  G.day={label,res:res.slice().sort((x,y)=>((y.a==G.me||y.b==G.me)?1:0)-((x.a==G.me||x.b==G.me)?1:0))};
  c.hist.push(res.map(m=>({a:m.a,b:m.b,w:m.w,l:m.l,sw:m.sw,sl:m.sl,tag:m.tag,n:m.n})));
  const nx=c.g.next(res);
  if(nx.done){G.cur=null;G.q=null;G.st++;if(G.st>=ST[G.sp].length)rollover()}else c.nx=nx;
  return mm?'me':'day';
}
function sim(mode){
  for(let n=0;n<400;n++){
    const r=step();
    if(mode=='day'||!G.cur||(mode=='me'&&r=='me'))break;
  }
  TAB='match';render();
}
function sign(i){
  const f=G.fa[i],c=cost(f),t=G.T[G.me];
  if(G.cash<c)return;
  if(t.b.length>=BMAX){
  G.msg=`Your bench is full (${BMAX}). Release someone first.`;
  render();
  return;
}
  G.cash-=c;t.b.push(f);G.fa.splice(i,1);G.fa.push(mk(ign(G.reg),f.r,rnd(66,80)));
  G.msg=`Signed ${f.n} to your bench.`;render();
}
function buyout(tn,i,b=false){
  const T=G.T[tn],me=G.T[G.me];
  const A=b?T.b:T.p;
  const p=A[i];
  if(!p)return;

  const c=bcost(p);

  if(G.cash<c||tn==G.me)return;

  if(me.b.length>=BMAX){
    G.msg=`Your bench is full (${BMAX}). Release someone first.`;
    render();
    return;
  }

  G.cash-=c;
  me.b.push(p);

  A[i]=mk(
    ign(T.reg),
    p.r,
    ov(p)-8+rnd(-2,2)
  );

  G.msg=`Bought ${p.n} from ${tn} for $${c}k. Added to your bench.`;
  render();
}
function startP(i){
  const t=G.T[G.me],j=t.p.findIndex(x=>x.r==t.b[i].r);
  [t.p[j],t.b[i]]=[t.b[i],t.p[j]];render();
}
function relP(i){
  const p=G.T[G.me].b.splice(i,1)[0];G.fa.push(p);G.fa=G.fa.slice(-12);render();
}

const bcost=p=>Math.max(40,(ov(p)-55)*8);
const tcost=(a,b)=>Math.max(0,ov(b)-ov(a))*10;

function trade(tn,i){
  const T=G.T[tn],p=T.p[i],m=G.T[G.me].p,j=m.findIndex(x=>x.r==p.r),c=tcost(m[j],p);
  if(G.cash<c||tn==G.me)return;
  G.cash-=c;[m[j],T.p[i]]=[p,m[j]];
  G.msg=`Traded ${T.p[i].n} to ${tn} for ${p.n}`+(c?` (+$${c}k)`:'');render();
}

const SK='mlbb:save:';
function save(){
  try{G.t=Date.now();localStorage.setItem(SK+G.id,JSON.stringify({...G,day:null,cur:G.cur?{hist:G.cur.hist}:null}))}
  catch(e){G.msg='Save failed: '+e.message}
}
function saves(){
  const a=[];
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);
    if(k.startsWith(SK))try{const o=JSON.parse(localStorage.getItem(k));a.push({id:o.id,me:o.me,yr:o.yr,sp:o.sp,cash:o.cash,t:o.t})}catch(e){}}
  return a.sort((x,y)=>y.t-x.t);
}
function load(id){
  G=JSON.parse(localStorage.getItem(SK+id));
  used.clear();NID=0;
  for(const k in G.T)G.T[k].b??=mkBench(G.T[k].reg,3);
for(const k in G.T)all(k).forEach(p=>{used.add(p.n);NID=Math.max(NID,p.id)});
  G.fa.forEach(p=>{used.add(p.n);NID=Math.max(NID,p.id)});
  if(G.cur){const g=ST[G.sp][G.st][1]();let nx=g.next();const h=G.cur.hist;for(const d of h)nx=g.next(d);
    G.cur=nx.done?null:{g,nx,n:h.length,hist:h}}
  TAB='roster';LR=LT=PV=null;render();
}
function del(id){if(confirm('Delete this save?')){localStorage.removeItem(SK+id);render()}}
function menu(){save();G=null;render()}
function findP(id){
  for(const k in G.T){const p=all(k).find(x=>x.id==id);if(p)return{p,t:k}}
  const p=G.fa.find(x=>x.id==id);return p?{p,t:'Free agent'}:null;
}
function edit(id,k,v){
  const f=findP(id);if(!f)return;
  if(k=='n')f.p.n=v.trim()||f.p.n;else f.p[k]=cl(+v||f.p[k]);
  render();
}
/* ---------- UI ---------- */
const pl=p=>`<a href="#" onclick="PV=${p.id};TAB='player';render();return false">${p.n}</a>`;
const row=(p,s)=>`<tr><td>${p.r}</td><td class="hi">${pl(p)}</td><td>${p.mec}</td><td>${p.mac}</td><td>${p.tf}</td><td>${p.con}</td><td class="hi">${ov(p)}</td>${s?`<td>${p.s.g}</td><td>${p.s.k}/${p.s.d}/${p.s.a}</td><td>${kda(p.s)}</td><td>${p.s.m}</td>`:''}`;
const hd=s=>`<tr><th>Role</th><th>Player</th><th>MEC</th><th>MAC</th><th>TF</th><th>CON</th><th>OVR</th>${s?'<th>GP</th><th>K/D/A</th><th>KDA</th><th>MVP</th>':''}`;
const box=(t,S)=>`<table><tr><th>${t}</th><th>K</th><th>D</th><th>A</th><th>Gold</th></tr>${S.map(x=>`<tr><td>${x.p.r} ${x.p.n}</td><td>${x.k}</td><td>${x.d}</td><td>${x.a}</td><td>${x.gold}</td></tr>`).join('')}</table>`;
const gameHtml=(m,g,i,o)=>`<details ${o?'open':''}><summary>Game ${i+1}: ${[m.a,m.b][g.w]} won (${g.min}:00, kills ${g.ks[0]}-${g.ks[1]}, MVP ${g.mvp})</summary>${box(m.a,g.S[0])}${box(m.b,g.S[1])}<div class="mu">${g.lg.join('<br>')}</div></details>`;
const matchHtml=(m,o)=>{
  const games=Array.isArray(m.gs)
    ? m.gs.map((g,i)=>gameHtml(m,g,i,o)).join('')
    : '<p class="mu">Individual game details unavailable in this older save.</p>';

  return `<details ${o?'open':''}>
    <summary class="${m.a==G.me||m.b==G.me?'me':''}">
      ${m.tag}: ${m.w} def. ${m.l} ${m.sw}-${m.sl}
    </summary>
    ${games}
  </details>`;
};

function playoffCard(m){
  const a=m.a||m.w,b=m.b||m.l;
  const old=!m.a||!m.b;
  const score=(team)=>old?'—':team===m.w?m.sw:m.sl;

  return `<div class="box" style="min-width:220px;margin:8px 0;border:1px solid var(--line)">
    <div class="mu">${m.tag.replace('MPL '+(LR||G.reg)+' ','')}</div>
    <div style="display:flex;justify-content:space-between;padding:7px 0">
      <b class="${m.w===a?'hi':''}">${a}</b>
      <b>${score(a)}</b>
    </div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid var(--line)">
      <b class="${m.w===b?'hi':''}">${b}</b>
      <b>${score(b)}</b>
    </div>
    <details>
      <summary>Series details · BO${m.n||'?'}</summary>
      ${Array.isArray(m.gs)?m.gs.map((g,i)=>gameHtml(m,g,i,0)).join(''):'<p class="mu">Individual game details unavailable.</p>'}
    </details>
  </div>`;
}

function playoffColumn(r,stage){
  const matches=(G.po[r]||[]).filter(m=>m.tag==='MPL '+r+' '+stage);

  return `<div style="min-width:250px;max-width:270px;flex:0 0 250px">
    <b>${stage}</b>
    ${matches.length
      ? matches.map(playoffCard).join('')
      : '<div class="box mu">Awaiting matches</div>'}
  </div>`;
}

function playoffHtml(r){
  return `<div class="box">
    <b>MPL ${r} Playoff Bracket</b>
    <p class="mu">Double-elimination bracket · Select a series to inspect its games and statistics.</p>
  </div>

  <div class="box">
    <b>UPPER BRACKET</b>
    <div style="display:flex;gap:18px;overflow-x:auto;padding:12px 0;align-items:flex-start">
      ${['Opening','Upper','Upper Final'].map(s=>playoffColumn(r,s)).join('<div style="font-size:24px;padding-top:80px">→</div>')}
    </div>
  </div>

  <div class="box">
    <b>LOWER BRACKET</b>
    <div style="display:flex;gap:18px;overflow-x:auto;padding:12px 0;align-items:flex-start">
      ${['Lower','Lower Final'].map(s=>playoffColumn(r,s)).join('<div style="font-size:24px;padding-top:80px">→</div>')}
    </div>
  </div>

  <div class="box">
    <b>CHAMPIONSHIP</b>
    <div style="display:flex;gap:18px;overflow-x:auto;padding:12px 0;align-items:flex-start">
      ${playoffColumn(r,'Grand Final')}
    </div>
  </div>`;
}
const dayHtml=()=>!G.day?'':`<div class="box"><b>${G.day.label}</b>${G.day.res.map(m=>matchHtml(m,0)).join('')}</div>`;
const lead=(f,min)=>Object.keys(G.T).flatMap(t=>G.T[t].p.map(p=>({p,t}))).filter(x=>x.p.s.g>=min).sort((a,b)=>f(b.p.s)-f(a.p.s)).slice(0,10)
  .map(x=>`<tr><td>${x.p.r}</td><td class="hi">${pl(x.p)}</td><td>${x.t}</td><td>${x.p.s.g}</td><td>${kda(x.p.s)}</td><td>${x.p.s.m}</td></tr>`).join('');

function profile(){
  const f=findP(PV),bk=`<button class="t" onclick="TAB='roster';render()">← Back</button>`;
  if(!f)return bk+'<div class="box">Player not found.</div>';
  const p=f.p,g=G.god,ks=Object.keys(p.h).reverse();
  const inp=k=>g?`<input type="number" value="${p[k]}" onchange="edit(${p.id},'${k}',this.value)">`:p[k];
  const sm=s=>s.g?`${s.g} GP · ${s.w}W · ${kda(s)} KDA · ${s.m} MVP`:'-';
  const tot=S0();ks.forEach(k=>['rs','po','in'].forEach(b=>{for(const x in tot)tot[x]+=p.h[k][b][x]}));
  return bk+`<div class="box"><b>${g?`<input style="width:150px" value="${p.n.replace(/"/g,'&quot;')}" onchange="edit(${p.id},'n',this.value)">`:p.n}</b> · ${p.r} · ${f.t} · OVR ${ov(p)}
  <table><tr><th>MEC</th><th>MAC</th><th>TF</th><th>CON</th></tr><tr><td>${inp('mec')}</td><td>${inp('mac')}</td><td>${inp('tf')}</td><td>${inp('con')}</td></tr></table>
  <p>Career earnings: $${Math.round(p.earn)}k · Career: ${sm(tot)}</p></div>
  <div class="box"><b>Season history</b><table><tr><th>Split</th><th>Team</th><th>Regular season</th><th>Playoffs</th><th>International</th><th>Earned</th></tr>${ks.map(k=>{const e=p.h[k];return `<tr><td>${k}</td><td>${e.t}</td><td>${sm(e.rs)}</td><td>${sm(e.po)}</td><td>${sm(e.in)}</td><td>$${Math.round(e.earn)}k</td></tr>`}).join('')||'<tr><td colspan="6" class="mu">No games yet.</td></tr>'}</table></div>
  <div class="box"><b>Achievements</b>${p.ach.length?p.ach.map(x=>`<div>🏆 ${x}</div>`).join(''):'<span class="mu">None yet.</span>'}</div>`;
}
const benchHtml=(T,mn)=>T.b.length?`<p><b>Bench</b></p><table>${hd(1)}${mn?'':'<th>Buyout</th>'}</tr>${T.b.map((p,i)=>row(p,1)+(mn?'':`<td><button onclick="buyout('${LT}',${i},1)" ${G.cash<bcost(p)?'disabled':''}>$${bcost(p)}k</button></td>`)+'</tr>').join('')}</table>`:'';
function render(){
  if(!G){
    const sv=saves();
    $('#app').innerHTML=(sv.length?`<div class="box"><b>Continue a career</b>${sv.map(s=>`<div style="margin:6px 0"><button onclick="load(${s.id})">${s.me}</button> ${s.yr} Split ${s.sp+1} · $${s.cash}k <span class="mu">${new Date(s.t).toLocaleString()}</span> <button class="t" onclick="del(${s.id})">Delete</button></div>`).join('')}</div>`:'')
      +'<p><b>New career</b>: pick your team</p>'+RG.map(r=>`<div class="box"><b>MPL ${r}</b><br>${R[r].map(k=>`<button onclick="newGame('${k}')">${k}</button>`).join('')}</div>`).join('');
    return;
  }
  const t=G.T[G.me].p,nm=ST[G.sp][G.st][0];
  const mine=G.cur?G.cur.nx.value.find(m=>m[0]==G.me||m[1]==G.me):null;
  let out=`<div class="box"><b>${G.yr} Split ${G.sp+1} (${G.sp?'M Series':'MSC'})</b> · ${G.me} · ${G.god?`$<input type="number" value="${G.cash}" onchange="G.cash=+this.value||0;render()">k`:`$${G.cash}k`}<br>
  <span class="mu">Next: ${nm} · Day ${G.cur?G.cur.n+1:1}${mine?` · Your match: ${mine[0]} vs ${mine[1]} (BO${mine[2]})`:''}</span><br>
  <button onclick="sim('day')">Sim day ▶</button><button onclick="sim('me')">Sim to my next match ⏭</button><button onclick="sim('stage')">Sim stage ⏩</button>
  <button class="t" onclick="menu()">Menu</button><button class="t ${G.god?'on':''}" onclick="G.god=!G.god;render()">God mode</button></div>`;
  out+=['roster','stats','market','league','playoffs','match','history'].map(x=>`<button class="t ${TAB==x?'on':''}" onclick="TAB='${x}';render()">${x[0].toUpperCase()+x.slice(1)}</button>`).join('');
  if(G.msg)out+=`<div class="box">${G.msg}</div>`;
  if(TAB=='player')out+=profile();
  if(TAB=='match')out+=(G.last?`<div class="box"><b>Your latest match</b>${matchHtml(G.last,1)}</div>`:'<div class="box mu">Play a match to see the play-by-play.</div>')+dayHtml();
  if(TAB=='roster'){const B=G.T[G.me].b;out+=`<div class="box"><b>Starting five</b><table>${hd(1)}</tr>${ROLES.map(r=>row(t.find(p=>p.r==r),1)+'</tr>').join('')}</table><p class="mu">Team rating ${rt(G.me).toFixed(1)} · click a player for his profile</p></div><div class="box"><b>Bench (${B.length}/${BMAX})</b>${B.length?`<table>${hd(1)}<th></th><th></th></tr>${B.map((p,i)=>row(p,1)+`<td><button onclick="startP(${i})">Start</button></td><td><button class="t" onclick="relP(${i})">Release</button></td></tr>`).join('')}</table>`:'<span class="mu">Empty. Sign players in the Market.</span>'}</div>`}
  if(TAB=='stats')out+=`<div class="box"><b>Top KDA (min 6 games)</b><table><tr><th>Role</th><th>Player</th><th>Team</th><th>GP</th><th>KDA</th><th>MVP</th></tr>${lead(s=>(s.k+s.a)/Math.max(1,s.d),6)}</table></div><div class="box"><b>MVP leaders</b><table><tr><th>Role</th><th>Player</th><th>Team</th><th>GP</th><th>KDA</th><th>MVP</th></tr>${lead(s=>s.m,1)}</table></div>`;
  if(TAB=='market')out+=`<div class="box"><table>${hd(0)}<th>Cost</th><th></th></tr>${G.fa.map((p,i)=>row(p,0)+`<td>$${cost(p)}k</td><td><button onclick="sign(${i})" ${G.cash<cost(p)?'disabled':''}>Sign</button></td></tr>`).join('')}</table></div>`;
  if(TAB=='league'){
      const po=G.po[r];

if(po&&po.length){
  const stages=[...new Set(po.map(m=>m.tag))];

  out+=`<div class="box">
    <b>MPL ${r} Playoff Results</b>
    <p class="mu">Select a series to view its individual games, player statistics, and MVP.</p>
    ${stages.map(stage=>`
      <div style="margin:12px 0">
        <b>${stage.replace('MPL '+r+' ','')}</b>
        ${po.filter(m=>m.tag===stage).map(m=>matchHtml(m,0)).join('')}
      </div>
    `).join('')}
  </div>`;
}

if(po&&po.length){
  const stages=[...new Set(po.map(m=>m.tag))];

  out+=`<div class="box">
    <b>MPL ${r} Playoff Results</b>
    <p class="mu">Select a series to view its individual games, player statistics, and MVP.</p>
    ${stages.map(stage=>`
      <div style="margin:12px 0">
        <b>${stage.replace('MPL '+r+' ','')}</b>
        ${po.filter(m=>m.tag===stage).map(m=>matchHtml(m,0)).join('')}
      </div>
    `).join('')}
  </div>`;
}
    if(LT){
      const T=G.T[LT],mn=LT==G.me;
      out+=`<div class="box"><b>${LT}</b> (${T.reg}) · rating ${rt(LT).toFixed(1)}<table>${hd(1)}${mn?'':'<th>Buyout</th><th>Trade</th>'}</tr>${ROLES.map(role=>{
        const i=T.p.findIndex(p=>p.r==role),p=T.p[i];
        if(mn)return row(p,1)+'</tr>';
        const c=bcost(p),tc=tcost(G.T[G.me].p.find(x=>x.r==role),p);
        return row(p,1)+`<td><button onclick="buyout('${LT}',${i})" ${G.cash<c?'disabled':''}>$${c}k</button></td><td><button onclick="trade('${LT}',${i})" ${G.cash<tc?'disabled':''}>${tc?'+$'+tc+'k':'Swap'}</button></td></tr>`;
      }).join('')}</table>${benchHtml(T,mn)}</div>`;
    }
  }
   if(TAB=='playoffs'){
    const r=LR||G.reg;

    out+=`<div class="box">
      <b>Select a region</b><br>
      ${RG.map(x=>`<button class="t ${r==x?'on':''}" onclick="LR='${x}';render()">MPL ${x}</button>`).join('')}
    </div>`;

    out+=playoffHtml(r);
  }
  if(TAB=='history')out+=`<div class="box">${G.hist.length?G.hist.map(x=>`<div>${x}</div>`).join(''):'<span class="mu">Nothing yet.</span>'}</div>`;
  $('#app').innerHTML=out;
  save();
}
render();