const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'spark_course',
});

async function applyMigration() {
  try {
    console.log('Aplicando migration dos posts do fórum...');
    
    // Verificar se content_image_url existe
    const checkContentImageUrl = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'forum_posts' AND column_name = 'content_image_url'
    `);
    
    if (checkContentImageUrl.rows.length === 0) {
      console.log('Adicionando coluna content_image_url...');
      await pool.query('ALTER TABLE forum_posts ADD COLUMN content_image_url TEXT');
    } else {
      console.log('Coluna content_image_url já existe');
    }
    
    // Verificar se cover_image_url existe
    const checkCoverImageUrl = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'forum_posts' AND column_name = 'cover_image_url'
    `);
    
    if (checkCoverImageUrl.rows.length > 0) {
      console.log('Migrando dados de cover_image_url para content_image_url...');
      await pool.query(`
        UPDATE forum_posts 
        SET content_image_url = cover_image_url 
        WHERE cover_image_url IS NOT NULL AND content_image_url IS NULL
      `);
      
      console.log('Removendo coluna cover_image_url...');
      await pool.query('ALTER TABLE forum_posts DROP COLUMN cover_image_url');
    } else {
      console.log('Coluna cover_image_url não existe');
    }
    
    // Testar a estrutura da tabela
    const tableStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'forum_posts' 
      ORDER BY ordinal_position
    `);
    
    console.log('Estrutura atual da tabela forum_posts:');
    tableStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('Migration aplicada com sucesso!');
    
  } catch (error) {
    console.error('Erro ao aplicar migration:', error);
  } finally {
    pool.end();
  }
}

applyMigration(); 