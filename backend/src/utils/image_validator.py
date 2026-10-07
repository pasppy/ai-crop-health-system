#!/usr/bin/env python3
"""
Image Validation and Out-of-Distribution (OOD) Gatekeeper
Module: AI-Based Crop Health Monitoring System - Backend
Enforces multi-stage verification before passing inputs to the CV model:
  Stage 1: File & Structure Validation (format, file size, dimensions, aspect ratio)
  Stage 2: Image Quality & Exposure Filter (blur detection, exposure bounds)
  Stage 3: Botanical / Foliage Domain Gate (color-space vegetation segmentation)
  Stage 4: Prediction Calibration & Confidence Floor (entropy, top-1 margin)
"""

import io
import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image


# Allowed image formats
SUPPORTED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}

# Dimension constraints
MIN_DIMENSION = 120
MAX_DIMENSION = 6000
MIN_ASPECT_RATIO = 0.18
MAX_ASPECT_RATIO = 5.5

# Quality thresholds
MIN_BRIGHTNESS = 20.0     # Mean intensity (0-255)
MAX_BRIGHTNESS = 242.0
MIN_LAPLACIAN_VAR = 25.0  # Blur threshold (Laplacian operator variance)

# Botanical domain thresholds
MIN_VEGETATION_RATIO = 0.12  # At least 12% of image must exhibit foliage color signatures


def validate_file_integrity(contents: bytes) -> Dict[str, Any]:
    """
    Stage 1: Verify file integrity, format, dimensions, and aspect ratio.
    """
    if not contents or len(contents) < 1024:
        return {
            "valid": False,
            "error_title": "Empty or Corrupted File",
            "what_went_wrong": "The uploaded file is empty or corrupted (under 1 KB), so no image data could be read.",
            "actionable_steps": [
                "Select a valid image file (JPG, PNG, or WebP) from your device.",
                "Ensure the photo transferred completely from your camera or phone before uploading.",
                "If using a camera, allow camera permissions and capture a fresh frame."
            ],
            "image": None
        }

    if len(contents) > 15 * 1024 * 1024:
        return {
            "valid": False,
            "error_title": "File Too Large",
            "what_went_wrong": "The image file exceeds the 15 MB maximum size limit.",
            "actionable_steps": [
                "Resize or compress your photo to under 15 MB.",
                "Use standard photo dimensions (e.g., 1080p to 4K resolution is optimal)."
            ],
            "image": None
        }

    try:
        image = Image.open(io.BytesIO(contents))
        image.load()
    except Exception as e:
        return {
            "valid": False,
            "error_title": "Unreadable Image Format",
            "what_went_wrong": f"Unable to decode the image file ({str(e)}). The file may be damaged or in an unsupported format.",
            "actionable_steps": [
                "Ensure the file is a standard JPEG, PNG, or WebP image.",
                "Avoid renaming non-image documents (.pdf, .txt, .docx) to .jpg."
            ],
            "image": None
        }

    fmt = (image.format or "").upper()
    if fmt not in SUPPORTED_FORMATS and fmt not in {"JPEG", "MPO"}:
        return {
            "valid": False,
            "error_title": "Unsupported File Extension",
            "what_went_wrong": f"Uploaded format is '{fmt}'. The diagnostic model only supports JPG, PNG, and WebP images.",
            "actionable_steps": [
                "Convert your image to JPG or PNG format.",
                "Take a direct photo using the 'Capture from Camera' button."
            ],
            "image": None
        }

    w, h = image.size
    if w < MIN_DIMENSION or h < MIN_DIMENSION:
        return {
            "valid": False,
            "error_title": "Resolution Too Low",
            "what_went_wrong": f"Image resolution ({w}x{h} px) is too low. Tiny thumbnails lack the fine visual detail needed to identify pathogen lesions.",
            "actionable_steps": [
                f"Upload a photo that is at least {MIN_DIMENSION}x{MIN_DIMENSION} pixels (recommended: 800x600 px or higher).",
                "Do not crop the photo down to a tiny icon before uploading."
            ],
            "image": None
        }

    if w > MAX_DIMENSION or h > MAX_DIMENSION:
        return {
            "valid": False,
            "error_title": "Resolution Exceeds Maximum",
            "what_went_wrong": f"Image resolution ({w}x{h} px) exceeds our maximum processing boundary of {MAX_DIMENSION}x{MAX_DIMENSION} px.",
            "actionable_steps": [
                "Scale down the image resolution in your photo editor before uploading."
            ],
            "image": None
        }

    aspect_ratio = w / float(h)
    if aspect_ratio < MIN_ASPECT_RATIO or aspect_ratio > MAX_ASPECT_RATIO:
        return {
            "valid": False,
            "error_title": "Abnormal Aspect Ratio",
            "what_went_wrong": f"The image has an extreme panoramic or ribbon aspect ratio ({aspect_ratio:.2f}:1).",
            "actionable_steps": [
                "Capture the leaf in standard photo orientation (4:3, 16:9, or 1:1 square).",
                "Avoid ultra-wide panoramic crop strips."
            ],
            "image": None
        }

    return {
        "valid": True,
        "error_title": None,
        "what_went_wrong": None,
        "actionable_steps": [],
        "image": image
    }


