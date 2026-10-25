// Jeevani API: static PWA + REST. Store = PostgreSQL if DATABASE_URL is set, else a JSON file.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {assess}=require('./public/engine.js');
const PORT=process.env.PORT||3000,PUB=path.join(__dirname,'public'),PRODUCTION=process.env.NODE_ENV==='production';
const SECRET=process.env.JWT_SECRET||(PRODUCTION?'':crypto.randomBytes(32).toString('hex'));
const STAT=['New','Acknowledged','Referred','Follow-up done'];
/* ---- users + signed tokens (scrypt hashes, HMAC-SHA256 tokens, 12h expiry) ---- */
const hash=(pw,salt)=>crypto.scryptSync(pw,salt,32).toString('hex');
const mk=(id,role,pw)=>{const salt=crypto.randomBytes(8).toString('hex');return{id,role,salt,h:hash(pw,salt)}};
let USERS;
if(PRODUCTION){
 let workers={};try{workers=JSON.parse(process.env.WORKER_CREDENTIALS||'{}')}catch{}
 const supervisorEmail=process.env.SUPERVISOR_EMAIL,supervisorPassword=process.env.SUPERVISOR_PASSWORD;
 if(!SECRET||SECRET.length<32||!supervisorEmail||!supervisorPassword||supervisorPassword.length<12||!workers||typeof workers!=='object'||Array.isArray(workers)||!Object.keys(workers).length||Object.entries(workers).some(([id,pw])=>!/^[-\w]{1,40}$/.test(id)||typeof pw!=='string'||pw.length<12)){
  throw new Error('Production requires a 32+ character JWT_SECRET, supervisor credentials (12+ character password), and WORKER_CREDENTIALS JSON (each password 12+ characters).');
 }
 USERS=[mk(supervisorEmail,'supervisor',supervisorPassword),...Object.entries(workers).map(([id,pw])=>mk(id,'worker',pw))];
}else USERS=[mk('supervisor@demo.in','supervisor','demo123'),...['W1','W2','W3'].map(w=>mk(w,'worker','worker123'))];
const mac=p=>crypto.createHmac('sha256',SECRET).update(p).digest('base64url');
const sign=u=>{const p=Buffer.from(JSON.stringify({id:u.id,role:u.role,exp:Date.now()+12*3600e3})).toString('base64url');return p+'.'+mac(p)};
function verify(req){const [p,s]=(req.headers.authorization||'').replace('Bearer ','').split('.');if(!p||!s)return null;const e=mac(p);
 if(s.length!==e.length||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(e)))return null;
 try{const o=JSON.parse(Buffer.from(p,'base64url'));return o.exp>Date.now()?o:null}catch(x){return null}}
function login(id,pw,role){const u=USERS.find(x=>x.id===id&&x.role===role);if(!u)return null;
 return crypto.timingSafeEqual(Buffer.from(hash(String(pw||''),u.salt)),Buffer.from(u.h))?sign(u):null}
/* ---- stores ---- */
function jsonStore(){const f=path.join(__dirname,'data','db.json');let db={cases:[],audit:[],resources:[]};
 const save=()=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(db))};
 return{async init(){if(fs.existsSync(f))db={cases:[],audit:[],resources:[],...JSON.parse(fs.readFileSync(f,'utf8'))}},
  async list(){return db.cases},async get(id){return db.cases.find(c=>c.id==id)},
  async insert(c){db.cases.unshift(c);save()},
  async setStatus(id,st){const c=db.cases.find(x=>x.id==id);if(c){c.st=st;save()}},
  async log(a,x,cid){db.audit.unshift({at:new Date().toISOString(),actor:a,action:x,case_id:cid||null});db.audit.length=Math.min(db.audit.length,500);save()},
  async audit(){return db.audit},async resources(){return db.resources||[]},async addResource(x){db.resources.unshift(x);save()}}
}
function pgStore(){const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL});
 const row=r=>({id:r.id,w:r.worker,ts:+r.ts,d:r.data,cat:r.cat,why:r.why,miss:r.miss,st:r.status,act:r.action||'',synced:true});
 return{async init(){await pool.query(`CREATE TABLE IF NOT EXISTS cases(id text PRIMARY KEY,worker text,ts bigint,data jsonb,cat text,why jsonb,miss jsonb,status text DEFAULT 'New',action text);
  CREATE TABLE IF NOT EXISTS resources(id text PRIMARY KEY,title text NOT NULL,url text NOT NULL,created_at timestamptz DEFAULT now(),created_by text);
  CREATE TABLE IF NOT EXISTS audit(id serial PRIMARY KEY,at timestamptz DEFAULT now(),actor text,action text,case_id text)`)},
  async list(){return(await pool.query('SELECT * FROM cases ORDER BY ts DESC')).rows.map(row)},
  async get(id){const r=await pool.query('SELECT * FROM cases WHERE id=$1',[id]);return r.rows[0]&&row(r.rows[0])},
  async insert(c){await pool.query('INSERT INTO cases(id,worker,ts,data,cat,why,miss,status,action) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING',[c.id,c.w,c.ts,c.d,c.cat,JSON.stringify(c.why),JSON.stringify(c.miss),c.st,c.act])},
  async setStatus(id,st){await pool.query('UPDATE cases SET status=$2 WHERE id=$1',[id,st])},
  async log(a,x,cid){await pool.query('INSERT INTO audit(actor,action,case_id) VALUES($1,$2,$3)',[a,x,cid||null])},
  async audit(){return(await pool.query('SELECT * FROM audit ORDER BY id DESC LIMIT 200')).rows},
  async resources(){return(await pool.query('SELECT id,title,url,created_at,created_by FROM resources ORDER BY created_at DESC')).rows},
  async addResource(x){await pool.query('INSERT INTO resources(id,title,url,created_by) VALUES($1,$2,$3,$4)',[x.id,x.title,x.url,x.created_by])}}
}
const store=process.env.DATABASE_URL?pgStore():jsonStore();
/* ---- http helpers ---- */
const MIME={'.html':'text/html','.js':'text/javascript','.png':'image/png','.webmanifest':'application/manifest+json'};
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
const body=req=>new Promise(r=>{let b='';req.on('data',x=>{b+=x;if(b.length>2e6)req.destroy()});req.on('end',()=>{try{r(JSON.parse(b||'{}'))}catch(e){r({})}})});
const seedCase=i=>{const r=(i*37+11)%100;const d={ga:20+(i*3)%18,sys:110+r%60,dia:70+r%45,hb:(6.5+(i*5)%6).toFixed(1),bleed:i%9==0?'heavy':i%5==0?'spotting':'none',fm:i%7==0?'reduced':'normal',head:i%4==0&&r>50,swell:i%6==0,fever:i%8==0};
 return{id:'S'+i,w:'W'+(1+i%3),ts:Date.now()-i*5400000,d,...assess(d),st:i<4?'New':STAT[i%4],act:'',synced:true}};
