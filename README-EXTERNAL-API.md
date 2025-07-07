# API Externa de Matrícula

Permite integração de sistemas externos (ex: n8n, Hotmart, Kiwify) para criar usuários e matricular/desmatricular em cursos/turmas.

## Dados obrigatórios
- **CPF** do usuário (campo obrigatório e único)
- **course_id** (UUID do curso) e/ou **class_id** (UUID da turma)
- Email e nome do usuário são opcionais

---

## Endpoint de Matrícula

`POST /api/external/enroll`

### Payload
```json
{
  "user": {
    "cpf": "12345678900",
    "email": "aluno@email.com",   // opcional
    "name": "Nome do Aluno"       // opcional
  },
  "course_id": "uuid-do-curso",   // obrigatório para matrícula em curso
  "class_id": "uuid-da-turma",     // obrigatório para matrícula em turma
  "action": "enroll"               // ou "unenroll"
}
```
- `user.cpf` é obrigatório.
- `course_id` ou `class_id` deve ser informado (ou ambos).
- `action` pode ser `enroll` (padrão) ou `unenroll`.

### Exemplo de requisição
```bash
curl -X POST https://SEU_DOMINIO/api/external/enroll \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"cpf": "12345678900", "email": "aluno@email.com", "name": "Aluno"},
    "course_id": "uuid-curso",
    "action": "enroll"
  }'
```

### Resposta
```json
{
  "success": true,
  "message": "Usuário matriculado com sucesso.",
  "user_id": "uuid",
  "enrollment_id": "uuid",
  "class_enrollment_id": "uuid"
}
```

### Erros comuns
- 401: Token de autenticação inválido
- 400: CPF ou course_id/class_id ausentes
- 500: Erro interno

---

## Endpoint de Consulta de Matrícula

`POST /api/external/check-enrollment`

### Payload
```json
{
  "cpf": "12345678900",
  "course_id": "uuid-do-curso",   // opcional
  "class_id": "uuid-da-turma"     // opcional
}
```
- `cpf` é obrigatório.
- `course_id` ou `class_id` deve ser informado (ou ambos).

### Exemplo de requisição
```bash
curl -X POST https://SEU_DOMINIO/api/external/check-enrollment \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "12345678900",
    "course_id": "uuid-curso"
  }'
```

### Resposta
```json
{
  "success": true,
  "user_id": "uuid",
  "enrollment": {
    "course_id": "uuid",
    "status": "active" // ou "none"
  },
  "class_enrollment": {
    "class_id": "uuid",
    "status": "active" // ou "inactive", "none"
  }
}
```
- Se não houver matrícula, retorna status `"none"`.

### Erros comuns
- 401: Token de autenticação inválido
- 400: CPF ou course_id/class_id ausentes
- 500: Erro interno

---

## Endpoints de Busca

### Buscar curso por nome exato
`POST /api/external/find-course`

**Payload:**
```json
{
  "course_name": "Nome Exato do Curso"
}
```
**Resposta:**
```json
{
  "success": true,
  "courses": [
    {
      "id": "uuid-do-curso",
      "title": "Nome Exato do Curso",
      ... // outros campos do curso
    }
  ]
}
```
- Se não encontrar, retorna 404.

### Buscar turma por nome exato
`POST /api/external/find-class`

**Payload:**
```json
{
  "class_name": "Nome Exato da Turma"
}
```
**Resposta:**
```json
{
  "success": true,
  "classes": [
    {
      "id": "uuid-da-turma",
      "name": "Nome Exato da Turma",
      ... // outros campos da turma
    }
  ]
}
```
- Se não encontrar, retorna 404.

---

**Use estes endpoints para integrar automações, plataformas de pagamento, CRMs, etc.** 