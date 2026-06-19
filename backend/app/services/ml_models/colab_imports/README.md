# Colab Model Imports

Place your exported stage model files from Colab in this folder.

Default loader looks for:
- stage_model.pkl

You can override by setting in backend/.env:
- COLAB_STAGE_MODEL_DIR
- COLAB_STAGE_MODEL_FILE

Expected model API (recommended):
- predict(X)
- optional predict_proba(X)
