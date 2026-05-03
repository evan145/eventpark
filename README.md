# EventPark

Peer-to-peer event parking marketplace MVP.

## Live (public beta)

- Frontend: https://eventpark-main.vercel.app
- API: https://eventpark-od29.onrender.com
- Health check: https://eventpark-od29.onrender.com/health

Beta runs without payments (`VITE_PAYMENTS_ENABLED=false`). Free-tier API may
cold-start on first request after idle.

## Install

```bash
pip install -e .
pip install pytest pytest-asyncio
```

## Run tests

```bash
pytest tests/ -v
```

## Run dev server

```bash
uvicorn app.main:app --reload
```

# --- 
 From the project root /Users/evanj.blonien/PARKING PROJECT :                                                                                         
                                                                                           
  Backend (FastAPI, port 8000)                                                                                                                        
  uvicorn app.main:app --reload                                                                                                                        
                                                                                                                                                       
  Frontend (Vite, port 5173) — in a second terminal:                                                                                                   
  cd web                                                                                                                                               
  npm run dev
                                                                                                                                                       
  Then open http://localhost:5173 in your browser. The frontend talks to the backend at http://localhost:8000, so both need to be running.
                                                                                                                                                       
  ---
  Other useful commands:                                                                                                                               
                                                                  
  # Backend tests (146 tests)
  pytest tests/ -v                                                                                                                                     
   
  # Frontend component tests (48 tests)                                                                                                                
  cd web && npm run test:run                                      
                                                                                                                                                       
  # Frontend E2E tests (requires backend running)
  cd web && npm run test:e2e                                                                                                                           
                                                                  
  # Production build (frontend)                                                                                                                        
  cd web && npm run build && npm run preview