def validate_image_quality(image: Image.Image) -> Dict[str, Any]:
    """
    Stage 2: Check exposure (underexposed/overexposed) and blurriness using Laplacian variance.
    """
    gray = image.convert("L")
    w, h = gray.size
    scale = min(1.0, 512.0 / max(w, h))
    if scale < 1.0:
        gray_scaled = gray.resize((int(w * scale), int(h * scale)), Image.Resampling.BILINEAR)
    else:
        gray_scaled = gray

    arr = np.array(gray_scaled, dtype=np.float32)

    # 1. Exposure check
    mean_brightness = float(np.mean(arr))
    if mean_brightness < MIN_BRIGHTNESS:
        return {
            "valid": False,
            "error_title": "Photo Too Dark (Underexposed)",
            "what_went_wrong": f"The photograph is severely dark (brightness level {mean_brightness:.1f}/255). Leaf textures and lesion coloration cannot be distinguished in poor lighting.",
            "actionable_steps": [
                "Move into natural daylight or turn on field work-lights.",
                "Avoid deep canopy shadows by holding the leaf toward the sunlight.",
                "Check that your phone's camera exposure isn't turned all the way down."
            ],
            "details": {"brightness": round(mean_brightness, 1), "blur_score": 0.0}
        }

    if mean_brightness > MAX_BRIGHTNESS:
        return {
            "valid": False,
            "error_title": "Photo Washed Out (Overexposed / Glare)",
            "what_went_wrong": f"The photograph is washed out with harsh glare (brightness level {mean_brightness:.1f}/255). Intense reflection conceals lesion margins.",
            "actionable_steps": [
                "Turn off your camera flash — flash creates bright white reflective spots on waxy paddy leaves.",
                "Angle your camera slightly away from direct midday sun to reduce reflection.",
                "Shade the leaf lightly with your hand or hat to create even, soft lighting."
            ],
            "details": {"brightness": round(mean_brightness, 1), "blur_score": 0.0}
        }

    # 2. Blur check via Laplacian variance
    if arr.shape[0] >= 5 and arr.shape[1] >= 5:
        padded = np.pad(arr, 1, mode="edge")
        laplacian = (
            padded[:-2, 1:-1] +
            padded[2:, 1:-1] +
            padded[1:-1, :-2] +
            padded[1:-1, 2:] -
            4.0 * padded[1:-1, 1:-1]
        )
        blur_score = float(np.var(laplacian))
    else:
        blur_score = 100.0

    if blur_score < MIN_LAPLACIAN_VAR:
        return {
            "valid": False,
            "error_title": "Photo Too Blurry (Out of Focus)",
            "what_went_wrong": f"The photograph is too blurry or out of focus (sharpness score {blur_score:.1f}, minimum required: {MIN_LAPLACIAN_VAR:.0f}). Pathogen identification requires crisp views of lesion margins.",
            "actionable_steps": [
                "Tap your phone screen directly on the diseased leaf to lock focus before snapping.",
                "Hold your camera steady for 1 full second to prevent hand-shake or wind motion blur.",
                "Wipe your smartphone camera lens with a clean cloth to remove smudges or oil.",
                "Stand 15–30 cm away; don't place the camera closer than its minimum macro focus distance."
            ],
            "details": {"brightness": round(mean_brightness, 1), "blur_score": round(blur_score, 1)}
        }

    return {
        "valid": True,
        "error_title": None,
        "what_went_wrong": None,
        "actionable_steps": [],
        "details": {"brightness": round(mean_brightness, 1), "blur_score": round(blur_score, 1)}
    }


