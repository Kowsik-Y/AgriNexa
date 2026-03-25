"""
AgriFlow - AI-Powered Smart Farming System

A single-input pipeline that takes 6 soil/weather parameters and generates
a complete farming plan covering all 8 stages:
  1. Land Preparation
  2. Crop Prediction & Seed Selection
  3. Irrigation Management
  4. Fertilizer Recommendation
  5. Pest & Disease Detection
  6. Crop Monitoring
  7. Harvest Prediction
  8. Storage & Marketing
"""

from .router import router as agri_flow_router
from .pipeline import run_pipeline

__all__ = ["agri_flow_router", "run_pipeline"]
