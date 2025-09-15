@echo off
echo =========================================
echo   STRIPE LIVE PAYMENT SETUP
echo =========================================
echo.
echo This script will help you configure live Stripe payments
echo.
echo STEP 1: Set your Stripe Config Vars in Heroku
echo.
echo 1. Open your Heroku Dashboard
echo 2. Go to your app's Settings tab  
echo 3. Click "Reveal Config Vars"
echo 4. Add/Update these Config Vars:
echo.
echo    STRIPE_SECRET_KEY = sk_live_...GhaL
echo    VITE_STRIPE_PUBLISHABLE_KEY = pk_live_...
echo.
echo    (Replace with your actual live Stripe keys)
echo.
echo STEP 2: Deploy the updated code
echo.
echo git add .
echo git commit -m "Configure live Stripe checkout"
echo git push heroku main
echo.
echo STEP 3: Test the checkout
echo.
echo 1. Go to your live site: https://newagefotografie.com
echo 2. Navigate to Vouchers page
echo 3. Select a voucher and click "Personalisieren"
echo 4. Complete the flow and click "Weiter"
echo 5. You should now see live Stripe checkout (no demo message)
echo.
echo =========================================
echo   TROUBLESHOOTING
echo =========================================
echo.
echo If checkout still shows demo mode:
echo 1. Check Heroku logs: heroku logs --tail
echo 2. Verify Config Vars are set correctly
echo 3. Restart Heroku app: heroku restart
echo.
pause