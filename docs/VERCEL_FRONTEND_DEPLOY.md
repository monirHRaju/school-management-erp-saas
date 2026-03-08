# Deploy Frontend to Vercel — Step-by-Step

Deploy the **Next.js frontend** of School Management ERP to Vercel so you can use it from anywhere. Your backend API URL is configured via an environment variable.

---

## Before You Start

- Your code is in a **Git** repo (GitHub, GitLab, or Bitbucket).  
  If not: in the project root run `git init`, add files, commit, then create a repo on GitHub and push.
- You know your **backend API URL** (e.g. `https://your-api.onrender.com` or `http://your-server-ip:5000`).  
  The frontend will call this URL for login, students, fees, etc.

---

## Step 1: Sign in to Vercel

1. Go to **[vercel.com](https://vercel.com)**.
2. Click **Sign Up** or **Log In**.
3. Choose **Continue with GitHub** (recommended) so Vercel can see your repos. Authorize Vercel when asked.

---

## Step 2: Import the Project

1. On the Vercel dashboard, click **Add New…** → **Project**.
2. You’ll see a list of your GitHub repositories.
3. Find **school-management-erp** (or whatever your repo is called).
4. Click **Import** next to it.

---

## Step 3: Set the Root Directory

Your repo has both `frontend` and `backend`. Vercel must build only the frontend.

1. On the import screen, find **Root Directory**.
2. Click **Edit** next to it.
3. Enter: **`frontend`**
4. Confirm. You should see the project path update to something like `school-management-erp/frontend`.

---

## Step 4: Add Environment Variable (API URL)

The app reads the API base URL from **NEXT_PUBLIC_API_URL**. You must set it to your real backend URL.

1. Expand **Environment Variables**.
2. **Name:**  
   `NEXT_PUBLIC_API_URL`
3. **Value:**  
   Your backend URL **with no trailing slash**, e.g.  
   - `https://school-management-erp-api.onrender.com`  
   - or `https://api.yourdomain.com`  
   - or `http://123.45.67.89:5000` (if you’re using a VPS).
4. Leave **Environment** as **Production** (or add the same variable for Preview if you want).
5. Click **Add** (or **Save**).

---

## Step 5: Deploy

1. Click **Deploy**.
2. Vercel will:
   - Clone the repo
   - Go into the `frontend` folder
   - Run `npm install` and `npm run build`
   - Deploy the built app
3. Wait 1–3 minutes. You’ll see a **Building…** then **Ready** state.

---

## Step 6: Open Your Site

1. When the deployment is **Ready**, click **Visit** (or the generated URL, e.g. `https://school-management-erp-xxx.vercel.app`).
2. You should see your app (login/register page).
3. Try logging in. If the backend is deployed and CORS allows your Vercel URL, login and the rest of the app will work.

---

## If Something Goes Wrong

**Build fails**

- Check the **Build Logs** on the deployment page.
- Typical issues: TypeScript errors, missing dependencies. Fix them locally (`npm run build` in the `frontend` folder), commit, push; Vercel will redeploy.

**“Cannot reach the API” / login doesn’t work**

- Confirm **NEXT_PUBLIC_API_URL** in Vercel matches your backend URL exactly (no trailing slash).
- Backend must allow your Vercel domain in CORS (e.g. set `FRONTEND_URL` on the backend to `https://your-app.vercel.app`).

**Changes not showing**

- Pushing to the connected branch (usually `main`) triggers a new deployment. Wait for it to finish and hard-refresh the site (Ctrl+F5).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Sign in to Vercel (e.g. with GitHub). |
| 2 | Add New → Project → Import your repo. |
| 3 | Root Directory → **`frontend`**. |
| 4 | Env var **NEXT_PUBLIC_API_URL** = your backend URL (no trailing slash). |
| 5 | Deploy and wait for “Ready”. |
| 6 | Visit the generated URL and test login. |

After this, every push to the connected branch will deploy the latest frontend automatically.