def validate_botanical_foliage(image: Image.Image) -> Dict[str, Any]:
    """
    Stage 3: Foliage & Vegetation Domain Gatekeeper.
    Rejects non-plant images (cars, people, animals, documents, screenshots, solid colors)
    by quantifying plant tissue chrominance in HSV and RGB color spaces.
    """
    rgb_img = image.convert("RGB")
    thumb = rgb_img.resize((256, 256), Image.Resampling.BILINEAR)
    arr = np.array(thumb, dtype=np.float32) / 255.0

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    # HSV conversion
    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    delta = cmax - cmin

    hue = np.zeros_like(cmax)
    non_zero = delta > 1e-4

    idx = non_zero & (cmax == r)
    hue[idx] = (60.0 * (((g[idx] - b[idx]) / delta[idx]) % 6))

    idx = non_zero & (cmax == g)
    hue[idx] = (60.0 * (((b[idx] - r[idx]) / delta[idx]) + 2))

    idx = non_zero & (cmax == b)
    hue[idx] = (60.0 * (((r[idx] - g[idx]) / delta[idx]) + 4))

    sat = np.zeros_like(cmax)
    sat[cmax > 1e-4] = delta[cmax > 1e-4] / cmax[cmax > 1e-4]
    val = cmax

    # Plant foliage signatures (green, chlorotic yellow, brown/lesion necrotic)
    green_mask = (hue >= 35.0) & (hue <= 160.0) & (sat >= 0.15) & (val >= 0.12)
    yellow_mask = (hue >= 20.0) & (hue <= 45.0) & (sat >= 0.25) & (val >= 0.25)
    brown_lesion_mask = (hue >= 10.0) & (hue <= 32.0) & (sat >= 0.20) & (val >= 0.15) & (r > b + 0.05)
    exg = (2.0 * g) - r - b
    exg_mask = (exg > 0.04) & (val >= 0.15)

    foliage_mask = green_mask | yellow_mask | brown_lesion_mask | exg_mask
    total_pixels = 256.0 * 256.0
    foliage_pixels = float(np.sum(foliage_mask))
    foliage_ratio = foliage_pixels / total_pixels

    metrics = {
        "foliage_coverage_pct": round(foliage_ratio * 100.0, 1),
        "green_pct": round(float(np.sum(green_mask)) / total_pixels * 100.0, 1),
        "chlorotic_pct": round(float(np.sum(yellow_mask)) / total_pixels * 100.0, 1),
        "necrotic_pct": round(float(np.sum(brown_lesion_mask)) / total_pixels * 100.0, 1)
    }

    if foliage_ratio < MIN_VEGETATION_RATIO:
        return {
            "valid": False,
            "error_title": "Non-Plant / Non-Rice Image Detected",
            "what_went_wrong": f"The uploaded photo does not contain any recognizable rice leaf or crop foliage. The system detected only {metrics['foliage_coverage_pct']}% plant tissue (minimum required: {MIN_VEGETATION_RATIO*100:.0f}%). It appears to be an everyday object, animal, vehicle, document, or non-agricultural scenery.",
            "actionable_steps": [
                "Photograph an actual rice plant or paddy crop in your field or nursery.",
                "Hold the camera 15–30 cm from the leaf so foliage occupies at least 30% of the screen.",
                "Ensure a leaf blade with visible spots, streaks, or wilting is centered in the frame.",
                "To test the diagnostic system right now without a live field crop, click one of the verified sample presets below."
            ],
            "details": metrics
        }

    return {
        "valid": True,
        "error_title": None,
        "what_went_wrong": None,
        "actionable_steps": [],
        "details": metrics
    }


