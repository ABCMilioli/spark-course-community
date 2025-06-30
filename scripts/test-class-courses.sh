#!/bin/bash

echo "🧪 Testando sistema de cursos nas turmas..."

# Verificar se o container está rodando
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Container não está rodando. Execute 'docker-compose up -d' primeiro."
    exit 1
fi

echo "📊 Verificando dados na tabela class_courses..."
docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 
    COUNT(*) as total_courses,
    COUNT(DISTINCT class_instance_id) as total_classes,
    COUNT(DISTINCT course_id) as total_unique_courses
FROM class_courses;" 2>/dev/null || echo "❌ Erro ao consultar class_courses"

echo ""
echo "📋 Detalhes dos cursos nas turmas:"
docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 
    cc.class_instance_id,
    ci.instance_name as class_name,
    cc.course_id,
    c.title as course_title,
    cc.is_required,
    cc.order_index,
    cc.created_at
FROM class_courses cc
JOIN class_instances ci ON cc.class_instance_id = ci.id
JOIN courses c ON cc.course_id = c.id
ORDER BY ci.instance_name, cc.order_index;" 2>/dev/null || echo "❌ Erro ao consultar detalhes"

echo ""
echo "🏫 Turmas disponíveis:"
docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 
    id,
    instance_name,
    instructor_id,
    is_public,
    is_active
FROM class_instances
ORDER BY instance_name;" 2>/dev/null || echo "❌ Erro ao consultar turmas"

echo ""
echo "📚 Cursos disponíveis:"
docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 
    id,
    title,
    instructor_id,
    is_active
FROM courses
ORDER BY title;" 2>/dev/null || echo "❌ Erro ao consultar cursos"

echo ""
echo "🔍 Testando view class_courses_with_details:"
docker-compose exec app psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 
    class_instance_name,
    course_title,
    is_required,
    order_index
FROM class_courses_with_details
ORDER BY class_instance_name, order_index;" 2>/dev/null || echo "❌ Erro ao consultar view"

echo ""
echo "💡 Para testar o endpoint manualmente:"
echo "   curl -H 'Authorization: Bearer SEU_TOKEN' http://localhost:8080/api/classes/ID_DA_TURMA/courses" 