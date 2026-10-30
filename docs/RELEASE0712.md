# Explorer 0.7.12 / National Parks Explorer 0.12.1

This corrective release removes the oversized national and world map canvas that trapped the eastern United States outside the phone viewport, and supports drag and pinch gestures that begin on state shapes or markers. Tap selection remains available; a gesture does not open a state or marker accidentally. At the default zoom the full map fits the viewport; zoom in to pan across it. The national Michigan outline now uses the existing generalized public-domain 2025 Census geometry, including both peninsulas, instead of the incomplete national outline. Park coordinates and saved records are unchanged.

Automated tests cover Michigan's multipart outline, touch pointer pinch and drag beginning on state shapes, zoom, gesture click suppression and normal tap selection. Phone hardware, real touchscreen behavior and TalkBack still require physical-device verification.
