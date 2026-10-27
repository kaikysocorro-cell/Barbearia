-- pgAdmin: crie o banco "saep_db", abra o Query Tool nele e execute este script
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DROP TABLE IF EXISTS agendamentos,servicos,barbeiros,clientes,usuarios CASCADE;
CREATE TABLE usuarios(id SERIAL PRIMARY KEY,nome VARCHAR(80) NOT NULL,login VARCHAR(40) UNIQUE NOT NULL,senha TEXT NOT NULL);
CREATE TABLE clientes(id SERIAL PRIMARY KEY,nome VARCHAR(80) NOT NULL,cpf BYTEA NOT NULL,telefone VARCHAR(20));
CREATE TABLE barbeiros(id SERIAL PRIMARY KEY,nome VARCHAR(80) NOT NULL,cpf BYTEA NOT NULL,especialidade VARCHAR(60));
CREATE TABLE servicos(id SERIAL PRIMARY KEY,nome VARCHAR(60) NOT NULL,preco NUMERIC(8,2) NOT NULL,duracao_min INT NOT NULL,barbeiro_id INT NOT NULL REFERENCES barbeiros(id));
CREATE TABLE agendamentos(id SERIAL PRIMARY KEY,cliente_id INT NOT NULL REFERENCES clientes(id),servico_id INT NOT NULL REFERENCES servicos(id),data_hora TIMESTAMP NOT NULL);
-- senha de todos: 123456 (bcrypt via crypt); CPF com pgp_sym_encrypt
INSERT INTO usuarios(nome,login,senha) VALUES('Administrador','admin',crypt('123456',gen_salt('bf'))),('Maria Gerente','maria',crypt('123456',gen_salt('bf'))),('João Atendente','joao',crypt('123456',gen_salt('bf')));
INSERT INTO clientes(nome,cpf,telefone) VALUES('Carlos Silva',pgp_sym_encrypt('11111111111','chave_lgpd_saep'),'48990000001'),('Pedro Souza',pgp_sym_encrypt('22222222222','chave_lgpd_saep'),'48990000002'),('Lucas Lima',pgp_sym_encrypt('33333333333','chave_lgpd_saep'),'48990000003');
INSERT INTO barbeiros(nome,cpf,especialidade) VALUES('Rafael Costa',pgp_sym_encrypt('44444444444','chave_lgpd_saep'),'Degradê'),('Bruno Alves',pgp_sym_encrypt('55555555555','chave_lgpd_saep'),'Barba'),('Tiago Rocha',pgp_sym_encrypt('66666666666','chave_lgpd_saep'),'Corte clássico');
INSERT INTO servicos(nome,preco,duracao_min,barbeiro_id) VALUES('Corte degradê',45,40,1),('Barba completa',35,30,2),('Corte clássico',40,30,3);
INSERT INTO agendamentos(cliente_id,servico_id,data_hora) VALUES(1,1,'2026-11-02 09:00'),(2,2,'2026-11-02 10:00'),(3,3,'2026-11-03 14:30');
