# Simple Gmail Generator Guide

## Quick Start

The simple version uses the Gmailnator API to generate temporary Gmail addresses instantly. This is perfect for:
- Quick testing
- Receiving verification emails
- Temporary email needs
- No complex setup required

## Getting Started

### Step 1: Get Your API Key

1. Visit [RapidAPI](https://rapidapi.com)
2. Sign up or log in
3. Search for "Gmailnator" in the API marketplace
4. Subscribe to the Gmailnator API
5. Copy your API key from the dashboard

### Step 2: Use the Simple Generator

1. Open `simple.html` in your browser
2. Paste your RapidAPI key in the API Configuration section
3. Select email type options (multiple options can be selected)
4. Click "Generate Email"
5. Your email address will be displayed instantly!

## Features

### Email Types

You can select from multiple email types:
- **Public Domain Mail** - Public temporary email
- **Public Plus(+) Gmail** - Gmail with plus addressing
- **Public Dot(.) Gmail** - Gmail with dot addressing
- **Private Domain Mail** - Private temporary email
- **Private Plus(+) Gmail** - Private Gmail with plus
- **Private Dot(.) Gmail** - Private Gmail with dot
- **Public Googlemail** - Googlemail variant
- **Private Googlemail** - Private Googlemail variant

### Inbox Management

- **View Messages**: See all emails sent to your generated address
- **Auto-Refresh**: Inbox refreshes automatically every 30 seconds
- **Manual Refresh**: Click "Refresh Inbox" button anytime
- **Message Preview**: See sender, subject, and preview of each message

## API Configuration

Your API key is saved in browser localStorage, so you only need to enter it once. The key is stored locally and never sent anywhere except to the RapidAPI service.

## Important Notes

⚠️ **Temporary Emails**: These are **disposable/temporary email addresses**. They:
- Cannot have passwords set or changed
- Are for receiving emails only
- May expire after some time
- Are not permanent Gmail accounts

✅ **Best For**:
- Receiving verification emails
- Testing sign-ups
- Temporary communication
- Avoiding spam

❌ **Not For**:
- Permanent email accounts
- Setting passwords
- Long-term use
- Important communications

## Troubleshooting

### "API Error" Messages
- Check that your API key is correct
- Ensure you have an active subscription to Gmailnator API
- Verify your internet connection

### "No messages yet"
- Wait a few moments - emails may take time to arrive
- Click "Refresh Inbox" manually
- Check that the sender has sent the email correctly

### Email Not Generating
- Verify your API key is valid
- Check that at least one email option is selected
- Ensure you have API quota remaining

## Comparison: Simple vs Full Version

| Feature | Simple Version | Full Version |
|---------|---------------|--------------|
| Setup Time | Instant | 5-10 minutes |
| Email Type | Temporary | Permanent |
| Password Setting | ❌ Not supported | ✅ Supported |
| Inbox Access | ✅ Yes | ✅ Yes |
| API Key Required | ✅ Yes | ❌ No |
| WebVM Required | ❌ No | ✅ Yes |
| Best For | Quick testing | Real accounts |

## API Rate Limits

Check your RapidAPI subscription plan for:
- Requests per minute
- Requests per month
- Available endpoints

Free tier may have limitations on:
- Number of emails generated
- Inbox refresh frequency
- API calls per day

## Support

For API issues:
- Check [RapidAPI Support](https://rapidapi.com/support)
- Review Gmailnator API documentation
- Contact your API provider

For application issues:
- Check browser console for errors
- Verify API key is correct
- Ensure JavaScript is enabled
