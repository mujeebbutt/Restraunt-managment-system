from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=100)

class StaffTokenInfo(BaseModel):
    id: int
    name: str
    role: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    staff: StaffTokenInfo
