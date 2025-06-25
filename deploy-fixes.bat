@echo off
echo 🚀 Synapse Production Deployment Fixes
echo =====================================

echo.
echo Step 1: Building frontend...
cd static\main-app
npm install react@18 react-dom@18
npm run build

echo.
echo Step 2: Returning to root directory...
cd ..\..

echo.
echo Step 3: Deploying to Forge...
forge deploy --environment production

echo.
echo Step 4: Checking deployment status...
forge status

echo.
echo ✅ Deployment complete! 
echo.
echo Next steps:
echo 1. Check browser console for errors
echo 2. Test meeting analysis functionality  
echo 3. Monitor with: forge logs --tail
echo.
pause
