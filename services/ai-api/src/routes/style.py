"""Routes for AI style-clone and image-to-cartoon conversion."""

from __future__ import annotations

import uuid

from fastapi import APIRouter

from services.ai_api.src.models.style_schemas import (
    ImageToCartoonRequest,
    ImageToCartoonResponse,
    StyleCloneRequest,
    StyleCloneResponse,
)
from services.ai_api.src.services.cartoon_service import image_to_cartoon
from services.ai_api.src.services.style_service import extract_style_fingerprint

router = APIRouter(prefix="/ai/v1")


@router.post("/style/clone", response_model=StyleCloneResponse)
async def clone_style(request: StyleCloneRequest) -> StyleCloneResponse:
    """Extract a style fingerprint from *source_url* and return a style pack."""
    fingerprint = extract_style_fingerprint(
        source_url=request.source_url,
        source_type=request.source_type,
    )
    style_pack_id = uuid.uuid4().hex[:16]
    return StyleCloneResponse(
        style_pack_id=style_pack_id,
        fingerprint=fingerprint,
    )


@router.post("/convert/img-to-cartoon", response_model=ImageToCartoonResponse)
async def convert_img_to_cartoon(
    request: ImageToCartoonRequest,
) -> ImageToCartoonResponse:
    """Convert an image to a cartoon rendering using the specified style."""
    result = image_to_cartoon(
        image_url=request.image_url,
        style=request.style,
        strength=request.strength,
    )
    return ImageToCartoonResponse(**result)