async function handle(req,res){const p=new URL(req.url,'http://x').pathname;
 if(p==='/healthz'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end('ok')}
 if(p.startsWith('/api/')){
  if(req.method=='POST'&&(p=='/api/login'||p=='/api/worker/login')){const b=await body(req),sup=p=='/api/login';
   const t=login(sup?b.email:b.id,b.password,sup?'supervisor':'worker');await store.log(sup?b.email:b.id,t?'login':'login_failed');
   return t?send(res,200,{token:t}):send(res,401,{error:'invalid'})}
  const u=verify(req);if(!u)return send(res,401,{error:'auth'});
  if(p=='/api/sync'&&req.method=='POST'){if(u.role!='worker')return send(res,403,{error:'role'});
   const b=await body(req),st={};
   for(const c of(b.cases||[]).slice(0,500)){if(!/^[\w-]{1,40}$/.test(c.id||'')||typeof c.d!='object'||!c.d)continue;
    let x=await store.get(c.id);
    if(!x){x={id:c.id,w:u.id,ts:+c.ts||Date.now(),d:c.d,...assess(c.d),st:'New',act:String(c.act||'').slice(0,80),synced:true};await store.insert(x);await store.log(u.id,'case_synced',c.id)}
    if(x.w==u.id)st[c.id]=x.st}
   return send(res,200,{statuses:st})}
  if(u.role!='supervisor')return send(res,403,{error:'role'});
  if(p==='/api/resources'&&req.method==='GET')return send(res,200,await store.resources());
  if(p==='/api/resources'&&req.method==='POST'){const b=await body(req);if(typeof b.title!=='string'||!b.title.trim()||b.title.length>100||typeof b.url!=='string'||!/^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//.test(b.url))return send(res,400,{error:'resource'});const x={id:crypto.randomUUID(),title:b.title.trim(),url:b.url,created_by:u.id};await store.addResource(x);await store.log(u.id,'resource_added',x.id);return send(res,201,x)}
  if(p==='/api/cloudinary/sign'&&req.method==='POST'){const {CLOUDINARY_CLOUD_NAME:cloud,CLOUDINARY_API_KEY:key,CLOUDINARY_API_SECRET:secret}=process.env;if(!cloud||!key||!secret)return send(res,503,{error:'cloudinary_not_configured'});const timestamp=Math.floor(Date.now()/1000),folder='jeevani/education';const params={folder,timestamp};const toSign=Object.keys(params).sort().map(k=>`${k}=${params[k]}`).join('&');const signature=crypto.createHash('sha1').update(toSign+secret).digest('hex');return send(res,200,{cloud_name:cloud,api_key:key,timestamp,folder,signature})}
  if(p=='/api/cases'&&req.method=='GET')return send(res,200,await store.list());
  if(p=='/api/audit'&&req.method=='GET')return send(res,200,await store.audit());
  const m=p.match(/^\/api\/cases\/([\w-]+)$/);
  if(m&&req.method=='PATCH'){const b=await body(req);if(!STAT.includes(b.st))return send(res,400,{error:'status'});
   if(!(await store.get(m[1])))return send(res,404,{});await store.setStatus(m[1],b.st);await store.log(u.id,'status:'+b.st,m[1]);return send(res,200,{ok:true})}
  return send(res,404,{})}
 const f=path.join(PUB,p=='/'?'index.html':p);
 if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Not found')}
 res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}
(async()=>{await store.init();if(!(await store.list()).length)for(let i=0;i<12;i++)await store.insert(seedCase(i));
 http.createServer((q,r)=>handle(q,r).catch(e=>{console.error(e);if(!r.headersSent)send(r,500,{error:'server'})})).listen(PORT,()=>console.log(`Jeevani on http://localhost:${PORT} (store: ${process.env.DATABASE_URL?'PostgreSQL':'JSON file'})`))})();
