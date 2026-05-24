#!/bin/bash
# Cloudflare Pages Build Script

# Define default values for local builds (fallback if env vars are not set)
API_KEY=${FIREBASE_API_KEY:-"AIzaSyClGkIgGOVLEdkoOhW0aBMUea5B-sfWLFg"}
AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN:-"yusukesakaicom.firebaseapp.com"}
PROJECT_ID=${FIREBASE_PROJECT_ID:-"yusukesakaicom"}
STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET:-"yusukesakaicom.firebasestorage.app"}
MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID:-"736874875244"}
APP_ID=${FIREBASE_APP_ID:-"1:736874875244:web:4e0b6cabed0802f5ce8b49"}
MEASUREMENT_ID=${FIREBASE_MEASUREMENT_ID:-"G-QT0ENEZMJ7"}

# Ensure configuration is written to the new TypeScript path
mkdir -p src/firebase
cat <<EOF > src/firebase/config.ts
export const firebaseConfig = {
    apiKey: "${API_KEY}",
    authDomain: "${AUTH_DOMAIN}",
    projectId: "${PROJECT_ID}",
    storageBucket: "${STORAGE_BUCKET}",
    messagingSenderId: "${MESSAGING_SENDER_ID}",
    appId: "${APP_ID}",
    measurementId: "${MEASUREMENT_ID}"
};
EOF

echo "Successfully generated src/firebase/config.ts"

# Build the Vite project
npm run build

# Inject data-cfasync="false" to prevent Cloudflare Rocket Loader from blocking module script execution
if [ -f dist/index.html ]; then
    sed -i 's/<script type="module"/<script type="module" data-cfasync="false"/g' dist/index.html
    echo "Successfully injected data-cfasync=\"false\" into dist/index.html"
fi
