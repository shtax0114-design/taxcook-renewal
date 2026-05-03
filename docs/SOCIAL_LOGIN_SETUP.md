# TaxCook Social Login Setup

The front-end buttons call Supabase Auth through `signInWithOAuth`.

## Provider IDs

- Kakao: `kakao`
- Google/Gmail: `google`
- Naver: `custom:naver`

Kakao and Google are built-in Supabase providers. Naver is not listed as a built-in Supabase provider, so configure it as a Custom OAuth/OIDC provider with the identifier `custom:naver`.

## Supabase Redirect URLs

Add these URLs to Supabase Auth redirect allow list:

- `https://taxcook.co.kr/mypage.html`
- `http://localhost:5000/mypage.html`
- `http://127.0.0.1:5000/mypage.html`

Use the Supabase callback URL in each provider console:

```text
https://accqmlwigtelgwolpzws.supabase.co/auth/v1/callback
```

## Kakao

In Kakao Developers:

- Enable Kakao Login.
- Add the Supabase callback URL as a redirect URI.
- Use the REST API key as the Supabase client ID.
- Use the Kakao Login client secret as the Supabase client secret.
- Enable email/profile consent items as needed.

## Google/Gmail

In Google Cloud OAuth credentials:

- Application type: Web application.
- Add the Supabase callback URL under Authorized redirect URIs.
- Copy the client ID and client secret into Supabase Google provider settings.

## Naver

In Naver Developers:

- Register a web application for Naver Login.
- Add the Supabase callback URL as the callback URL.
- Copy the client ID and client secret.

In Supabase Custom OAuth Providers:

- Identifier: `custom:naver`
- Type: OAuth2 or OIDC depending on the Naver app configuration.
- Authorization URL: `https://nid.naver.com/oauth2.0/authorize`
- Token URL: `https://nid.naver.com/oauth2.0/token`
- UserInfo URL: `https://openapi.naver.com/v1/nid/me`
- Email optional: enable if your Naver consent setup may not return email.
