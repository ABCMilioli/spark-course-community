const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../config/minio.js');

const uploadFile = async (file, folder = 'general') => {
  try {
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${timestamp}-${randomString}.${fileExtension}`;
    
    console.log('[MinIO Upload] Iniciando upload:', fileName);
    console.log('[MinIO Upload] Tamanho do arquivo:', file.size, 'bytes');
    
    const command = new PutObjectCommand({
      Bucket: process.env.MINIO_BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read' // Para arquivos públicos
    });

    await s3Client.send(command);
    
    const fileUrl = `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}/${fileName}`;
    
    console.log('[MinIO Upload] Upload realizado com sucesso:', fileUrl);
    
    return {
      success: true,
      url: fileUrl,
      fileName: fileName,
      size: file.size
    };
  } catch (error) {
    console.error('[MinIO Upload] Erro no upload:', error);
    throw new Error(`Erro no upload: ${error.message}`);
  }
};

const deleteFile = async (fileName) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.MINIO_BUCKET,
      Key: fileName
    });

    await s3Client.send(command);
    console.log('[MinIO Delete] Arquivo deletado:', fileName);
    
    return { success: true };
  } catch (error) {
    console.error('[MinIO Delete] Erro ao deletar:', error);
    throw new Error(`Erro ao deletar arquivo: ${error.message}`);
  }
};

module.exports = { uploadFile, deleteFile }; 