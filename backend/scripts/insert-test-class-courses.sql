-- Script para inserir dados de teste na tabela class_courses
-- Este script associa cursos existentes às turmas existentes

-- Primeiro, vamos verificar quais turmas e cursos existem
SELECT 'Turmas disponíveis:' as info;
SELECT id, instance_name FROM class_instances WHERE is_active = true;

SELECT 'Cursos disponíveis:' as info;
SELECT id, title FROM courses WHERE is_active = true;

-- Inserir dados de teste na tabela class_courses
-- Vamos associar alguns cursos às turmas existentes

-- Exemplo: Associar o primeiro curso à primeira turma
INSERT INTO class_courses (class_instance_id, course_id, is_required, order_index)
SELECT 
    ci.id as class_instance_id,
    c.id as course_id,
    true as is_required,
    0 as order_index
FROM class_instances ci
CROSS JOIN courses c
WHERE ci.is_active = true 
  AND c.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM class_courses cc 
    WHERE cc.class_instance_id = ci.id AND cc.course_id = c.id
  )
LIMIT 1
ON CONFLICT (class_instance_id, course_id) DO NOTHING;

-- Exemplo: Associar mais um curso à mesma turma (opcional)
INSERT INTO class_courses (class_instance_id, course_id, is_required, order_index)
SELECT 
    ci.id as class_instance_id,
    c.id as course_id,
    false as is_required,
    1 as order_index
FROM class_instances ci
CROSS JOIN courses c
WHERE ci.is_active = true 
  AND c.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM class_courses cc 
    WHERE cc.class_instance_id = ci.id AND cc.course_id = c.id
  )
LIMIT 1
ON CONFLICT (class_instance_id, course_id) DO NOTHING;

-- Verificar o resultado
SELECT 'Dados inseridos na tabela class_courses:' as info;
SELECT 
    cc.id,
    ci.instance_name as class_name,
    c.title as course_title,
    cc.is_required,
    cc.order_index,
    cc.created_at
FROM class_courses cc
JOIN class_instances ci ON cc.class_instance_id = ci.id
JOIN courses c ON cc.course_id = c.id
ORDER BY ci.instance_name, cc.order_index; 