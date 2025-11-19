from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List
from datetime import datetime

# ========== AUTH SCHEMAS ==========
class RegisterRequest(BaseModel):
    email: EmailStr
    nome: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)

    @validator('nome')
    def nome_no_special_chars(cls, v):
        if not v.replace(' ', '').isalnum():
            raise ValueError('Nome não pode conter caracteres especiais')
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

# ========== CHAT SCHEMAS ==========
class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    conversation_id: Optional[str] = None
    tenant_id: Optional[str] = None
    messages: Optional[List[dict]] = []
    model: Optional[str] = None

    @validator('model')
    def validate_model(cls, v):
        if v is None:
            return v
        if v not in VALID_MODELS:
            raise ValueError(f'Modelo deve ser um de: {VALID_MODELS}')
        return v

class PaginationParams(BaseModel):
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=100)

# ========== CUSTOM AI SCHEMAS ==========
VALID_MODELS = {
    'claude-opus-4-1', 
    'claude-sonnet-4-5', 
    'gemini-1.5-pro', 
    'gemini-1.5-flash',
    'llama-3.3-70b-versatile'
}

class CreateCustomAIRequest(BaseModel):
    tenant_id: str
    nome: str = Field(..., min_length=1, max_length=100)
    descricao: str = Field(default='', max_length=500)
    sistema_prompt: str = Field(..., min_length=10, max_length=5000)
    modelo: str = Field(default='claude-opus-4-1')
    temperatura: float = Field(default=0.7, ge=0, le=2.0)
    max_tokens: int = Field(default=2048, ge=256, le=4096)

    @validator('modelo')
    def validate_modelo(cls, v):
        if v not in VALID_MODELS:
            raise ValueError(f'Modelo deve ser um de: {VALID_MODELS}')
        return v

# ========== PROJECTS SCHEMAS ==========
class CreateProjectRequest(BaseModel):
    tenant_id: str
    nome: str = Field(..., min_length=1, max_length=255)
    descricao: str = Field(default='', max_length=5000)

class CreateProjectFileRequest(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=255)
    conteudo: Optional[str] = None
    tipo: str = Field(default='documento')

    @validator('tipo')
    def validate_tipo(cls, v):
        valid_types = {'documento', 'planilha', 'apresentacao', 'imagem', 'video'}
        if v not in valid_types:
            raise ValueError(f'Tipo deve ser um de: {valid_types}')
        return v

# ========== SWIPES SCHEMAS ==========
class CreateSwipeRequest(BaseModel):
    tenant_id: str
    titulo: str = Field(..., min_length=1, max_length=255)
    conteudo: str = Field(..., min_length=10, max_length=50000)
    categoria: Optional[str] = Field(default='', max_length=100)
    tipo_rede: Optional[str] = Field(default='', max_length=50)
    url_referencia: Optional[str] = Field(default='', max_length=2000)

# ========== TENANTS SCHEMAS ==========
class CreateTenantRequest(BaseModel):
    nome: str = Field(..., min_length=3, max_length=100)

VALID_ROLES = {'owner', 'admin', 'member'}

class AddUserToTenantRequest(BaseModel):
    user_id: str
    role: str = Field(default='member')

    @validator('role')
    def validate_role(cls, v):
        if v not in VALID_ROLES:
            raise ValueError(f'Role deve ser um de: {VALID_ROLES}')
        return v

class AddUserByEmailRequest(BaseModel):
    email: EmailStr
    role: str = Field(default='member')

    @validator('role')
    def validate_role(cls, v):
        if v not in VALID_ROLES:
            raise ValueError(f'Role deve ser um de: {VALID_ROLES}')
        return v

# ========== VISION SCHEMAS ==========
class AnalyzeImageRequest(BaseModel):
    image_url: str = Field(..., min_length=10, max_length=2048)
    prompt: str = Field(default='Descreva esta imagem detalhadamente.', max_length=1000)
    persist: bool = Field(default=True)
    tenant_id: Optional[str] = None

# ========== VOICE SCHEMAS ==========
class TranscribeAudioRequest(BaseModel):
    model: str = Field(default='whisper-large-v3-turbo')
    language: Optional[str] = None

# ========== WEB SCHEMAS ==========
class SearchWebRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    max_uses: int = Field(default=5, ge=1, le=10)
    allowed_domains: Optional[List[str]] = None
    blocked_domains: Optional[List[str]] = None
    persist: bool = Field(default=True)
    tenant_id: Optional[str] = None

class VisitWebsiteRequest(BaseModel):
    url: str = Field(..., min_length=10, max_length=2048)
    instruction: Optional[str] = Field(default='', max_length=1000)
    max_uses: int = Field(default=3, ge=1, le=10)
    persist: bool = Field(default=True)
    tenant_id: Optional[str] = None

# ========== IMAGE SCHEMAS ==========
class CreateImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)
    image_prompt: Optional[str] = None
    width: int = Field(default=1024, ge=256, le=1024)
    height: int = Field(default=1024, ge=256, le=1024)
