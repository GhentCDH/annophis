-- One user + schema per service (dev only). CREATEDB: prisma migrate dev's shadow database.
-- CREATE on the database: Prisma's first migration for a non-public schema runs
-- CREATE SCHEMA IF NOT EXISTS, which Postgres permission-checks even when the schema exists.
CREATE USER gateway WITH PASSWORD 'dev' CREATEDB;
CREATE SCHEMA gateway AUTHORIZATION gateway;
GRANT CREATE ON DATABASE annophis TO gateway;
CREATE USER ms_projects WITH PASSWORD 'dev' CREATEDB;
CREATE SCHEMA ms_projects AUTHORIZATION ms_projects;
GRANT CREATE ON DATABASE annophis TO ms_projects;
CREATE USER ms_corpora WITH PASSWORD 'dev' CREATEDB;
CREATE SCHEMA ms_corpora AUTHORIZATION ms_corpora;
GRANT CREATE ON DATABASE annophis TO ms_corpora;
CREATE USER ms_annotation WITH PASSWORD 'dev' CREATEDB;
CREATE SCHEMA ms_annotation AUTHORIZATION ms_annotation;
GRANT CREATE ON DATABASE annophis TO ms_annotation;
CREATE USER ms_metadata WITH PASSWORD 'dev' CREATEDB;
CREATE SCHEMA ms_metadata AUTHORIZATION ms_metadata;
GRANT CREATE ON DATABASE annophis TO ms_metadata;
CREATE USER text_service_1 WITH PASSWORD 'dev' CREATEDB;
CREATE SCHEMA text_service_1 AUTHORIZATION text_service_1;
GRANT CREATE ON DATABASE annophis TO text_service_1;
CREATE USER text_service_2 WITH PASSWORD 'dev' CREATEDB;
CREATE SCHEMA text_service_2 AUTHORIZATION text_service_2;
GRANT CREATE ON DATABASE annophis TO text_service_2;
CREATE USER ml_adapter WITH PASSWORD 'dev' CREATEDB;
CREATE SCHEMA ml_adapter AUTHORIZATION ml_adapter;
GRANT CREATE ON DATABASE annophis TO ml_adapter;
