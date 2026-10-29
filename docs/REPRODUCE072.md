# Reproducing 0.7.2

Normal offline compilation uses Python's standard library only:

```sh
npm ci
python scripts/compile.py
python scripts/validate.py
python scripts/audit072.py
npm run check
npm test
python -m unittest discover -s scripts -p 'test_*.py'
```

To regenerate reviewed additions from retained source evidence, run `reviewed072.py`, then `curated072.py`, then `conflicts072.py`, before compilation. No network is used by those steps. Do not refresh media during a reproducibility comparison: acquisition deliberately records actual retrieval timestamps.

Optional acquisition uses `beautifulsoup4==4.15.0` and `Pillow==12.3.0`: `acquire072.py` for the explicit guide list, `acquire072.py --review` for previously unverified legacy URLs, `follow072.py` for selected official links, and `media072.py` for individual rights-checked photographs. Review new evidence before creating publication inputs. Known legacy 404s are not repeatedly requested. Failed acquisitions are retained in the evidence and never promoted as fabricated content.

`compile.py` validates all 0.7.1 identities, structured units and media provenance before publishing a complete generated directory. `validate.py` checks lossless reconstruction of the core catalog and 16 detail shards. The entire `src/data` directory is deterministic for unchanged retained evidence. Explorer must update its exact commit archive pin and npm integrity after the public revision is verified.
