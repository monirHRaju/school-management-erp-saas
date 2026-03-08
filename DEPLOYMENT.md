# Deployment Guide — School Management ERP

This guide walks you through hosting the app so you can test it in different environments. Uses **free tiers** where possible.

## Architecture

```
[Next.js Frontend]  →  [Express Backend]  →  [MongoDB]
     (Vercel)              (Render)          (Atlas)
```

---

## 1. MongoDB Atlas (Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign in or create an account.
2. Create a **free M0 cluster** (e.g. region closest to your backend).
3. **Database Access** → Add Database User (username + password). Note the password.
4. **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`) for now (you can restrict later).
5. **Database** → Connect → **Connect your application** → copy the connection string.  
   It looks like:  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Replace `PASSWORD` with your actual password (special chars URL-encoded).  
   Add a database name before `?`: e.g. `...mongodb.net/db_school_mgmt_erp?retryWrites=...`  
   Your **MONGODB_URI** = this full string.

---

## 2. Backend (Express API) — Render

1. Push your code to **GitHub** (if not already).
2. Go to [render.com](https://render.com) → Sign up / Log in.
3. **New +** → **Web Service**.
4. Connect your repo and select the **school-management-erp** project.
5. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid if you need always-on).
6. **Environment** (Environment Variables):
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = (your Atlas connection string from step 1)
   - `JWT_SECRET` = (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `JWT_EXPIRES_IN` = `7d`
   - `FRONTEND_URL` = leave empty for now; after frontend is deployed set it to your Vercel URL (e.g. `https://your-app.vercel.app`).
7. Create Web Service. Note the URL (e.g. `https://school-management-erp-api.onrender.com`).  
   This is your **backend API URL**.

---

## 3. Frontend (Next.js) — Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up / Log in (GitHub is easiest).
2. **Add New** → **Project** → Import your GitHub repo.
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (auto-detected).
   - **Build Command**: `npm run build` (default).
   - **Output Directory**: (default).
4. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = your **backend URL** from Render (e.g. `https://school-management-erp-api.onrender.com`).  
     No trailing slash.
5. Deploy. Note the frontend URL (e.g. `https://school-management-erp.vercel.app`).

---

## 4. Connect Frontend and Backend

1. **Render (backend)**  
   - Service → **Environment** → add or set:  
     `FRONTEND_URL` = your Vercel URL (e.g. `https://school-management-erp.vercel.app`).  
   - Save. Render will redeploy so CORS allows that origin.

2. **Vercel (frontend)**  
   - You already set `NEXT_PUBLIC_API_URL` to the Render URL.  
   - If you change the backend URL later, update this and redeploy.

---

## 5. Optional: Student Photo Uploads (Cloudinary)

The backend uses **Cloudinary** for student photos. For production:

1. [cloudinary.com](https://cloudinary.com) → create account → get **Cloud Name**, **API Key**, **API Secret**.
2. In **Render** → backend service → **Environment** add (if your backend expects them):
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. Restart/redeploy the backend.

If these are missing, photo upload may fail; the rest of the app will still run.

---

## 6. Quick Checklist

| Step | Where | What |
|------|--------|------|
| 1 | MongoDB Atlas | Create cluster, user, allow `0.0.0.0/0`, copy MONGODB_URI |
| 2 | Render | New Web Service from repo, root `backend`, set env vars, get backend URL |
| 3 | Vercel | New project from repo, root `frontend`, set `NEXT_PUBLIC_API_URL` = backend URL |
| 4 | Render | Set `FRONTEND_URL` = Vercel URL |
| 5 | (Optional) | Cloudinary env vars on Render |

---

## 7. Testing

- Open your Vercel URL. Login/register should hit the Render API and MongoDB.
- Create a school, add students, generate fees, collect payment — all should work across the hosted stack.
- **Free tier notes**:  
  - Render free services spin down after inactivity; first request may take 30–60 seconds.  
  - Atlas free tier has limits; Vercel free tier is usually enough for testing.

---

## 8. Alternative Hosting

- **Backend**: Railway, Fly.io, or a VPS (e.g. DigitalOcean) if you need always-on or more control.
- **Frontend**: Netlify also supports Next.js; set `NEXT_PUBLIC_API_URL` and backend `FRONTEND_URL` to the Netlify URL.

Keep **MONGODB_URI** and **JWT_SECRET** only on the backend; never put them in the frontend or in the repo.
