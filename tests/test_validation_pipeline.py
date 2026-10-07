#!/usr/bin/env python3
"""
Automated Test Suite for Multi-Stage Image Validation and CV Gatekeeper
Project: AI-Based Crop Health Monitoring System
"""

import io
import os
import sys
from pathlib import Path
import unittest

from PIL import Image, ImageDraw
import numpy as np

# Add backend/src to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend" / "src"))

from utils.image_validator import (
    validate_file_integrity,
    validate_image_quality,
    validate_botanical_foliage,
    calibrate_prediction,
    run_full_validation_pipeline
)


class TestImageValidationPipeline(unittest.TestCase):

    def setUp(self):
        self.sample_leaf_path = ROOT_DIR / "cv-service" / "test_images" / "image.jpg"
        self.assertTrue(self.sample_leaf_path.exists(), "Sample test leaf image must exist")

    def test_01_valid_rice_leaf_passes_all_stages(self):
        """Genuine paddy leaf image must pass all validation stages."""
        leaf_bytes = self.sample_leaf_path.read_bytes()
        res = run_full_validation_pipeline(leaf_bytes)
        self.assertTrue(res["valid"], f"Valid leaf was incorrectly rejected: {res.get('rejection_reason')}")
        self.assertIsNone(res["stage_failed"])
        self.assertGreater(res["details"]["foliage_coverage_pct"], 15.0)
        print(f"\n[PASS] Test 1: Real leaf passed all stages with {res['details']['foliage_coverage_pct']}% foliage coverage.")

    def test_02_empty_or_corrupt_file_rejected(self):
        """Corrupt or non-image files must be rejected at Stage 1."""
        garbage_bytes = b"NOT_AN_IMAGE_RANDOM_DATA_HEADER" * 50
        res = run_full_validation_pipeline(garbage_bytes)
        self.assertFalse(res["valid"])
        self.assertEqual(res["stage_failed"], "file_integrity")
        print("\n[PASS] Test 2: Corrupted file properly rejected at Stage 1 (file_integrity).")

    def test_03_tiny_resolution_rejected(self):
        """Low-resolution images under 120x120 must be rejected."""
        img = Image.new("RGB", (64, 64), color=(34, 139, 34))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        res = run_full_validation_pipeline(buf.getvalue())
        self.assertFalse(res["valid"])
        self.assertEqual(res["stage_failed"], "file_integrity")
        print("\n[PASS] Test 3: Sub-dimension thumbnail properly rejected at Stage 1.")

    def test_04_non_plant_solid_colors_rejected(self):
        """Pure white, blue, or gray non-foliage images must be rejected at Stage 3."""
        # A. Solid white (document/blank)
        white_img = Image.new("RGB", (400, 400), color=(255, 255, 255))
        buf = io.BytesIO()
        white_img.save(buf, format="JPEG")
        res = run_full_validation_pipeline(buf.getvalue())
        self.assertFalse(res["valid"], "White image should not pass validation")

        # B. Solid blue (sky/water/vehicle - flat uniform color)
        blue_img = Image.new("RGB", (400, 400), color=(30, 100, 220))
        buf = io.BytesIO()
        blue_img.save(buf, format="JPEG")
        res = run_full_validation_pipeline(buf.getvalue())
        self.assertFalse(res["valid"], "Solid blue image should not pass validation")
        self.assertIn(res["stage_failed"], ("image_quality", "botanical_domain"))
        print(f"\n[PASS] Test 4: Non-plant solid images rejected at Stage {res['stage_failed']}.")

    def test_05_non_plant_synthetic_object_rejected(self):
        """Synthetic non-plant visual (e.g. geometric shape / metallic object) must be rejected."""
        # Gray background with a red circle (like a stop sign or product)
        obj_img = Image.new("RGB", (400, 400), color=(180, 180, 180))
        draw = ImageDraw.Draw(obj_img)
        draw.ellipse((100, 100, 300, 300), fill=(220, 20, 20))
        buf = io.BytesIO()
        obj_img.save(buf, format="JPEG")
        res = run_full_validation_pipeline(buf.getvalue())
        self.assertFalse(res["valid"])
        self.assertEqual(res["stage_failed"], "botanical_domain")
        print(f"\n[PASS] Test 5: Synthetic non-crop object rejected ({res['details'].get('foliage_coverage_pct', 0)}% foliage).")

    def test_06_confidence_calibration(self):
        """Low confidence or flat distributions must be flagged as inconclusive."""
        # Low confidence test
        low_conf = [
            {"rank": 1, "class_name": "Brown Spot", "probability": 0.22, "percentage": 22.0},
            {"rank": 2, "class_name": "Leaf Blast", "probability": 0.20, "percentage": 20.0},
        ]
        calib = calibrate_prediction(low_conf)
        self.assertFalse(calib["accepted"])
        self.assertEqual(calib["status"], "Inconclusive")

        # High confidence test
        high_conf = [
            {"rank": 1, "class_name": "Brown Spot", "probability": 0.9057, "percentage": 90.57},
            {"rank": 2, "class_name": "Healthy", "probability": 0.007, "percentage": 0.70},
        ]
        calib = calibrate_prediction(high_conf)
        self.assertTrue(calib["accepted"])
        self.assertEqual(calib["status"], "High Confidence")
        print("\n[PASS] Test 6: Confidence calibration successfully distinguishes conclusive vs inconclusive.")


if __name__ == "__main__":
    unittest.main()
