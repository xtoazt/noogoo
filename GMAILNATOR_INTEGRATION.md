# Gmailnator API Integration Guide

## Overview

The Gmailnator API is now seamlessly integrated into the main interface. You can switch between WebVM and Gmailnator methods using the dropdown selector.

## How It Works

### Automatic Flow

When you select "Gmailnator API" method and click "Generate Account", the script automatically:

1. **Generates Email** - Creates a temporary Gmail address via Gmailnator API
2. **Sets Password** - Attempts to change password via the provided URL
3. **Verifies via Inbox** - Monitors inbox for password change verification emails
4. **Displays Results** - Shows email and password in JSON format

### Step-by-Step Process

1. Select "Gmailnator API (Quick & Simple)" from the dropdown
2. Enter your RapidAPI key (saved automatically in browser)
3. Enter the password you want to set
4. (Optional) Enter the password change URL
5. Select email type options
6. Click "Generate Account"

The script handles everything automatically!

## Password Change URL

The password change URL is optional. If provided, the script will:

- Replace `{email}` placeholder with the generated email
- Replace `{password}` placeholder with the password you want to set
- Attempt to POST to the URL with email and password

**Example URL format:**
```
https://your-service.com/api/change-password?email={email}&password={password}
```

Or:
```
https://your-service.com/api/change-password
```
(Will POST JSON with email and password)

**Note:** Due to CORS restrictions, direct URL access may fail. The script will automatically fall back to inbox verification.

## Inbox Verification

The script automatically monitors the inbox for:
- Emails containing "password" in subject or body
- Emails containing "reset" in subject or body  
- Emails containing "change" in subject or body

Verification checks:
- Every 6 seconds
- Up to 20 attempts (2 minutes total)
- Shows progress in terminal

## Output Format

The generated account is displayed in JSON format:

```json
{
  "email": "generated@email.com",
  "password": "YourSetPassword",
  "status": "verified",
  "method": "gmailnator_api",
  "passwordSet": true,
  "verificationFound": true,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "note": "Account generated and verified via inbox"
}
```

## Email Type Options

- **Public Domain** - Public temporary email
- **Public Plus(+) Gmail** - Gmail with plus addressing  
- **Public Dot(.) Gmail** - Gmail with dot addressing
- **Private Domain** - Private temporary email
- **Private Plus(+) Gmail** - Private Gmail with plus
- **Private Dot(.) Gmail** - Private Gmail with dot

You can select multiple options - the API will choose one.

## API Key Management

- API key is automatically saved in browser localStorage
- Only needs to be entered once
- Saved per browser/device
- Can be changed anytime

## Terminal Output

The terminal shows real-time progress:
- Step 1: Email generation status
- Step 2: Password change attempt
- Step 3: Inbox monitoring progress
- Step 4: Final results

## Troubleshooting

### "API Error" Messages
- Verify your RapidAPI key is correct
- Check that you have an active subscription
- Ensure internet connection is stable

### Password Change Fails
- This is normal due to CORS restrictions
- Script automatically uses inbox verification instead
- Check terminal for details

### No Verification Found
- Password change emails may take time
- Script checks for 2 minutes
- Check terminal for inbox status
- You can manually verify via inbox API

### Email Not Generated
- Verify at least one email option is selected
- Check API key is valid
- Ensure you have API quota remaining

## Comparison: Gmailnator vs WebVM

| Feature | Gmailnator API | WebVM |
|---------|---------------|-------|
| Speed | Instant | 5-10 minutes |
| Setup | Just API key | Full VM setup |
| Email Type | Temporary | Permanent |
| Password Setting | Via URL + Inbox | Full control |
| Inbox Access | ✅ Yes | ✅ Yes |
| Best For | Quick testing | Real accounts |

## Tips

1. **For Quick Testing**: Use Gmailnator API
2. **For Real Accounts**: Use WebVM method
3. **Password Change URL**: Only needed if you have a service that accepts password changes via API
4. **Inbox Monitoring**: Works automatically - just wait for verification
5. **Multiple Emails**: Generate multiple accounts by running the process multiple times

## Security Notes

⚠️ **Important**: 
- Gmailnator emails are temporary/disposable
- They may expire after some time
- Use only for testing purposes
- Do not use for important accounts
- Passwords set via URL depend on your service's security

## Next Steps

1. Get your RapidAPI key from [RapidAPI](https://rapidapi.com)
2. Subscribe to Gmailnator API
3. Enter your API key in the interface
4. Start generating accounts!

The integration is seamless - just select the method and generate!