def calibrate_prediction(top_predictions: list, min_confidence: float = 38.0, min_margin: float = 4.0) -> Dict[str, Any]:
    """
    Stage 4: Prediction calibration and confidence floor.
    Checks whether the model's output distribution is confident or ambiguous/inconclusive.
    """
    if not top_predictions:
        return {
            "accepted": False,
            "status": "Inconclusive",
            "error_title": "Empty Prediction Set",
            "what_went_wrong": "The neural network could not generate probability scores for this image.",
            "actionable_steps": ["Please retake and upload the photo again."],
            "message": "Model returned an empty prediction set."
        }

    top1 = top_predictions[0]
    top1_pct = float(top1.get("percentage", 0.0))
    top2_pct = float(top_predictions[1].get("percentage", 0.0)) if len(top_predictions) > 1 else 0.0
    margin = top1_pct - top2_pct

    probs = [float(p.get("probability", 0.0)) for p in top_predictions]
    entropy = -sum(p * math.log(max(p, 1e-9)) for p in probs if p > 0)

    # 1. Reject if top confidence is below minimum threshold
    if top1_pct < min_confidence:
        return {
            "accepted": False,
            "status": "Inconclusive",
            "top_confidence": round(top1_pct, 2),
            "margin": round(margin, 2),
            "entropy": round(entropy, 2),
            "error_title": "Inconclusive Diagnosis (Low Confidence)",
            "what_went_wrong": f"The neural network examined the leaf, but the highest predicted condition '{top1.get('class_name')}' only reached {top1_pct:.1f}% confidence (below the 38% clinical threshold). The symptoms are ambiguous and do not conclusively match a specific rice pathology.",
            "actionable_steps": [
                "Take a closer photo focusing specifically on the infected spots or lesions rather than the whole plant.",
                "Turn the leaf toward natural light so the lesion margin (yellow halo, gray center, or water-soaked border) is sharply visible.",
                "Inspect multiple infected leaves in the field to find one displaying fully developed, textbook symptoms.",
                "Compare the visual signs with the 17 conditions in the 'Disease Catalog' tab."
            ],
            "message": f"Inconclusive diagnosis: Model confidence ({top1_pct:.1f}%) is too low to confirm a specific rice disease."
        }

    # 2. Flag as ambiguous if close runner-up exists
    if top1_pct < 60.0 and margin < min_margin:
        return {
            "accepted": True,
            "status": "Ambiguous",
            "top_confidence": round(top1_pct, 2),
            "margin": round(margin, 2),
            "entropy": round(entropy, 2),
            "error_title": "Dual Pathology / Borderline Diagnosis",
            "what_went_wrong": f"Lesion symptoms closely resemble both '{top1.get('class_name')}' ({top1_pct:.1f}%) and '{top_predictions[1].get('class_name')}' ({top2_pct:.1f}%). Paddy co-infections and similar early-stage fungal lesions can produce overlapping patterns.",
            "actionable_steps": [
                "Inspect both disease profiles in the treatment card below.",
                "Check for specific microscopic markers (e.g. bacterial ooze in mornings for Bacterial Blight, vs spindle spots for Blast)."
            ],
            "message": f"Dual pathology alert: Lesion patterns exhibit visual similarities to both '{top1.get('class_name')}' ({top1_pct:.1f}%) and '{top_predictions[1].get('class_name')}' ({top2_pct:.1f}%)."
        }

    return {
        "accepted": True,
        "status": "High Confidence",
        "top_confidence": round(top1_pct, 2),
        "margin": round(margin, 2),
        "entropy": round(entropy, 2),
        "error_title": None,
        "what_went_wrong": None,
        "actionable_steps": [],
        "message": "Definitive diagnosis confirmed."
    }


def run_full_validation_pipeline(contents: bytes) -> Dict[str, Any]:
    """
    Executes Stages 1, 2, and 3 in sequence.
    Returns validation verdict, friendly error title, plain-English 'what went wrong',
    and specific numbered 'what user should do' steps.
    """
    # Stage 1: File integrity & format
    s1 = validate_file_integrity(contents)
    if not s1["valid"]:
        return {
            "valid": False,
            "stage_failed": "file_integrity",
            "error_title": s1["error_title"],
            "what_went_wrong": s1["what_went_wrong"],
            "actionable_steps": s1["actionable_steps"],
            "rejection_reason": s1["what_went_wrong"],
            "details": {}
        }

    image = s1["image"]

    # Stage 2: Quality & blurriness
    s2 = validate_image_quality(image)
    if not s2["valid"]:
        return {
            "valid": False,
            "stage_failed": "image_quality",
            "error_title": s2["error_title"],
            "what_went_wrong": s2["what_went_wrong"],
            "actionable_steps": s2["actionable_steps"],
            "rejection_reason": s2["what_went_wrong"],
            "details": s2.get("details", {})
        }

    # Stage 3: Botanical / foliage domain gate
    s3 = validate_botanical_foliage(image)
    if not s3["valid"]:
        return {
            "valid": False,
            "stage_failed": "botanical_domain",
            "error_title": s3["error_title"],
            "what_went_wrong": s3["what_went_wrong"],
            "actionable_steps": s3["actionable_steps"],
            "rejection_reason": s3["what_went_wrong"],
            "details": {**s2.get("details", {}), **s3.get("details", {})}
        }

    return {
        "valid": True,
        "stage_failed": None,
        "error_title": None,
        "what_went_wrong": None,
        "actionable_steps": [],
        "rejection_reason": None,
        "image": image,
        "details": {**s2.get("details", {}), **s3.get("details", {})}
    }
