# 🚀 Deployment Guide: Vercel (Frontend) & Render (Backend + Workers)

This guide provides step-by-step instructions on deploying the OTT platform. The architecture splits the system into:
- **Frontend (Client)** hosted on **Vercel**
- **Backend (API Server)**, **Redis Cache**, and **Transcode Workers** hosted on **Render**

---

## 🏛 Architecture & Cross-Origin Auth
Since the frontend and backend are hosted on separate domains:
1. **API Requests**: All client-side fetch requests are sent directly to the Render backend using the custom wrapper in [client.js](file:///e:/OTT%20platform/client/src/api/client.js).
2. **Cookies & Session Management**: Auth cookies are configured with `SameSite=None` and `Secure=true` in production to allow secure, cross-site session management. Both frontend and backend **must** be served over HTTPS.
3. **Asset Normalization**: The frontend automatically prefixes media assets (`/uploads/*` and `/vod/*`) with the backend API URL.

---

## 💻 Frontend Deployment (Vercel)

### Step 1: Connect Codebase to Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** > **Project** and import your Git repository.
3. In the project settings, set:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 2: Environment Variables
Configure the following environment variables in Vercel under **Project Settings > Environment Variables**:

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Your Render Backend Service URL | `https://ott-api.onrender.com` |
| `VITE_FIREBASE_API_KEY` | Firebase API Key for SSO auth | `AIzaSyA1...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authorization domain | `ott-auth.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project identifier | `ott-auth` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket address | `ott-auth.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase cloud messaging ID | `1234567890` |
| `VITE_FIREBASE_APP_ID` | Firebase application identifier | `1:1234:web:abcd` |

### Step 3: Deploy
Click **Deploy**. Vercel will build the frontend, and the [vercel.json](file:///e:/OTT%20platform/client/vercel.json) configuration will handle single-page application fallback routing automatically.

---

## ⚙️ Backend & Infrastructure Deployment (Render)

You can deploy the backend using the Render **Blueprint** (recommended, configuration pre-defined in [render.yaml](file:///e:/OTT%20platform/render.yaml)) or manually.

### Option A: Blueprint Deployment (Recommended)
1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **New** > **Blueprint**.
3. Connect your repository. Render will automatically read the [render.yaml](file:///e:/OTT%20platform/render.yaml) file and provision:
    - **ott-redis**: Managed Key Value (Redis-compatible) cache instance for BullMQ jobs.
    - **ott-api**: Express API Gateway service.
    - **ott-transcoder**: Background BullMQ transcoding worker.
4. Input the required environment variables prompted by the dashboard (e.g., `MONGODB_URI`, `CLIENT_URL`, `CORS_ORIGINS`, `API_URL`).
5. Click **Apply**.

---

### Option B: Manual Setup

If you prefer to configure each service manually:

#### 1. Provision Key Value Cache
1. Click **New** > **Key Value** on Render.
2. Name it `ott-redis`, choose a plan (Free works for dev/staging), and create it.
3. Save the **Connection String** (Internal Redis URL).

#### 2. Deploy Web Service (Express API Server)
1. Click **New** > **Web Service**.
2. Connect your Git repository.
3. Configure:
   - **Name**: `ott-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm install --prefix server`
   - **Start Command**: `npm run start --prefix server` (or root script `npm run start`)
4. In **Advanced Settings**, add these Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGODB_URI`: *Your MongoDB connection string (e.g., MongoDB Atlas)*
   - `REDIS_URL`: *Internal Redis connection URL from Step 1*
   - `JWT_SECRET`: *Generate a strong secret key (minimum 32 characters)*
   - `WORKER_SECRET`: *Generate a secure secret key for worker authorization*
   - `CLIENT_URL`: *Your Vercel URL* (e.g., `https://ott-platform.vercel.app`)
   - `CORS_ORIGINS`: *Your Vercel URL* (e.g., `https://ott-platform.vercel.app`)
   - `API_URL`: *Your Render backend URL* (e.g., `https://ott-api.onrender.com`)
   - Firebase Admin SDK variables:
     - `FIREBASE_PROJECT_ID`: *Firebase Project ID*
     - `FIREBASE_CLIENT_EMAIL`: *Firebase Admin Service Account Email*
     - `FIREBASE_PRIVATE_KEY`: *Firebase Private Key (surrounded by quotes, with newline characters `\n` preserved)*

#### 3. Deploy Background Worker (FFmpeg Transcoder)
> [!NOTE]
> Render background workers do not have a free tier. Select a paid plan (such as **Starter**) during manual creation.

1. Click **New** > **Background Worker**.
2. Connect your Git repository.
3. Configure:
   - **Name**: `ott-transcoder`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node workers/transcode/index.js`
4. Add the following Environment Variables:
   - `NODE_ENV`: `production`
   - `REDIS_URL`: *Internal Key Value connection URL from Step 1*
   - `API_URL`: *Internal/External Express API Web Service URL* (e.g., `http://ott-api:10000` or `https://ott-api.onrender.com`)
   - `WORKER_SECRET`: *Must match the `WORKER_SECRET` set on the Express API server*

---

## 📦 Static Storage (VOD & Thumbnails)
By default, the application saves uploaded posters and transcoded HLS streams directly to local disk paths (`/uploads` and `/vod`).
> [!IMPORTANT]
> Render's local filesystem is ephemeral (resets on redeploys). For a production setup, configure external storage (AWS S3 or MinIO):
> 1. Set up an AWS S3 Bucket or MinIO container.
> 2. Define the following backend environment variables:
>    - `S3_ENDPOINT` (e.g., `https://s3.amazonaws.com`)
>    - `S3_BUCKET` (e.g., `ott-media`)
>    - `CDN_BASE_URL` (e.g., `https://your-bucket-name.s3.amazonaws.com` or CDN URL)
