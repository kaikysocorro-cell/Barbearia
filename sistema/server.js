const express=require('express'),session=require('express-session'),{Pool}=require('pg');
// AJUSTE a senha do seu usuário do PostgreSQL:
const db=new Pool({host:'localhost',port:5432,user:'postgres',password:'senai',database:'saep_db'});
const K='chave_lgpd_saep';
const app=express();app.use(express.json(),express.static('public'));
// sessão expira em 30 min de inatividade (rolling)
app.use(session({secret:'saep',resave:false,saveUninitialized:false,rolling:true,cookie:{maxAge:30*60*1000}}));
const auth=(q,r,n)=>q.session.u?n():r.status(401).json({erro:'Sessão expirada. Faça login.'});
const wrap=f=>async(q,r)=>{try{r.json(await f(q))}catch(e){r.status(400).json({erro:e.code=='23503'?'Registro possui vínculos.':e.message})}};
const q=async(s,p=[])=>(await db.query(s,p)).rows;
const cpf=v=>String(v).replace(/\D/g,'');

app.post('/api/login',async(req,res)=>{
  const{login,senha}=req.body;
  if(!login||!senha)return res.status(400).json({erro:'Preencha usuário e senha.'});
  const[u]=await q('SELECT nome FROM usuarios WHERE login=$1 AND senha=crypt($2,senha)',[login,senha]);
  if(!u)return res.status(401).json({erro:'Usuário ou senha inválidos.'});
  req.session.u=u.nome;res.json({nome:u.nome});});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:1})));
app.get('/api/me',auth,(req,res)=>res.json({nome:req.session.u}));

app.get('/api/clientes',auth,wrap(r=>q('SELECT id,nome,pgp_sym_decrypt(cpf,$1) cpf,telefone FROM clientes WHERE nome ILIKE $2 ORDER BY nome',[K,`%${r.query.busca||''}%`])));
app.post('/api/clientes',auth,wrap(r=>q('INSERT INTO clientes(nome,cpf,telefone) VALUES($1,pgp_sym_encrypt($2,$3),$4)',[r.body.nome,cpf(r.body.cpf),K,r.body.telefone])));
app.delete('/api/clientes/:id',auth,wrap(r=>q('DELETE FROM clientes WHERE id=$1',[r.params.id])));

app.get('/api/barbeiros',auth,wrap(()=>q('SELECT id,nome,pgp_sym_decrypt(cpf,$1) cpf,especialidade FROM barbeiros ORDER BY nome',[K])));
app.post('/api/barbeiros',auth,wrap(r=>q('INSERT INTO barbeiros(nome,cpf,especialidade) VALUES($1,pgp_sym_encrypt($2,$3),$4)',[r.body.nome,cpf(r.body.cpf),K,r.body.especialidade])));
app.delete('/api/barbeiros/:id',auth,wrap(r=>q('DELETE FROM barbeiros WHERE id=$1',[r.params.id])));

app.get('/api/servicos',auth,wrap(()=>q('SELECT s.*,b.nome barbeiro FROM servicos s JOIN barbeiros b ON b.id=s.barbeiro_id ORDER BY s.nome')));
app.post('/api/servicos',auth,wrap(async r=>{const b=r.body;if(!b.barbeiro_id)throw Error('Selecione um barbeiro.');
  return q('INSERT INTO servicos(nome,preco,duracao_min,barbeiro_id) VALUES($1,$2,$3,$4)',[b.nome,b.preco,b.duracao_min,b.barbeiro_id]);}));
app.delete('/api/servicos/:id',auth,wrap(r=>q('DELETE FROM servicos WHERE id=$1',[r.params.id])));

app.get('/api/agendamentos',auth,wrap(()=>q(`SELECT a.id,to_char(a.data_hora,'DD/MM/YYYY') dia,to_char(a.data_hora,'HH24:MI') hora,c.nome cliente,pgp_sym_decrypt(c.cpf,$1) cpf,c.telefone,s.nome servico,s.preco,b.nome barbeiro
 FROM agendamentos a JOIN clientes c ON c.id=a.cliente_id JOIN servicos s ON s.id=a.servico_id JOIN barbeiros b ON b.id=s.barbeiro_id ORDER BY a.data_hora`,[K])));
app.post('/api/agendamentos',auth,wrap(async r=>{const{cliente_id,servico_id,data_hora}=r.body;
  const[{n}]=await q('SELECT COUNT(*)::int n FROM agendamentos a JOIN servicos s ON s.id=a.servico_id WHERE a.data_hora=$1::timestamp AND s.barbeiro_id=(SELECT barbeiro_id FROM servicos WHERE id=$2)',[data_hora,servico_id]);
  if(n)throw Error('Barbeiro já possui atendimento neste horário.');
  return q('INSERT INTO agendamentos(cliente_id,servico_id,data_hora) VALUES($1,$2,$3::timestamp)',[cliente_id,servico_id,data_hora]);}));
app.delete('/api/agendamentos/:id',auth,wrap(r=>q('DELETE FROM agendamentos WHERE id=$1',[r.params.id])));

app.listen(3000,()=>console.log('http://localhost:3000'));
