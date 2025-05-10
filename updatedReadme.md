# Project Update Notes

## 📦 Dependency Updates

### `package.json`
- **SQLite3 Version Updated**
  - **Before:** `sqlite3@4.0.1`
  - **After:** `sqlite3@5.1.7`

This update ensures compatibility with newer Node.js versions and brings performance and stability improvements.

---

## 🐳 Dockerfile Updates

### Base Image Changed
- **Before:** `alpine:latest`
- **After:** `node:13-alpine3.11`

Using the official Node base image improves compatibility and reduces manual setup.

### Package Installation Updates
- **Previous Packages Installed:**
  ```Dockerfile
  **Before:** `apk add --no-cache nodejs npm`
**After:** `apk add --no-cache python2 make`
because npm is already installed in base image `node:13-alpine3.11`
