from pydantic import BaseModel, Field

class SettingUpdate(BaseModel):
    value: str = Field(..., max_length=500)

class SettingResponse(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True
